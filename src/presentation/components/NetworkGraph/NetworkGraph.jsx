import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { NodeIcon } from './NodeIcon';

const PHYSICS = {
  repulsion: 8500,
  springLength: 190,
  springConstant: 0.015,
  damping: 0.09,
  centralGravity: 0.02,
  avoidOverlapPadding: 38,
  maxSpeed: 18
};

const CANVAS_MIN = -5000;
const CANVAS_MAX = 5000;
const CANVAS_WIDTH = CANVAS_MAX - CANVAS_MIN;  // 10000
const CANVAS_HEIGHT = CANVAS_MAX - CANVAS_MIN; // 10000

const WORLD_CENTER_X = (CANVAS_MIN + CANVAS_MAX) / 2; // 0
const WORLD_CENTER_Y = (CANVAS_MIN + CANVAS_MAX) / 2; // 0

const INITIAL_VIEW_W = 900;
const INITIAL_VIEW_H = 640;

const getLayerY = (categoryId) => {
  switch (categoryId) {
    case 'proyecto': return -220;
    case 'red': return -140;
    case 'endpoint':
    case 'hardware': return -40;
    case 'container': return 10;
    case 'instalacion': return 60;
    case 'software': return 160;
    case 'hallazgo': return 240;
    case 'vulnerabilidad':
    case 'remediacion': return 300;
    default: return 0;
  }
};

const getNodeColor = (categoryId) => {
  switch (categoryId) {
    case 'proyecto': return '#4D3BFF';
    case 'red': return '#7973FF';
    case 'endpoint': return '#FFFFFF';
    case 'hardware': return '#A5A5FF';
    case 'instalacion': return '#3813FF';
    case 'software': return '#CDCFFF';
    case 'hallazgo': return '#ef4444';
    case 'vulnerabilidad': return '#ef4444';
    case 'remediacion': return '#2701D6';
    case 'parche': return '#2103A9';
    case 'container': return '#0db7ed';
    default: return '#A5A5FF';
  }
};

const getNodeRadius = (categoryId) => {
  switch (categoryId) {
    case 'proyecto': return 32;
    case 'proyecto': return 32;
    case 'endpoint': return 26;
    case 'container': return 22;
    default: return 20;
  }
};

const getTierColor = (tier) => {
  switch ((tier || '').toUpperCase()) {
    case 'CRITICAL': return '#74050e';
    case 'HIGH': return '#eb250f';
    case 'MEDIUM': return '#ea6a08';
    case 'LOW': return '#e7ee17';
    default: return null;
  }
};

const isDecommissionedEndpoint = (node) => {
  if (!node) return false;
  const isEp = node.primaryLabel === 'Endpoint' || (node.labels || []).includes('Endpoint') || node.categoryId === 'endpoint';
  if (!isEp) return false;
  const estado = (node.properties?.estado || node.properties?.status || '').toString().toLowerCase().trim();
  return estado === 'decommissioned';
};

export function NetworkGraph({
  graphData,
  filterType,
  searchQuery,
  loading,
  error,
  selectedNode,
  setSelectedNode,
  fetchInfrastructure,
  fetchTopAPTs,
  selectedExploitationPath,
  clearSelectedExploitationPath
}) {
  const [layoutMode, setLayoutMode] = useState('layered'); // 'layered', 'tree', 'stix'
  const [layoutNodes, setLayoutNodes] = useState([]);
  const nodesRef = useRef([]);
  const draggedNodeIdRef = useRef(null);
  const svgRef = useRef(null);
  const animationFrameRef = useRef(null);

  const [svgEl, setSvgEl] = useState(null);
  const svgCallbackRef = useCallback((node) => {
    svgRef.current = node;
    setSvgEl(node);
  }, []);

  // Reloj
  const [timeStr, setTimeStr] = useState('--:--:--');
  const [dateStr, setDateStr] = useState('-----');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('es-ES'));
      setDateStr(now.toLocaleDateString('es-ES', {
        weekday: 'short',
        day: '2-digit',
        month: 'short'
      }).toUpperCase());
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const [viewBox, setViewBox] = useState({
    x: -INITIAL_VIEW_W / 2,
    y: -INITIAL_VIEW_H / 2,
    w: INITIAL_VIEW_W,
    h: INITIAL_VIEW_H
  });
  const viewBoxRef = useRef(viewBox);
  const panStateRef = useRef(null);
  const panFrameRef = useRef(null);

  useEffect(() => {
    viewBoxRef.current = viewBox;
  }, [viewBox]);

  useEffect(() => {
    if (nodesRef.current) {
      nodesRef.current.forEach(node => {
        node.pinned = false;
      });
    }
  }, [layoutMode]);

  useEffect(() => {
    if (!graphData.nodes || graphData.nodes.length === 0) {
      nodesRef.current = [];
      setLayoutNodes([]);
      return;
    }

    // 1. Encontrar los IDs de endpoints decomisados
    const decomEndpointNodes = graphData.nodes.filter(n => isDecommissionedEndpoint(n));
    const decomEndpointIds = new Set(decomEndpointNodes.map(n => String(n.id)));

    // 2. Mapa de adyacencia para rastrear el subárbol por debajo de cada decomisado
    const rels = graphData.relationships || [];
    const nodeMap = new Map(graphData.nodes.map(n => [String(n.id), n]));
    const adj = new Map();

    graphData.nodes.forEach(n => adj.set(String(n.id), []));
    rels.forEach(rel => {
      const s = String(rel.source);
      const t = String(rel.target);
      if (adj.has(s) && adj.has(t)) {
        adj.get(s).push(t);
        adj.get(t).push(s);
      }
    });

    // 3. BFS para identificar los nodos descendientes que deben ser ocultados (excluyendo Redes y Proyectos)
    const hiddenSubtreeNodeIds = new Set();
    const queue = [...decomEndpointIds];
    const visited = new Set(decomEndpointIds);

    while (queue.length > 0) {
      const currId = queue.shift();
      const neighbors = adj.get(currId) || [];

      for (const nbrId of neighbors) {
        if (!visited.has(nbrId)) {
          const nbrNode = nodeMap.get(nbrId);
          if (nbrNode) {
            const label = nbrNode.primaryLabel || nbrNode.labels?.[0] || '';
            const labels = nbrNode.labels || [];
            const isNet = label === 'Network' || labels.includes('Network');
            const isProj = label === 'Project' || labels.includes('Project');
            const isOtherEp = label === 'Endpoint' || labels.includes('Endpoint');

            // No ocultamos Redes, Proyectos ni otros Endpoints
            if (!isNet && !isProj && !isOtherEp) {
              visited.add(nbrId);
              hiddenSubtreeNodeIds.add(nbrId);
              queue.push(nbrId);
            }
          }
        }
      }
    }

    // 4. Filtrar nodos visibles.
    // Ocultamos TTP y ThreatActor siempre.
    // Las Vulnerability normales se ocultan, pero mantenemos visibles las de ContainerImage.
    const visibleNodes = graphData.nodes.filter(n => {
      const idStr = String(n.id);

      if (
        n.labels.includes('TTP') ||
        n.labels.includes('ThreatActor')
      ) {
        return false;
      }

      if (n.labels.includes('Vulnerability')) {
        const isFromContainerImage = rels.some(r =>
          r.type === 'HAS_VULNERABILITY' &&
          (r.source === n.id || r.target === n.id)
        );

        if (!isFromContainerImage) {
          return false;
        }
      }

      // Ocultamos los nodos descendientes del subárbol
      if (hiddenSubtreeNodeIds.has(idStr)) {
        return false;
      }

      return true;
    });


    const depths = {};
    visibleNodes.forEach(n => {
      depths[n.id] = 999;
    });

    const rootNode = visibleNodes.find(n => n.primaryLabel === 'Project' || n.categoryId === 'proyecto');
    if (rootNode) {
      const bfsAdj = {};
      visibleNodes.forEach(n => { bfsAdj[n.id] = []; });
      rels.forEach(rel => {
        if (bfsAdj[rel.source] && bfsAdj[rel.target]) {
          bfsAdj[rel.source].push(rel.target);
          bfsAdj[rel.target].push(rel.source);
        }
      });

      const q = [rootNode.id];
      depths[rootNode.id] = 0;
      let head = 0;
      while (head < q.length) {
        const currId = q[head++];
        const currDepth = depths[currId];
        const neighbors = bfsAdj[currId] || [];
        for (const nbrId of neighbors) {
          if (depths[nbrId] === 999) {
            depths[nbrId] = currDepth + 1;
            q.push(nbrId);
          }
        }
      }
    }

    visibleNodes.forEach(n => {
      if (depths[n.id] === 999) {
        switch (n.categoryId) {
          case 'proyecto': depths[n.id] = 0; break;
          case 'red': depths[n.id] = 1; break;
          case 'endpoint':
          case 'hardware': depths[n.id] = 2; break;
          case 'instalacion': depths[n.id] = 3; break;
          case 'software': depths[n.id] = 4; break;
          case 'hallazgo': depths[n.id] = 5; break;
          case 'vulnerabilidad':
          case 'remediacion': depths[n.id] = 6; break;
          default: depths[n.id] = 3;
        }
      }
    });

    const initial = visibleNodes.map((n, i) => {
      const angle = (i / visibleNodes.length) * 2 * Math.PI;
      const initialX = Math.cos(angle) * 200;
      const isDecom = isDecommissionedEndpoint(n);

      return {
        id: n.id,
        entity: n,
        x: initialX,
        y: getLayerY(n.categoryId),
        vx: 0,
        vy: 0,
        fx: 0,
        fy: 0,
        r: getNodeRadius(n.categoryId),
        color: isDecom ? '#6b7280' : getNodeColor(n.categoryId),
        isDecom: isDecom,
        pinned: false,
        depth: depths[n.id]
      };
    });

    nodesRef.current = initial;
    setLayoutNodes(initial);
  }, [graphData]);

  useEffect(() => {
    const tick = () => {
      const nodes = nodesRef.current;

      if (nodes.length > 0) {
        for (let i = 0; i < nodes.length; i++) {
          const a = nodes[i];
          let fx = 0;
          let fy = 0;

          for (let j = 0; j < nodes.length; j++) {
            if (i === j) continue;
            const b = nodes[j];
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
            const minDist = a.r + b.r + PHYSICS.avoidOverlapPadding;

            if (dist < minDist * 4) {
              const force = PHYSICS.repulsion / (dist * dist);
              fx += (dx / dist) * force;
              fy += (dy / dist) * force;
            }

            if (dist < minDist) {
              const overlap = minDist - dist;
              fx += (dx / dist) * overlap * 0.6;
              fy += (dy / dist) * overlap * 0.6;
            }
          }

          a.fx = fx;
          a.fy = fy;
        }

        graphData.relationships.forEach(rel => {
          if (rel.type === 'CONTAINS_NETWORK') return;

          const source = nodes.find(n => n.id === rel.source);
          const target = nodes.find(n => n.id === rel.target);
          if (!source || !target) return;

          const isProjectToNetwork =
            (source.entity.primaryLabel === 'Project' && target.entity.primaryLabel === 'Network') ||
            (target.entity.primaryLabel === 'Project' && source.entity.primaryLabel === 'Network');
          if (isProjectToNetwork) return;

          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
          const displacement = dist - PHYSICS.springLength;
          const force = displacement * PHYSICS.springConstant;
          const sfx = (dx / dist) * force;
          const sfy = (dy / dist) * force;
          source.fx += sfx;
          source.fy += sfy;
          target.fx -= sfx;
          target.fy -= sfy;
        });

        nodes.forEach(node => {
          if (node.id === draggedNodeIdRef.current || node.pinned) {
            node.vx = 0;
            node.vy = 0;
            return;
          }

          if (layoutMode === 'stix') {
            const isRoot = node.entity.primaryLabel === 'Project' || node.entity.categoryId === 'proyecto';
            if (isRoot) {
              node.fx += (WORLD_CENTER_X - node.x) * 0.15;
              node.fy += (WORLD_CENTER_Y - node.y) * 0.15;
            } else {
              node.fx += (WORLD_CENTER_X - node.x) * 0.005;
              node.fy += (WORLD_CENTER_Y - node.y) * 0.005;
            }
          } else if (layoutMode === 'tree') {
            const isRoot = node.entity.primaryLabel === 'Project' || node.entity.categoryId === 'proyecto';
            if (isRoot) {
              node.fx += (WORLD_CENTER_X - node.x) * 0.2;
            }
            const targetY = -300 + (node.depth || 0) * 185;
            node.fy += (targetY - node.y) * PHYSICS.centralGravity;
          } else {
            node.fy += (getLayerY(node.entity.categoryId) - node.y) * PHYSICS.centralGravity;
          }

          node.vx = (node.vx + node.fx) * (1 - PHYSICS.damping);
          node.vy = (node.vy + node.fy) * (1 - PHYSICS.damping);

          const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
          if (speed > PHYSICS.maxSpeed) {
            node.vx = (node.vx / speed) * PHYSICS.maxSpeed;
            node.vy = (node.vy / speed) * PHYSICS.maxSpeed;
          }

          node.x += node.vx;
          node.y += node.vy;

          node.x = Math.max(CANVAS_MIN + 40, Math.min(CANVAS_MAX - 40, node.x));
          node.y = Math.max(CANVAS_MIN + 40, Math.min(CANVAS_MAX - 40, node.y));
        });

        setLayoutNodes([...nodes]);
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [graphData, layoutMode]);

  const screenToSvgPoint = (clientX, clientY) => {
    const svgElNode = svgRef.current;
    if (!svgElNode) return { x: 0, y: 0 };
    const pt = svgElNode.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    return pt.matrixTransform(svgElNode.getScreenCTM().inverse());
  };

  useEffect(() => {
    if (!svgEl) return;

    const wheelHandler = (e) => {
      e.preventDefault();
      const svgP = screenToSvgPoint(e.clientX, e.clientY);
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;

      setViewBox(vb => {
        const newW = Math.max(150, Math.min(CANVAS_WIDTH, vb.w * zoomFactor));
        const newH = Math.max(110, Math.min(CANVAS_HEIGHT, vb.h * zoomFactor));
        const ratioX = (svgP.x - vb.x) / vb.w;
        const ratioY = (svgP.y - vb.y) / vb.h;
        return {
          x: svgP.x - ratioX * newW,
          y: svgP.y - ratioY * newH,
          w: newW,
          h: newH
        };
      });
    };

    svgEl.addEventListener('wheel', wheelHandler, { passive: false });
    return () => svgEl.removeEventListener('wheel', wheelHandler);
  }, [svgEl]);

  const handleNodeMouseDown = (e, nodeId) => {
    e.preventDefault();
    e.stopPropagation();
    draggedNodeIdRef.current = nodeId;
    let hasMoved = false;

    const onMouseMove = (moveEvent) => {
      const svgP = screenToSvgPoint(moveEvent.clientX, moveEvent.clientY);
      hasMoved = true;
      const node = nodesRef.current.find(n => n.id === nodeId);
      if (node) {
        node.x = Math.max(CANVAS_MIN + 40, Math.min(CANVAS_MAX - 40, svgP.x));
        node.y = Math.max(CANVAS_MIN + 40, Math.min(CANVAS_MAX - 40, svgP.y));
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      draggedNodeIdRef.current = null;

      const node = nodesRef.current.find(n => n.id === nodeId);

      if (!hasMoved) {
        if (node) {
          setSelectedNode(node.entity);
        }
      } else if (node) {
        node.pinned = true;
        node.vx = 0;
        node.vy = 0;
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleNodeDoubleClick = (e, nodeId) => {
    e.preventDefault();
    e.stopPropagation();
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (node) {
      node.pinned = false;
    }
  };

  const handleBackgroundMouseDown = (e) => {
    panStateRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      originX: viewBoxRef.current.x,
      originY: viewBoxRef.current.y,
      latestClientX: e.clientX,
      latestClientY: e.clientY
    };

    const applyPan = () => {
      if (!panStateRef.current || !svgRef.current) {
        panFrameRef.current = null;
        return;
      }

      const { startClientX, startClientY, originX, originY, latestClientX, latestClientY } = panStateRef.current;
      const scale = viewBoxRef.current.w / svgRef.current.clientWidth;
      const dx = (latestClientX - startClientX) * scale;
      const dy = (latestClientY - startClientY) * scale;

      setViewBox(vb => ({
        ...vb,
        x: originX - dx,
        y: originY - dy
      }));

      panFrameRef.current = null;
    };

    const onMouseMove = (moveEvent) => {
      if (!panStateRef.current) return;
      panStateRef.current.latestClientX = moveEvent.clientX;
      panStateRef.current.latestClientY = moveEvent.clientY;

      if (panFrameRef.current === null) {
        panFrameRef.current = requestAnimationFrame(applyPan);
      }
    };

    const onMouseUp = () => {
      panStateRef.current = null;
      if (panFrameRef.current !== null) {
        cancelAnimationFrame(panFrameRef.current);
        panFrameRef.current = null;
      }
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const getEdgePath = (sourceId, targetId) => {
    const sourceNode = layoutNodes.find(n => n.id === sourceId);
    const targetNode = layoutNodes.find(n => n.id === targetId);
    if (!sourceNode || !targetNode) return '';

    const mx = (sourceNode.x + targetNode.x) / 2;
    const my = (sourceNode.y + targetNode.y) / 2 - 20;
    return `M${sourceNode.x},${sourceNode.y} Q${mx},${my} ${targetNode.x},${targetNode.y}`;
  };

  const { pathEdgeIdSet, pathConnectorNodeIdSet, pathNodeStepMap } = useMemo(() => {
    const edgeIdSet = new Set();
    const connectorNodeIdSet = new Set();
    const nodeStepMap = new Map();

    if (!selectedExploitationPath || !graphData?.nodes) {
      return { pathEdgeIdSet: edgeIdSet, pathConnectorNodeIdSet: connectorNodeIdSet, pathNodeStepMap: nodeStepMap };
    }

    const findNodeForHostOrId = (hostName, endpointId) => {
      const hLower = (hostName || '').toLowerCase();
      const idStr = String(endpointId || '');

      return graphData.nodes.find(n => {
        const nHost = (n.properties?.hostname || n.name || '').toLowerCase();
        const nIdStr = String(n.id);
        const nPropIdStr = String(n.properties?.id || '');

        return (hLower && nHost === hLower) || (idStr && (nIdStr === idStr || nPropIdStr === idStr));
      });
    };

  const getStepFindingRefs = (step) => {
    const refs = [];

    if (step.finding_id) {
      refs.push({
        id: step.finding_id,
        cve_id: step.vulnerability || step.cve_id || '',
        title: step.vulnerability || ''
      });
    }

    if (Array.isArray(step.finding_ids)) {
      step.finding_ids.forEach(id => {
        refs.push({
          id,
          cve_id: '',
          title: ''
        });
      });
    }

    if (Array.isArray(step.findings)) {
      step.findings.forEach(f => {
        refs.push({
          id: f.id || f.finding_id || f.properties?.id,
          cve_id: f.cve_id || f.properties?.cve_id || '',
          title: f.title || f.properties?.title || f.cve_id || ''
        });
      });
    }

    const seen = new Set();
    return refs.filter(ref => {
      const key = String(ref.id || ref.cve_id || ref.title || '');
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };


  const findFindingNode = (findingRef) => {
    const findingID = findingRef?.id;
    const cveID = findingRef?.cve_id;

    return graphData.nodes.find(n => {
      const labels = n.labels || [];
      const isFinding = n.primaryLabel === 'Finding' || labels.includes('Finding');
      const isVulnerability = n.primaryLabel === 'Vulnerability' || labels.includes('Vulnerability');

      if (findingID && (
        String(n.id) === String(findingID) ||
        String(n.properties?.id) === String(findingID)
      )) {
        return true;
      }

      if (
        Array.isArray(n.properties?.findings) &&
        n.properties.findings.some(f =>
          String(f.id) === String(findingID) ||
          String(f.finding_id) === String(findingID) ||
          String(f.properties?.id) === String(findingID) ||
          String(f.cve_id) === String(cveID) ||
          String(f.properties?.cve_id) === String(cveID)
        )
      ) {
        return true;
      }

      if (cveID && isFinding && (
        n.properties?.cve_id === cveID ||
        Array.isArray(n.properties?.cves) && n.properties.cves.includes(cveID)
      )) {
        return true;
      }

      if (cveID && isVulnerability && n.properties?.cve_id === cveID) {
        return true;
      }

      return false;
    });
  };

    const orderedPathNodes = [];

    const entryNode = findNodeForHostOrId(selectedExploitationPath.initialEndpoint, null) ||
      (selectedExploitationPath.steps?.[0] && findNodeForHostOrId(selectedExploitationPath.steps[0].sourceEndpoint, null));

    if (entryNode) {
      orderedPathNodes.push(entryNode);
      nodeStepMap.set(String(entryNode.id), 1);
    }

    (selectedExploitationPath.steps || []).forEach((step) => {
      const tId = step.is_container ? step.container_id : step.targetEndpointId;
      const tName = step.is_container ? step.container_name : step.targetEndpoint;
      const stepNode = findNodeForHostOrId(tName, tId);
      if (stepNode) {
        if (!orderedPathNodes.some(n => String(n.id) === String(stepNode.id))) {
          orderedPathNodes.push(stepNode);
        }
        nodeStepMap.set(String(stepNode.id), orderedPathNodes.length);
      }
    });

    const rels = graphData.relationships || [];
    const adjMap = new Map();
    rels.forEach(rel => {
      const s = String(rel.source);
      const t = String(rel.target);
      if (!adjMap.has(s)) adjMap.set(s, []);
      if (!adjMap.has(t)) adjMap.set(t, []);
      adjMap.get(s).push({ neighborId: t, relId: rel.id });
      adjMap.get(t).push({ neighborId: s, relId: rel.id });
    });

    for (let i = 0; i < orderedPathNodes.length - 1; i++) {
      const srcId = String(orderedPathNodes[i].id);
      const tgtId = String(orderedPathNodes[i + 1].id);

      const directEdge = rels.find(r =>
        (String(r.source) === srcId && String(r.target) === tgtId) ||
        (String(r.source) === tgtId && String(r.target) === srcId)
      );

      if (directEdge) {
        edgeIdSet.add(directEdge.id);
        continue;
      }

      const srcNeighbors = adjMap.get(srcId) || [];
      const tgtNeighbors = adjMap.get(tgtId) || [];
      const tgtNeighborSet = new Map(tgtNeighbors.map(item => [item.neighborId, item.relId]));

      let foundHop = false;
      let bestMidId = null;
      let bestRel1 = null;
      let bestRel2 = null;

      for (const srcItem of srcNeighbors) {
        if (tgtNeighborSet.has(srcItem.neighborId)) {
          const midId = srcItem.neighborId;
          const midNode = graphData.nodes.find(n => String(n.id) === String(midId));
          const primaryLabel = midNode?.primaryLabel || midNode?.labels?.[0] || '';
          
          if (primaryLabel === 'Network' || (midNode?.labels || []).includes('Network')) {
            bestMidId = midId;
            bestRel1 = srcItem.relId;
            bestRel2 = tgtNeighborSet.get(midId);
            break; 
          }
          
          if (primaryLabel !== 'Project' && !(midNode?.labels || []).includes('Project')) {
             if (!bestMidId) {
               bestMidId = midId;
               bestRel1 = srcItem.relId;
               bestRel2 = tgtNeighborSet.get(midId);
             }
          }
        }
      }

      if (bestMidId) {
        edgeIdSet.add(bestRel1);
        edgeIdSet.add(bestRel2);
        connectorNodeIdSet.add(bestMidId);
        foundHop = true;
      }

      if (!foundHop) {
        const queue = [[srcId, []]];
        const visited = new Set([srcId]);
        let pathRels = null;
        let pathNodes = null;

        while (queue.length > 0) {
          const [curr, pathInfo] = queue.shift();

          if (curr === tgtId) {
            pathRels = pathInfo.map(p => p.relId);
            pathNodes = pathInfo.map(p => p.neighborId);
            break;
          }

          const nbrs = adjMap.get(curr) || [];
          for (const item of nbrs) {
            if (!visited.has(item.neighborId)) {
              visited.add(item.neighborId);
              queue.push([item.neighborId, [...pathInfo, item]]);
            }
          }
        }

        if (pathRels) {
          pathRels.forEach(id => edgeIdSet.add(id));
          pathNodes.forEach(id => {
            if (id !== srcId && id !== tgtId) connectorNodeIdSet.add(id);
          });
        }
      }
    }

    // Identificar todos los findings/vulnerabilities implicados en cada paso de la ruta.
    (selectedExploitationPath.steps || []).forEach((step) => {
      const tId = step.is_container ? step.container_id : step.targetEndpointId;
      const tName = step.is_container ? step.container_name : step.targetEndpoint;
      const stepNode = findNodeForHostOrId(tName, tId);

      if (!stepNode) return;

      let findingRefs = getStepFindingRefs(step);

      // Fallback para pasos antiguos o LPE/container image sin finding_id.
      if (findingRefs.length === 0 && step.vulnerability) {
        findingRefs = [{
          id: null,
          cve_id: step.vulnerability,
          title: step.vulnerability
        }];
      }

      findingRefs.forEach((findingRef) => {
        let findingNode = findFindingNode(findingRef);

        if (!findingNode && findingRef.title) {
          const vulnWords = findingRef.title
            .toLowerCase()
            .replace(/[()]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 3);

          findingNode = graphData.nodes.find(n =>
            (n.labels?.includes('Finding') || n.labels?.includes('Vulnerability')) &&
            vulnWords.some(word =>
              n.properties?.title?.toLowerCase().includes(word) ||
              n.properties?.cve_id?.toLowerCase().includes(word) ||
              n.properties?.description?.toLowerCase().includes(word)
            )
          );
        }

        if (!findingNode) return;

        const queue = [[String(findingNode.id), []]];
        const visited = new Set([String(findingNode.id)]);

        connectorNodeIdSet.add(String(findingNode.id));

        let pathRels = null;
        let pathNodes = null;

        while (queue.length > 0) {
          const [curr, pathInfo] = queue.shift();
          if (pathInfo.length > 4) break;

          if (curr === String(stepNode.id)) {
            pathRels = pathInfo.map(p => p.relId);
            pathNodes = pathInfo.map(p => p.neighborId);
            break;
          }

          const nbrs = adjMap.get(curr) || [];
          for (const item of nbrs) {
            if (!visited.has(item.neighborId)) {
              visited.add(item.neighborId);
              queue.push([item.neighborId, [...pathInfo, item]]);
            }
          }
        }

        if (pathRels) {
          pathRels.forEach(id => edgeIdSet.add(id));
          pathNodes.forEach(id => connectorNodeIdSet.add(id));
        }
      });
    });

    return { pathEdgeIdSet: edgeIdSet, pathConnectorNodeIdSet: connectorNodeIdSet, pathNodeStepMap: nodeStepMap };
  }, [selectedExploitationPath, graphData]);

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Conectando y recuperando topología de Neo4j...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="graph-error-box">
        <h3 className="graph-error-title">Conexión fallida</h3>
        <p className="graph-error-text">{error}</p>
        <button className="btn btn-secondary graph-error-retry-btn" onClick={() => fetchInfrastructure()}>
          Reintentar Conexión
        </button>
      </div>
    );
  }

  const pathActive = Boolean(selectedExploitationPath);
  const searchActive = (searchQuery || '').trim().length > 0;
  const searchQTerm = (searchQuery || '').toLowerCase().trim();

  const checkNodeMatch = (n) => {
    if (!searchActive) return true;
    if (!n || !n.entity) return false;
    const name = (n.entity.name || '').toLowerCase();
    const cve = (n.entity.properties?.cve_id || n.entity.properties?.cve || '').toLowerCase();
    const title = (n.entity.properties?.title || '').toLowerCase();
    const desc = (n.entity.properties?.description || '').toLowerCase();
    const ttps = Array.isArray(n.entity.properties?.ttps) ? n.entity.properties.ttps.join(' ').toLowerCase() : String(n.entity.properties?.ttps || '').toLowerCase();
    const nid = String(n.id).toLowerCase();
    return name.includes(searchQTerm) || cve.includes(searchQTerm) || title.includes(searchQTerm) || desc.includes(searchQTerm) || ttps.includes(searchQTerm) || nid.includes(searchQTerm);
  };

  return (
    <div className="graph-stage" style={{ width: '100%', height: '100%' }}>
      {/* RELOJ */}
      <div className="cw-tr graph-clock-box">
        <div id="clockTime">{timeStr}</div>
        <div id="clockDate">{dateStr}</div>
      </div>

      {selectedExploitationPath && (
        <div
          style={{
            position: 'absolute',
            top: '70px',
            right: '16px',
            zIndex: 20,
            background: 'rgba(10, 12, 35, 0.92)',
            border: '1px solid rgba(239, 68, 68, 0.6)',
            borderRadius: '6px',
            padding: '8px 14px',
            boxShadow: '0 0 20px rgba(0, 0, 0, 0.8), 0 0 10px rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            backdropFilter: 'blur(8px)'
          }}
        >
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '11.5px', color: '#f87171', letterSpacing: '0.5px' }}>
            RUTA DESTACADA: <strong>{selectedExploitationPath.initialEndpoint}</strong> &middot; RIESGO: <strong>{selectedExploitationPath.totalRiskScore.toFixed(1)}</strong>
          </div>
          <button
            className="btn btn-secondary"
            onClick={clearSelectedExploitationPath}
            style={{ padding: '3px 8px', fontSize: '10px', fontFamily: 'Orbitron, sans-serif', borderColor: '#ef4444', color: '#f87171' }}
          >
            LIMPIAR
          </button>
        </div>
      )}

      <svg className="ring-deco r1" width="640" height="640" viewBox="0 0 640 640">
        <circle cx="320" cy="320" r="300" stroke="var(--c900)" strokeWidth="1" fill="none" strokeDasharray="2 10" />
        <circle cx="320" cy="320" r="230" stroke="var(--c900)" strokeWidth="1" fill="none" />
      </svg>
      <svg className="ring-deco r2" width="500" height="500" viewBox="0 0 500 500">
        <circle cx="250" cy="250" r="170" stroke="var(--c800)" strokeWidth="1" fill="none" strokeDasharray="1 6" />
      </svg>

      <svg
        id="graph"
        ref={svgCallbackRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect
          x={-5000}
          y={-5000}
          width={10000}
          height={10000}
          fill="transparent"
          onMouseDown={handleBackgroundMouseDown}
        />

        <g id="edgeGroup">
          {graphData.relationships.map((rel) => {
            // Ocultar relación CONTAINS_NETWORK
            if (rel.type === 'CONTAINS_NETWORK') return null;

            const na = layoutNodes.find(n => n.id === rel.source);
            const nb = layoutNodes.find(n => n.id === rel.target);
            if (!na || !nb) return null;

            // Ocultar relación directa entre Proyecto y Red
            const isProjectToNetwork =
              (na.entity.primaryLabel === 'Project' && nb.entity.primaryLabel === 'Network') ||
              (nb.entity.primaryLabel === 'Project' && na.entity.primaryLabel === 'Network');
            if (isProjectToNetwork) return null;

            const naMatches = filterType === 'ALL' || na.entity.primaryLabel === filterType;
            const nbMatches = filterType === 'ALL' || nb.entity.primaryLabel === filterType;
            const isDimmed = !naMatches || !nbMatches;

            const saMatches = checkNodeMatch(na);
            const sbMatches = checkNodeMatch(nb);
            const searchDimmed = searchActive && !(saMatches || sbMatches);

            const isPathEdge = pathEdgeIdSet.has(rel.id);
            const pathDimmed = pathActive && !isPathEdge;

            const edgeShouldBeDimmed =
              (isDimmed && !isPathEdge) ||
              (searchDimmed && !isPathEdge) ||
              pathDimmed;

            return (
              <path
                key={rel.id}
                d={getEdgePath(rel.source, rel.target)}
                className={`edge flow ${isPathEdge ? 'path-highlighted' : ''} ${edgeShouldBeDimmed ? 'dim' : ''}`}
                style={{
                  stroke: isPathEdge
                    ? '#ef4444'
                    : rel.type === 'OF_VULNERABILITY' || rel.type === 'TARGETS_VULN'
                      ? '#ef4444'
                      : rel.type === 'CONNECTED_TO'
                        ? 'var(--c300)'
                        : 'var(--c700)'
                }}
              />
            );
          })}
        </g>

        <g id="nodeGroup">
          {layoutNodes.map((node) => {
            const matchesCat = filterType === 'ALL' || node.entity.primaryLabel === filterType;
            const matchesSearch = checkNodeMatch(node);
            const isDimmed = !matchesCat || !matchesSearch;

            const isSelected = selectedNode && selectedNode.id === node.id;
            const isVuln = node.entity.categoryId === 'vulnerabilidad';

            // Comprobar si es un Endpoint decomisado (offline)
            const isDecom = node.isDecom || isDecommissionedEndpoint(node.entity);

            const riskTierColor = isDecom ? null : getTierColor(node.entity.properties?.risk_tier);
            const priorityTierColor = isDecom ? null : getTierColor(node.entity.properties?.priority_tier);

            const stepNumber = pathNodeStepMap.get(String(node.id));
            const isStepNode = stepNumber !== undefined;
            const isConnectorNode = pathConnectorNodeIdSet.has(String(node.id));
            const isNodeInPath = isStepNode || isConnectorNode;
            const pathDimmedNode = pathActive && !isNodeInPath;

            const nodeShouldBeDimmed = (isDimmed && !isNodeInPath) || pathDimmedNode;

            return (
              <g
                key={node.id}
                className={`node-group ${node.pinned ? '' : 'free'} ${nodeShouldBeDimmed ? 'dim' : ''} ${isSelected ? 'selected' : ''} ${isStepNode ? 'path-node' : ''} ${isDecom ? 'decommissioned' : ''}`}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                onDoubleClick={(e) => handleNodeDoubleClick(e, node.id)}
                style={isDecom ? { opacity: 0.65 } : undefined}
              >
                {isVuln && !isDecom && (
                  <circle
                    r={node.r}
                    fill="none"
                    stroke="var(--c50)"
                    strokeWidth="1.5"
                    className="vuln-ping-ring"
                  />
                )}

                {riskTierColor && (
                  <circle
                    r={node.r + 9}
                    fill="none"
                    stroke={riskTierColor}
                    strokeWidth="2"
                    opacity="0.9"
                  />
                )}

                {priorityTierColor && (
                  <circle
                    r={node.r + 13}
                    fill="none"
                    stroke={priorityTierColor}
                    strokeWidth="1.5"
                    opacity="0.65"
                    strokeDasharray="4 4"
                  />
                )}

                <circle r={node.r + 6} fill={isDecom ? "#4b5563" : node.color} opacity={isDecom ? "0.05" : "0.12"} />

                <circle
                  className="core"
                  r={node.r}
                  fill={isDecom ? "#111827" : "rgba(5, 6, 30, 0.9)"}
                  stroke={isNodeInPath ? '#ef4444' : isDecom ? '#6b7280' : node.color}
                  strokeWidth={isNodeInPath ? '3' : '2'}
                  strokeDasharray={isDecom ? '3 3' : undefined}
                  filter={isDecom ? undefined : "url(#glow)"}
                />

                <NodeIcon
                  categoryId={node.entity.categoryId}
                  primaryLabel={node.entity.primaryLabel}
                  color={isNodeInPath ? '#ef4444' : isDecom ? '#6b7280' : node.color}
                  size={node.r * 1.1}
                />

                {isStepNode && (
                  <g transform={`translate(${node.r - 2}, ${-node.r + 2})`}>
                    <circle r="11" className="node-step-number-bg" />
                    <text
                      x="0"
                      y="3.5"
                      textAnchor="middle"
                      className="node-step-number-badge"
                    >
                      #{stepNumber}
                    </text>
                  </g>
                )}

                {node.entity.primaryLabel === 'Finding' && node.entity.properties?.has_vulnerabilities && (
                  <g className="warning-badge" transform={`translate(${node.r - 2}, ${node.r - 2})`}>
                    <path d="M -10 7 L -1.2 -8.2 C -0.6 -9.2 0.6 -9.2 1.2 -8.2 L 10 7 C 10.6 8 9.9 9.2 8.8 9.2 L -8.8 9.2 C -9.9 9.2 -10.6 8 -10 7 Z" />
                    <line x1="0" y1="-3" x2="0" y2="2" />
                    <circle cx="0" cy="5.5" r="1.2" />
                  </g>
                )}

                <text y={node.r + 16} textAnchor="middle" fill={isDecom ? '#9ca3af' : undefined}>
                  {node.entity.name}
                </text>

                <text className="sub" y={node.r + 28} textAnchor="middle" fill={isDecom ? '#6b7280' : undefined}>
                  {isDecom ? 'DECOMMISSIONED' : node.entity.primaryLabel.toUpperCase()}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <div className="corner-widget cw-tl">
        NODOS: <span id="nodeCount">{layoutNodes.length}</span> &nbsp;|&nbsp; ENLACES: <span id="edgeCount">{graphData.relationships.length}</span>
      </div>

      <div className="layout-selector-widget cw-bl">
        <button
          className={`btn-layout ${layoutMode === 'layered' ? 'active' : ''}`}
          onClick={() => setLayoutMode('layered')}
        >
          Capas
        </button>
        <button
          className={`btn-layout ${layoutMode === 'tree' ? 'active' : ''}`}
          onClick={() => setLayoutMode('tree')}
        >
          Árbol
        </button>
        <button
          className={`btn-layout ${layoutMode === 'stix' ? 'active' : ''}`}
          onClick={() => setLayoutMode('stix')}
        >
          Grafo STIX
        </button>
      </div>

      <div className="corner-widget cw-br">
        SISTEMA: <span className="status-stable">ESTABLE</span><br />
        LAT: 42MS &middot; SYNC OK
      </div>
    </div>
  );
}

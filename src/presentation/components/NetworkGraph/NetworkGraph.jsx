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

// Mundo fijo: de -5000 a 5000 en ambos ejes (10.000 x 10.000 de espacio total).
// Reemplaza al antiguo CANVAS_WIDTH=900 / CANVAS_HEIGHT=640, que se quedaba
// corto con grafos grandes.
const CANVAS_MIN = -5000;
const CANVAS_MAX = 5000;
const CANVAS_WIDTH = CANVAS_MAX - CANVAS_MIN;  // 10000
const CANVAS_HEIGHT = CANVAS_MAX - CANVAS_MIN; // 10000

// Centro del mundo, usado por los modos 'tree' y 'stix' para centrar la raíz
// (antes usaban CANVAS_WIDTH/2, CANVAS_HEIGHT/2, que ahora sería (5000,5000)
// — la esquina del mundo, no su centro real, que es (0,0)).
const WORLD_CENTER_X = (CANVAS_MIN + CANVAS_MAX) / 2; // 0
const WORLD_CENTER_Y = (CANVAS_MIN + CANVAS_MAX) / 2; // 0

// Tamaño del viewBox inicial: lo que se ve nada más entrar, centrado en el
// origen (0,0) del mundo.
const INITIAL_VIEW_W = 900;
const INITIAL_VIEW_H = 640;

const getLayerY = (categoryId) => {
  // Capas distribuidas simétricamente alrededor del centro del mundo (y=0),
  // usado por el modo 'layered'
  switch (categoryId) {
    case 'proyecto': return -220;
    case 'red': return -140;
    case 'endpoint':
    case 'hardware': return -40;
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
    default: return '#A5A5FF';
  }
};

const getNodeRadius = (categoryId) => {
  switch (categoryId) {
    case 'proyecto': return 32;
    case 'endpoint': return 26;
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

  // Reloj (movido desde el HudHeader a la esquina superior derecha del canvas)
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

  // FIX: viewBox ahora arranca centrado en (0,0) — el centro del nuevo mundo
  // -5000..5000 — en vez de en la esquina (0,0) del mundo viejo 0..900/0..640.
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

  // Reset pinned status of all nodes when layoutMode changes
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

    const visibleNodes = graphData.nodes.filter(n =>
      !n.labels.includes('TTP') &&
      !n.labels.includes('ThreatActor') &&
      !n.labels.includes('Vulnerability')
    );

    // Compute BFS depth from Project node (root)
    const adj = {};
    visibleNodes.forEach(n => {
      adj[n.id] = [];
    });
    (graphData.relationships || []).forEach(rel => {
      if (adj[rel.source] && adj[rel.target]) {
        adj[rel.source].push(rel.target);
        adj[rel.target].push(rel.source);
      }
    });

    const rootNode = visibleNodes.find(n => n.primaryLabel === 'Project' || n.categoryId === 'proyecto');
    const depths = {};
    visibleNodes.forEach(n => {
      depths[n.id] = 999;
    });
    if (rootNode) {
      const queue = [rootNode.id];
      depths[rootNode.id] = 0;
      let head = 0;
      while (head < queue.length) {
        const currId = queue[head++];
        const currDepth = depths[currId];
        const neighbors = adj[currId] || [];
        for (const nbrId of neighbors) {
          if (depths[nbrId] === 999) {
            depths[nbrId] = currDepth + 1;
            queue.push(nbrId);
          }
        }
      }
    }

    // Fallbacks for any nodes not reached by BFS
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
      // FIX: posición inicial centrada en 0 (antes CANVAS_WIDTH/2 = 450)
      const initialX = Math.cos(angle) * 200;

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
        color: getNodeColor(n.categoryId),
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
          const source = nodes.find(n => n.id === rel.source);
          const target = nodes.find(n => n.id === rel.target);
          if (source && target) {
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
          }
        });

        nodes.forEach(node => {
          if (node.id === draggedNodeIdRef.current || node.pinned) {
            node.vx = 0;
            node.vy = 0;
            return;
          }

          if (layoutMode === 'stix') {
            const isRoot = node.entity.primaryLabel === 'Project' || node.entity.categoryId === 'proyecto';
            // FIX: centrado en WORLD_CENTER (0,0) en vez de CANVAS_WIDTH/2
            // (que ahora sería 5000, la esquina del mundo, no su centro)
            if (isRoot) {
              node.fx += (WORLD_CENTER_X - node.x) * 0.15;
              node.fy += (WORLD_CENTER_Y - node.y) * 0.15;
            } else {
              node.fx += (WORLD_CENTER_X - node.x) * 0.005;
              node.fy += (WORLD_CENTER_Y - node.y) * 0.005;
            }
          } else if (layoutMode === 'tree') {
            const isRoot = node.entity.primaryLabel === 'Project' || node.entity.categoryId === 'proyecto';
            // FIX: centrado en WORLD_CENTER_X (0) en vez de CANVAS_WIDTH/2
            if (isRoot) {
              node.fx += (WORLD_CENTER_X - node.x) * 0.2;
            }
            // FIX: targetY ahora arranca en negativo (-300) y crece hacia
            // abajo con la misma separación entre niveles (185), centrado
            // igual que el resto de layouts alrededor de y=0
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

          // FIX: se unifica el clamp para los tres modos de layout, usando
          // los límites del mundo -5000/5000 en vez de los rangos fijos y
          // pequeños que 'tree'/'stix' tenían antes ([-450,1350]x[40,1200],
          // pensados para el mundo viejo de 900x640).
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
        // FIX: límite máximo de zoom-out ahora es el tamaño real del mundo
        // (10000), antes topaba en 3000/2200 mucho antes de llegar al borde.
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
        // FIX: mismo límite -5000/5000 para los tres modos al arrastrar
        // manualmente (antes 'tree'/'stix' usaban un rango distinto y más
        // pequeño que 'layered')
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

    const orderedPathNodes = [];

    const entryNode = findNodeForHostOrId(selectedExploitationPath.initialEndpoint, null) ||
      (selectedExploitationPath.steps?.[0] && findNodeForHostOrId(selectedExploitationPath.steps[0].sourceEndpoint, null));

    if (entryNode) {
      orderedPathNodes.push(entryNode);
      nodeStepMap.set(String(entryNode.id), 1);
    }

    (selectedExploitationPath.steps || []).forEach((step) => {
      const stepNode = findNodeForHostOrId(step.targetEndpoint, step.targetEndpointId);
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
          
          // Si encontramos una Network, es el salto óptimo para una ruta de ataque
          if (primaryLabel === 'Network' || (midNode?.labels || []).includes('Network')) {
            bestMidId = midId;
            bestRel1 = srcItem.relId;
            bestRel2 = tgtNeighborSet.get(midId);
            break; 
          }
          
          // Si no es un proyecto, lo guardamos como candidato por si acaso
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
          if (pathInfo.length > 3) break;

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

    // --- Destacar rama hacia el Finding de cada paso ---
    (selectedExploitationPath.steps || []).forEach((step) => {
      const stepNode = findNodeForHostOrId(step.targetEndpoint, step.targetEndpointId);
      if (stepNode && step.finding_id) {
        const findingNode = graphData.nodes.find(n => String(n.id) === String(step.finding_id));
        
        if (findingNode) {
          const queue = [[String(stepNode.id), []]];
          const visited = new Set([String(stepNode.id)]);
          let pathRels = null;
          let pathNodes = null;

          while (queue.length > 0) {
            const [curr, pathInfo] = queue.shift();
            if (pathInfo.length > 3) break; // Endpoint -> SoftwareInst -> Finding = 2 saltos máx

            if (curr === String(findingNode.id)) {
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
              if (id !== String(stepNode.id)) {
                connectorNodeIdSet.add(id);
              }
            });
          }
        }
      }
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
      {/* RELOJ — esquina superior derecha del canvas del grafo */}
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
            const na = layoutNodes.find(n => n.id === rel.source);
            const nb = layoutNodes.find(n => n.id === rel.target);
            if (!na || !nb) return null;

            const naMatches = filterType === 'ALL' || na.entity.primaryLabel === filterType;
            const nbMatches = filterType === 'ALL' || nb.entity.primaryLabel === filterType;
            const isDimmed = !naMatches || !nbMatches;

            const saMatches = checkNodeMatch(na);
            const sbMatches = checkNodeMatch(nb);
            const searchDimmed = searchActive && !(saMatches || sbMatches);

            const isPathEdge = pathEdgeIdSet.has(rel.id);
            const pathDimmed = pathActive && !isPathEdge;

            return (
              <path
                key={rel.id}
                d={getEdgePath(rel.source, rel.target)}
                className={`edge flow ${isPathEdge ? 'path-highlighted' : ''} ${(isDimmed || searchDimmed || pathDimmed) ? 'dim' : ''}`}
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

            const riskTierColor = getTierColor(node.entity.properties?.risk_tier);
            const priorityTierColor = getTierColor(node.entity.properties?.priority_tier);

            const stepNumber = pathNodeStepMap.get(String(node.id));
            const isStepNode = stepNumber !== undefined;
            const isConnectorNode = pathConnectorNodeIdSet.has(String(node.id));
            const isNodeInPath = isStepNode || isConnectorNode;
            const pathDimmedNode = pathActive && !isNodeInPath;

            return (
              <g
                key={node.id}
                className={`node-group ${node.pinned ? '' : 'free'} ${(isDimmed || pathDimmedNode) ? 'dim' : ''} ${isSelected ? 'selected' : ''} ${isStepNode ? 'path-node' : ''}`}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                onDoubleClick={(e) => handleNodeDoubleClick(e, node.id)}
              >
                {isVuln && (
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

                <circle r={node.r + 6} fill={node.color} opacity="0.12" />

                <circle
                  className="core"
                  r={node.r}
                  fill="rgba(5, 6, 30, 0.9)"
                  stroke={isNodeInPath ? '#ef4444' : node.color}
                  strokeWidth={isNodeInPath ? '3' : '2'}
                  filter="url(#glow)"
                />

                <NodeIcon
                  categoryId={node.entity.categoryId}
                  primaryLabel={node.entity.primaryLabel}
                  color={isNodeInPath ? '#ef4444' : node.color}
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

                <text y={node.r + 16} textAnchor="middle">
                  {node.entity.name}
                </text>

                <text className="sub" y={node.r + 28} textAnchor="middle">
                  {node.entity.primaryLabel.toUpperCase()}
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
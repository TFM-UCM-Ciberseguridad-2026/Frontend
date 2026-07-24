import React, { useState, useEffect, useRef, useCallback } from 'react';

const PHYSICS = {
  repulsion: 8500,
  springLength: 190,
  springConstant: 0.015,
  damping: 0.09,
  centralGravity: 0.02,
  avoidOverlapPadding: 38,
  maxSpeed: 18
};

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 640;

const getLayerY = (categoryId) => {
  switch (categoryId) {
    case 'proyecto': return 80;
    case 'red': return 160;
    case 'endpoint':
    case 'hardware': return 250;
    case 'instalacion': return 360;
    case 'software': return 440;
    case 'hallazgo': return 510;
    case 'vulnerabilidad':
    case 'remediacion': return 570;
    default: return CANVAS_HEIGHT / 2;
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
    case 'hallazgo': return '#2F02FF';
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

export function NetworkGraph({
  graphData,
  filterType,
  searchQuery,
  loading,
  error,
  selectedNode,
  setSelectedNode,
  fetchInfrastructure,
  fetchTopAPTs
}) {
  const [layoutMode, setLayoutMode] = useState('layered'); // 'layered', 'tree', 'stix'
  const [layoutNodes, setLayoutNodes] = useState([]);
  const nodesRef = useRef([]);
  const draggedNodeIdRef = useRef(null);
  const svgRef = useRef(null);
  const animationFrameRef = useRef(null);

  // FIX: además de la ref normal, guardamos el nodo <svg> en estado a través
  // de una callback ref. Esto es lo que permite que el useEffect del wheel
  // se re-ejecute exactamente cuando el <svg> se monta de verdad — antes,
  // con useEffect(() => {...}, []), el efecto corría UNA sola vez durante el
  // primer render (que muestra el spinner de loading, sin <svg> todavía),
  // encontraba la ref en null, y nunca más volvía a intentarlo — el zoom
  // quedaba muerto para siempre aunque el grafo ya estuviera visible.
  const [svgEl, setSvgEl] = useState(null);
  const svgCallbackRef = useCallback((node) => {
    svgRef.current = node;
    setSvgEl(node);
  }, []);

  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: CANVAS_WIDTH, h: CANVAS_HEIGHT });
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
      !n.labels.includes('TTP') && !n.labels.includes('ThreatActor')
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
      const initialX = CANVAS_WIDTH / 2 + Math.cos(angle) * 200;

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
            if (isRoot) {
              const cx = CANVAS_WIDTH / 2;
              const cy = CANVAS_HEIGHT / 2;
              node.fx += (cx - node.x) * 0.15;
              node.fy += (cy - node.y) * 0.15;
            } else {
              const cx = CANVAS_WIDTH / 2;
              const cy = CANVAS_HEIGHT / 2;
              node.fx += (cx - node.x) * 0.005;
              node.fy += (cy - node.y) * 0.005;
            }
          } else if (layoutMode === 'tree') {
            const isRoot = node.entity.primaryLabel === 'Project' || node.entity.categoryId === 'proyecto';
            if (isRoot) {
              const cx = CANVAS_WIDTH / 2;
              node.fx += (cx - node.x) * 0.2;
            }
            const targetY = 80 + (node.depth || 0) * 185;
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

          if (layoutMode === 'tree' || layoutMode === 'stix') {
            node.x = Math.max(-450, Math.min(1350, node.x));
            node.y = Math.max(40, Math.min(1200, node.y));
          } else {
            node.x = Math.max(40, Math.min(CANVAS_WIDTH - 40, node.x));
            node.y = Math.max(40, Math.min(CANVAS_HEIGHT - 40, node.y));
          }
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

  // FIX: ahora depende de [svgEl] en vez de []. Se re-ejecuta cada vez que
  // el <svg id="graph"> realmente se monta o desmonta (por ejemplo al salir
  // del estado de loading), garantizando que el listener de wheel se
  // enganche cuando el elemento existe de verdad.
  useEffect(() => {
    if (!svgEl) return;

    const wheelHandler = (e) => {
      e.preventDefault();
      const svgP = screenToSvgPoint(e.clientX, e.clientY);
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;

      setViewBox(vb => {
        const newW = Math.max(200, Math.min(3000, vb.w * zoomFactor));
        const newH = Math.max(150, Math.min(2200, vb.h * zoomFactor));
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
        if (layoutMode === 'tree' || layoutMode === 'stix') {
          node.x = Math.max(-450, Math.min(1350, svgP.x));
          node.y = Math.max(40, Math.min(1200, svgP.y));
        } else {
          node.x = Math.max(40, Math.min(CANVAS_WIDTH - 40, svgP.x));
          node.y = Math.max(40, Math.min(CANVAS_HEIGHT - 40, svgP.y));
        }
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
        <h3 className="graph-error-title">⚠️ Conexión fallida</h3>
        <p className="graph-error-text">{error}</p>
        <button className="btn btn-secondary graph-error-retry-btn" onClick={() => fetchInfrastructure()}>
          Reintentar Conexión
        </button>
      </div>
    );
  }

  return (
    <div className="graph-stage" style={{ width: '100%', height: '100%' }}>
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

            const searchActive = searchQuery.trim().length > 0;
            const saMatches = !searchActive || na.entity.name.toLowerCase().includes(searchQuery.toLowerCase());
            const sbMatches = !searchActive || nb.entity.name.toLowerCase().includes(searchQuery.toLowerCase());
            const searchDimmed = searchActive && !(saMatches || sbMatches);

            return (
              <path
                key={rel.id}
                d={getEdgePath(rel.source, rel.target)}
                className={`edge flow ${isDimmed || searchDimmed ? 'dim' : ''}`}
                style={{
                  stroke: rel.type === 'OF_VULNERABILITY' || rel.type === 'TARGETS_VULN'
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
            const matchesSearch = !searchQuery || node.entity.name.toLowerCase().includes(searchQuery.toLowerCase());
            const isDimmed = !matchesCat || !matchesSearch;

            const isSelected = selectedNode && selectedNode.id === node.id;
            const isVuln = node.entity.categoryId === 'vulnerabilidad';

            return (
              <g
                key={node.id}
                className={`node-group ${node.pinned ? '' : 'free'} ${isDimmed ? 'dim' : ''} ${isSelected ? 'selected' : ''}`}
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

                <circle r={node.r + 6} fill={node.color} opacity="0.12" />

                <circle
                  className="core"
                  r={node.r}
                  fill="rgba(5, 6, 30, 0.9)"
                  stroke={node.color}
                  strokeWidth="2"
                  filter="url(#glow)"
                />

                <circle r={node.r * 0.32} fill={node.color} />

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

      <button className="cw-tr btn-hud-tr" onClick={fetchTopAPTs}>
        <span className="ic">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 3.5 4.5 6.5v5.4c0 4.6 3.1 7.7 7.5 8.6 4.4-.9 7.5-4 7.5-8.6V6.5L12 3.5Z" />
            <path d="M9.5 12.2l1.8 1.8 3.4-3.6" />
          </svg>
        </span>
        Top Threat Actors
      </button>

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
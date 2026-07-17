import React, { useState, useEffect, useRef } from 'react';

// Constantes de físicas, equivalentes a las que usaba vis-network (barnesHut)
const PHYSICS = {
  repulsion: 2500,          // equivalente a gravitationalConstant (negativo = repulsión)
  springLength: 100,
  springConstant: 0.015,    // muelle débil, así los nodos no se aglutinan al generarse
  damping: 0.09,
  centralGravity: 0.02,     // atracción suave hacia la capa vertical de cada nodo
  avoidOverlapPadding: 12,  // margen extra de colisión entre nodos
  maxSpeed: 18              // límite de velocidad para evitar que la simulación "explote"
};

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 640;

// Devuelve la posición Y de la capa vertical según la categoría del nodo
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

// Código de color por categoría, sobre la paleta azul del tema (--c200..--c900),
// con dos excepciones explícitas: endpoint en blanco, vulnerabilidad en rojo.
const getNodeColor = (categoryId) => {
  switch (categoryId) {
    case 'proyecto': return '#4D3BFF';       // --c500
    case 'red': return '#7973FF';            // --c400
    case 'endpoint': return '#FFFFFF';       // blanco puro
    case 'hardware': return '#A5A5FF';       // --c300
    case 'instalacion': return '#3813FF';    // --c600
    case 'software': return '#CDCFFF';       // --c200
    case 'hallazgo': return '#2F02FF';       // --c700
    case 'vulnerabilidad': return '#ef4444'; // rojo
    case 'remediacion': return '#2701D6';    // --c800
    case 'parche': return '#2103A9';         // --c900
    default: return '#A5A5FF';               // --c300, fallback
  }
};

// Radio por categoría: Proyecto > Endpoint > resto (todos al mismo nivel)
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
  fetchInfrastructure
}) {
  const [layoutNodes, setLayoutNodes] = useState([]);
  const nodesRef = useRef([]);           // fuente de verdad mutable que usa el bucle de físicas
  const draggedNodeIdRef = useRef(null); // id del nodo que se está arrastrando activamente (si hay alguno)
  const svgRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Estado de pan/zoom: qué porción del canvas de 900x640 se está viendo
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: CANVAS_WIDTH, h: CANVAS_HEIGHT });
  const viewBoxRef = useRef(viewBox); // FIX: esta ref faltaba por completo — sin ella, handleBackgroundMouseDown
                                       // rompía con "viewBoxRef is not defined" en cuanto intentabas panear
  const panStateRef = useRef(null);
  const panFrameRef = useRef(null);   // FIX: esta también faltaba — necesaria para agrupar el paneo en 1 rAF/frame

  // FIX: este efecto también faltaba — mantiene viewBoxRef sincronizada con el estado viewBox
  useEffect(() => {
    viewBoxRef.current = viewBox;
  }, [viewBox]);

  // Inicializar posiciones de los nodos cuando cambian los datos del grafo
  useEffect(() => {
    if (!graphData.nodes || graphData.nodes.length === 0) {
      nodesRef.current = [];
      setLayoutNodes([]);
      return;
    }

    // Excluir TTPs y ThreatActors del mapa visual (se consultan vía TOP APTs)
    const visibleNodes = graphData.nodes.filter(n =>
      !n.labels.includes('TTP') && !n.labels.includes('ThreatActor')
    );

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
        pinned: false // true una vez que el usuario lo suelta tras arrastrarlo: deja de moverse por física
      };
    });

    nodesRef.current = initial;
    setLayoutNodes(initial);
  }, [graphData]);

  // Bucle continuo de físicas: repulsión + colisión, resortes por relación, gravedad de capa
  useEffect(() => {
    const tick = () => {
      const nodes = nodesRef.current;

      if (nodes.length > 0) {
        // 1. Repulsión entre todos los pares de nodos (equivalente a barnesHut) + colisión dura
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

        // 2. Atracción por relaciones (resortes)
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

        // 3. Integración: velocidad + amortiguación + gravedad de capa vertical + límites
        nodes.forEach(node => {
          if (node.id === draggedNodeIdRef.current || node.pinned) {
            node.vx = 0;
            node.vy = 0;
            return;
          }

          node.fy += (getLayerY(node.entity.categoryId) - node.y) * PHYSICS.centralGravity;

          node.vx = (node.vx + node.fx) * (1 - PHYSICS.damping);
          node.vy = (node.vy + node.fy) * (1 - PHYSICS.damping);

          const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
          if (speed > PHYSICS.maxSpeed) {
            node.vx = (node.vx / speed) * PHYSICS.maxSpeed;
            node.vy = (node.vy / speed) * PHYSICS.maxSpeed;
          }

          node.x += node.vx;
          node.y += node.vy;

          node.x = Math.max(40, Math.min(CANVAS_WIDTH - 40, node.x));
          node.y = Math.max(40, Math.min(CANVAS_HEIGHT - 40, node.y));
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
  }, [graphData]);

  const screenToSvgPoint = (clientX, clientY) => {
    const svgEl = svgRef.current;
    if (!svgEl) return { x: 0, y: 0 };
    const pt = svgEl.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    return pt.matrixTransform(svgEl.getScreenCTM().inverse());
  };

  // Arrastrar un nodo individual con el ratón
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
        node.x = Math.max(40, Math.min(CANVAS_WIDTH - 40, svgP.x));
        node.y = Math.max(40, Math.min(CANVAS_HEIGHT - 40, svgP.y));
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

  // Doble click sobre un nodo: lo "suelta" de nuevo para que vuelva a obedecer la física
  const handleNodeDoubleClick = (e, nodeId) => {
    e.preventDefault();
    e.stopPropagation();
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (node) {
      node.pinned = false;
    }
  };

  // Paneo del canvas: arrastrar el fondo vacío (no un nodo) desplaza la vista.
  // Agrupa todos los mousemove del mismo frame en un único setViewBox vía rAF,
  // y captura originX/originY en constantes locales para evitar la race condition
  // con panStateRef.current volviéndose null a mitad de un update diferido.
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

  const handleWheel = (e) => {
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
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        preserveAspectRatio="xMidYMid meet"
        onWheel={handleWheel}
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
      <div className="corner-widget cw-br">
        SISTEMA: <span className="status-stable">ESTABLE</span><br />
        LAT: 42MS &middot; SYNC OK
      </div>
    </div>
  );
}
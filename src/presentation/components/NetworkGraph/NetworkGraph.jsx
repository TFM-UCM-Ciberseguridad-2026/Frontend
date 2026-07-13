import React, { useState, useEffect, useRef } from 'react';

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
  const svgRef = useRef(null);

  // Calcular el layout cuando graphData cambia
  useEffect(() => {
    if (!graphData.nodes || graphData.nodes.length === 0) {
      setLayoutNodes([]);
      return;
    }

    const width = 900;
    const height = 640;

    // Excluir TTPs y ThreatActors del mapa visual (se consultan vía TOP APTs)
    const visibleNodes = graphData.nodes.filter(n =>
      !n.labels.includes('TTP') && !n.labels.includes('ThreatActor')
    );

    // Inicializar nodos en capas verticales segun su rol ciberseguridad
    let nodes = visibleNodes.map((n, i) => {
      let layerY = height / 2;
      const cat = n.categoryId;
      if (cat === 'proyecto') layerY = 70;
      else if (cat === 'red') layerY = 140;
      else if (cat === 'endpoint') layerY = 220;
      else if (cat === 'hardware') layerY = 220;
      else if (cat === 'instalacion') layerY = 320;
      else if (cat === 'software') layerY = 400;
      else if (cat === 'hallazgo') layerY = 480;
      else if (cat === 'vulnerabilidad') layerY = 560;
      else if (cat === 'remediacion') layerY = 560;

      const angle = (i / visibleNodes.length) * 2 * Math.PI;
      const initialX = width / 2 + Math.cos(angle) * 200;

      return {
        id: n.id,
        entity: n,
        x: initialX,
        y: layerY,
        r: n.primaryLabel === 'Project' ? 30 : n.primaryLabel === 'Vulnerability' ? 26 : 20,
        dispX: 0,
        dispY: 0
      };
    });

    // Simulación simple de fuerzas (Force-Directed) para separar nodos y ajustar verticalmente
    const iterations = 80;
    const k = Math.sqrt((width * height) / nodes.length) || 100;

    for (let step = 0; step < iterations; step++) {
      // Repulsión
      for (let i = 0; i < nodes.length; i++) {
        const nodeA = nodes[i];
        nodeA.dispX = 0;
        nodeA.dispY = 0;
        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue;
          const nodeB = nodes[j];
          const dx = nodeA.x - nodeB.x;
          const dy = nodeA.y - nodeB.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 180) {
            const force = (k * k) / dist;
            nodeA.dispX += (dx / dist) * force;
            nodeA.dispY += (dy / dist) * force;
          }
        }
      }

      // Atracción por relaciones
      graphData.relationships.forEach(rel => {
        const source = nodes.find(n => n.id === rel.source);
        const target = nodes.find(n => n.id === rel.target);
        if (source && target) {
          const dx = source.x - target.x;
          const dy = source.y - target.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (dist * dist) / k;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          source.dispX -= fx;
          source.dispY -= fy;
          target.dispX += fx;
          target.dispY += fy;
        }
      });

      // Actualizar posiciones
      nodes.forEach(node => {
        let targetY = height / 2;
        const cat = node.entity.categoryId;
        if (cat === 'proyecto') targetY = 80;
        else if (cat === 'red') targetY = 160;
        else if (cat === 'endpoint') targetY = 250;
        else if (cat === 'hardware') targetY = 250;
        else if (cat === 'instalacion') targetY = 360;
        else if (cat === 'software') targetY = 440;
        else if (cat === 'hallazgo') targetY = 510;
        else if (cat === 'vulnerabilidad') targetY = 570;
        else if (cat === 'remediacion') targetY = 570;

        // Gravedad suave hacia su capa vertical
        node.dispY += (targetY - node.y) * 0.15;

        // Limitar desplazamiento
        const maxDisp = 15;
        const dispDist = Math.sqrt(node.dispX * node.dispX + node.dispY * node.dispY) || 1;
        const clipped = Math.min(maxDisp, dispDist);
        node.x += (node.dispX / dispDist) * clipped;
        node.y += (node.dispY / dispDist) * clipped;

        // Límites del canvas
        node.x = Math.max(50, Math.min(width - 50, node.x));
        node.y = Math.max(50, Math.min(height - 50, node.y));
      });
    }

    setLayoutNodes(nodes);
  }, [graphData]);

  // Manejo de Drag and Drop en SVG
  const handleMouseDown = (e, nodeId) => {
    e.preventDefault();
    const svgEl = svgRef.current;
    if (!svgEl) return;

    let hasMoved = false;

    const onMouseMove = (moveEvent) => {
      const pt = svgEl.createSVGPoint();
      pt.x = moveEvent.clientX;
      pt.y = moveEvent.clientY;
      const svgP = pt.matrixTransform(svgEl.getScreenCTM().inverse());
      hasMoved = true;

      setLayoutNodes(prev => prev.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            x: Math.max(40, Math.min(860, svgP.x)),
            y: Math.max(40, Math.min(600, svgP.y))
          };
        }
        return node;
      }));
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      // Si no se movió, se trata como un click para seleccionar el nodo
      if (!hasMoved) {
        const clickedNode = layoutNodes.find(n => n.id === nodeId);
        if (clickedNode) {
          setSelectedNode(clickedNode.entity);
        }
      }
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
      <div style={{ padding: '3rem', color: '#f87171', background: '#05061e', margin: '2rem', borderRadius: '12px', border: '1px solid rgba(122, 115, 255, 0.18)' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontFamily: 'Orbitron' }}>⚠️ Conexión fallida</h3>
        <p style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>{error}</p>
        <button className="btn btn-secondary" onClick={() => fetchInfrastructure()} style={{ marginTop: '1.5rem', fontFamily: 'Orbitron' }}>
          Reintentar Conexión
        </button>
      </div>
    );
  }

  return (
    <div className="graph-stage" style={{ width: '100%', height: '100%' }}>
      {/* Círculos decorativos en el fondo */}
      <svg className="ring-deco r1" width="640" height="640" viewBox="0 0 640 640">
        <circle cx="320" cy="320" r="300" stroke="var(--c900)" strokeWidth="1" fill="none" strokeDasharray="2 10" />
        <circle cx="320" cy="320" r="230" stroke="var(--c900)" strokeWidth="1" fill="none" />
      </svg>
      <svg className="ring-deco r2" width="500" height="500" viewBox="0 0 500 500">
        <circle cx="250" cy="250" r="170" stroke="var(--c800)" strokeWidth="1" fill="none" strokeDasharray="1 6" />
      </svg>

      {/* SVG Canvas interactivo */}
      <svg
        id="graph"
        ref={svgRef}
        viewBox="0 0 900 640"
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%', display: 'block' }}
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

        {/* Grupo de Enlaces (Edges) */}
        <g id="edgeGroup">
          {graphData.relationships.map((rel) => {
            const na = layoutNodes.find(n => n.id === rel.source);
            const nb = layoutNodes.find(n => n.id === rel.target);
            if (!na || !nb) return null;

            // Filtro de categorías
            const naMatches = filterType === 'ALL' || na.entity.primaryLabel === filterType;
            const nbMatches = filterType === 'ALL' || nb.entity.primaryLabel === filterType;
            const isDimmed = !naMatches || !nbMatches;

            // Buscador
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

        {/* Grupo de Nodos */}
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
                className={`node-group ${isDimmed ? 'dim' : ''} ${isSelected ? 'selected' : ''}`}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseDown={(e) => handleMouseDown(e, node.id)}
              >
                {/* Animación ping para vulnerabilidad */}
                {isVuln && (
                  <circle
                    r={node.r}
                    fill="none"
                    stroke="var(--c50)"
                    strokeWidth="1.5"
                    style={{ animation: 'ping 1.8s ease-out infinite' }}
                  />
                )}

                {/* Halo del nodo */}
                <circle
                  r={node.r + 6}
                  fill={node.entity.colors}
                  opacity="0.12"
                />

                {/* Núcleo del nodo */}
                <circle
                  className="core"
                  r={node.r}
                  fill="rgba(5, 6, 30, 0.9)"
                  stroke={node.entity.colors}
                  strokeWidth="2"
                  filter="url(#glow)"
                />

                {/* Punto central */}
                <circle
                  r={node.r * 0.32}
                  fill={node.entity.colors}
                />

                {/* Texto de etiqueta */}
                <text
                  y={node.r + 16}
                  textAnchor="middle"
                >
                  {node.entity.name}
                </text>

                {/* Texto de categoría */}
                <text
                  className="sub"
                  y={node.r + 28}
                  textAnchor="middle"
                >
                  {node.entity.primaryLabel.toUpperCase()}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Widgets informativos HUD en las esquinas */}
      <div className="corner-widget cw-tl">
        NODOS: <span id="nodeCount">{layoutNodes.length}</span> &nbsp;|&nbsp; ENLACES: <span id="edgeCount">{graphData.relationships.length}</span>
      </div>
      <div className="corner-widget cw-br">
        SISTEMA: <span style={{ color: 'var(--c300)' }}>ESTABLE</span><br />
        LAT: 42MS &middot; SYNC OK
      </div>
    </div>
  );
}

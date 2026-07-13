import React, { useState } from 'react';
import { HudHeader } from '../components/HudHeader/HudHeader';
import { NetworkGraph } from '../components/NetworkGraph/NetworkGraph';
import { NodeInspector } from '../components/NodeInspector/NodeInspector';
import { TopAptsModal } from '../components/TopApts/TopAptsModal';

export function DashboardPage({
  setShowDashboard,
  graphData,
  loading,
  error,
  selectedNode,
  setSelectedNode,
  searchQuery,
  setSearchQuery,
  filterType,
  setFilterType,
  toastMessage,
  showAPTPanel,
  setShowAPTPanel,
  aptData,
  aptLoading,
  aptError,
  fetchInfrastructure,
  handleReset,
  fetchTopAPTs,
  getNodeCountByType
}) {
  const [activeNav, setActiveNav] = useState('grafo'); // 'grafo', 'inventario', 'redes'

  const categories = [
    { key: 'ALL', label: 'Todos', color: 'var(--c400)' },
    { key: 'Network', label: 'Red / Subred', color: 'var(--c300)' },
    { key: 'Endpoint', label: 'Endpoint', color: 'var(--c500)' },
    { key: 'Hardware', label: 'Hardware', color: 'var(--c800)' },
    { key: 'Project', label: 'Proyecto', color: 'var(--c400)' },
    { key: 'SoftwareInstallation', label: 'Instalación', color: 'var(--c600)' },
    { key: 'Software', label: 'Software', color: 'var(--c300)' },
    { key: 'Finding', label: 'Hallazgo', color: 'var(--c700)' },
    { key: 'Vulnerability', label: 'Vulnerabilidad (CVE)', color: 'var(--c50)' },
    { key: 'Remediation', label: 'Remediación', color: 'var(--c500)' },
  ];

  // Filtrado de nodos para inventario/redes
  const filteredNodes = graphData.nodes.filter(node => {
    const matchesSearch = !searchQuery || node.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = filterType === 'ALL' || node.primaryLabel === filterType;
    return matchesSearch && matchesCat;
  });

  return (
    <div style={{ height: '100vh', width: '100vw', overflow: 'hidden', position: 'relative' }}>
      <div className="grid-overlay"></div>

      {/* HEADER HUD */}
      <HudHeader
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        fetchTopAPTs={fetchTopAPTs}
        setShowDashboard={setShowDashboard}
      />

      <div className="app">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div>
            <p className="eyebrow">Buscar activos</p>
            <input
              id="search"
              type="text"
              placeholder="Ej. tomcat, CVE, red..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div>
            <p className="eyebrow">Filtrar por categoría</p>
            <div id="catList">
              {categories.map(c => (
                <button
                  key={c.key}
                  className={`cat-btn ${filterType === c.key ? 'active' : ''}`}
                  onClick={() => setFilterType(c.key)}
                >
                  <span>{c.label}</span>
                  <span className="count">
                    {c.key === 'ALL' ? graphData.nodes.length : getNodeCountByType(c.key)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="legend">
            <p className="eyebrow" style={{ marginBottom: '12px' }}>Leyenda</p>
            <div id="legendList">
              {categories.slice(1).map(c => (
                <div className="legend-item" key={c.key}>
                  <span
                    className="legend-dot"
                    style={{
                      background: c.color,
                      boxShadow: `0 0 6px ${c.color}`
                    }}
                  />
                  {c.label}
                </div>
              ))}
            </div>
          </div>


        </aside>

        {/* MAIN AREA */}
        <main className="graph-stage">
          {activeNav === 'grafo' && (
            <NetworkGraph
              graphData={graphData}
              filterType={filterType}
              searchQuery={searchQuery}
              loading={loading}
              error={error}
              selectedNode={selectedNode}
              setSelectedNode={setSelectedNode}
              fetchInfrastructure={fetchInfrastructure}
            />
          )}

          {activeNav === 'inventario' && (
            <div style={{ padding: '24px', overflowY: 'auto', height: '100%', fontFamily: 'Share Tech Mono, monospace' }}>
              <h2 className="eyebrow" style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Inventario de Activos</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--c100)', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px', color: 'var(--c400)' }}>ID</th>
                    <th style={{ padding: '8px 12px', color: 'var(--c400)' }}>NOMBRE</th>
                    <th style={{ padding: '8px 12px', color: 'var(--c400)' }}>CATEGORÍA</th>
                    <th style={{ padding: '8px 12px', color: 'var(--c400)' }}>PROPIEDADES</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNodes.map(node => (
                    <tr
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      style={{
                        borderBottom: '1px solid rgba(122, 115, 255, 0.08)',
                        cursor: 'pointer',
                        background: selectedNode && selectedNode.id === node.id ? 'rgba(79, 58, 255, 0.12)' : 'transparent'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(122, 115, 255, 0.05)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = selectedNode && selectedNode.id === node.id ? 'rgba(79, 58, 255, 0.12)' : 'transparent' }}
                    >
                      <td style={{ padding: '10px 12px' }}>{node.id}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>{node.name}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span className="badge" style={{ background: 'transparent', borderColor: node.colors, color: node.colors, fontSize: '9px', padding: '2px 6px', margin: 0 }}>
                          {node.primaryLabel.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--muted)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {Object.entries(node.properties).map(([k, v]) => `${k}:${v}`).join(', ')}
                      </td>
                    </tr>
                  ))}
                  {filteredNodes.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: 'var(--c900)' }}>
                        NO SE ENCONTRARON ACTIVOS
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeNav === 'redes' && (
            <div style={{ padding: '24px', overflowY: 'auto', height: '100%', fontFamily: 'Share Tech Mono, monospace' }}>
              <h2 className="eyebrow" style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Auditoría de Subredes</h2>
              {graphData.nodes.filter(n => n.primaryLabel === 'Network').map(net => {
                // Encontrar endpoints conectados a esta red
                const connectedEndpoints = graphData.relationships
                  .filter(rel => rel.type === 'CONNECTED_TO' && (rel.source === net.id || rel.target === net.id))
                  .map(rel => {
                    const otherId = rel.source === net.id ? rel.target : rel.source;
                    return graphData.nodes.find(n => n.id === otherId);
                  })
                  .filter(n => n && n.primaryLabel === 'Endpoint');

                return (
                  <div key={net.id} style={{ border: '1px solid var(--line)', borderRadius: '8px', padding: '16px', marginBottom: '16px', background: 'rgba(5, 6, 30, 0.4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: '8px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--c100)' }}>{net.name}</span>
                      <span className="badge" style={{ background: 'transparent', borderColor: 'var(--c300)', color: 'var(--c300)' }}>NET ID: {net.id}</span>
                    </div>
                    <div style={{ color: 'var(--muted)', marginBottom: '8px' }}>
                      CIDR: {net.properties.cidr || 'N/A'} | ESTADO: {net.properties.status || 'ACTIVA'}
                    </div>
                    <div style={{ fontSize: '12px' }}>
                      <p className="eyebrow" style={{ fontSize: '9px', color: 'var(--c400)', margin: '8px 0 4px 0' }}>Equipos conectados ({connectedEndpoints.length})</p>
                      {connectedEndpoints.map(ep => (
                        <div
                          key={ep.id}
                          onClick={() => setSelectedNode(ep)}
                          style={{
                            padding: '6px 10px',
                            background: 'rgba(122, 115, 255, 0.05)',
                            borderRadius: '4px',
                            marginBottom: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between'
                          }}
                        >
                          <span>{ep.name}</span>
                          <span style={{ color: ep.properties.risk_tier === 'CRITICAL' ? 'red' : 'var(--muted)' }}>
                            {ep.properties.risk_tier || 'NORMAL'}
                          </span>
                        </div>
                      ))}
                      {connectedEndpoints.length === 0 && (
                        <div style={{ color: 'var(--c900)', fontStyle: 'italic' }}>Ningún equipo detectado en este segmento.</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {toastMessage && (
            <div className="canvas-toast" style={{ bottom: '4rem', background: 'var(--c600)', color: 'white', fontWeight: 'bold' }}>
              {toastMessage}
            </div>
          )}
        </main>

        {/* INSPECTOR */}
        <NodeInspector selectedNode={selectedNode} />
      </div>

      {/* MODAL TOP APTs */}
      <TopAptsModal
        showAPTPanel={showAPTPanel}
        setShowAPTPanel={setShowAPTPanel}
        aptData={aptData}
        aptLoading={aptLoading}
        aptError={aptError}
        fetchTopAPTs={fetchTopAPTs}
      />
    </div>
  );
}

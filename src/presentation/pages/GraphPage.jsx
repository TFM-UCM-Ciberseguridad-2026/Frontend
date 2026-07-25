import React from 'react';
import { NetworkGraph } from '../components/NetworkGraph/NetworkGraph';
import { NodeInspector } from '../components/NodeInspector/NodeInspector';
import { AddAssetsButton } from '../components/AddAssets/AddAssetsButton';
import '../components/AddAssets/AddAssetsButton.css';

export function GraphPage({
  graphData,
  filterType,
  setFilterType,
  searchQuery,
  setSearchQuery,
  selectedNode,
  setSelectedNode,
  loading,
  error,
  fetchInfrastructure,
  fetchTopAPTs,
  categories,
  getNodeCountByType,
  projects,
  endpoints,
  showToast,
  createEndpoint,
  createHardware,
  createSoftware,
  createNetwork
}) {
  return (
    <>
      {/* PANEL IZQUIERDO: FILTROS — grid column 1 (250px) */}
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

      {/* VISTA CENTRAL: GRAFO — grid column 2 (1fr) */}
      <main className="graph-stage">

        <AddAssetsButton
          projects={projects}
          endpoints={endpoints}
          onCreated={() => fetchInfrastructure(true)}
          showToast={showToast}
          createEndpoint={createEndpoint}
          createHardware={createHardware}
          createSoftware={createSoftware}
          createNetwork={createNetwork}
        />

        <NetworkGraph
          graphData={graphData}
          filterType={filterType}
          searchQuery={searchQuery}
          loading={loading}
          error={error}
          selectedNode={selectedNode}
          setSelectedNode={setSelectedNode}
          fetchInfrastructure={fetchInfrastructure}
          fetchTopAPTs={fetchTopAPTs}
        />
      </main>

      {/* PANEL DERECHO: INSPECTOR — grid column 3 (300px) */}
      <NodeInspector selectedNode={selectedNode} />
    </>
  );
}

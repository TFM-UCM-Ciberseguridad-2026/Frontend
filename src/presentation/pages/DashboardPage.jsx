import React, { useState } from 'react';
import { HudHeader } from '../components/HudHeader/HudHeader';
import { NetworkGraph } from '../components/NetworkGraph/NetworkGraph';
import { NodeInspector } from '../components/NodeInspector/NodeInspector';
import { TopAptsModal } from '../components/TopApts/TopAptsModal';
import { AddAssetButton } from '../components/AddAssets/AddAssetsButton';
import { InventoryView } from '../components/InventoryView/InventoryView';
import { NetworksView } from '../components/NetworksView/NetworksView';
import '../components/AddAssets/AddAssetsButton.css';

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
  showToast, // Se añade showToast como prop recibida
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

  // Mapeos de proyectos y endpoints a partir de graphData
  const projects = (graphData?.nodes || [])
    .filter(n => n.labels?.includes('Project') || n.primaryLabel === 'Project')
    .map(n => ({ 
      id: n.properties?.id || n.id, 
      name: n.properties?.name || `Proyecto #${n.properties?.id || n.id}` 
    }));

  const endpoints = (graphData?.nodes || [])
    .filter(n => n.labels?.includes('Endpoint') || n.primaryLabel === 'Endpoint')
    .map(n => ({ 
      id: n.properties?.id || n.id, 
      name: n.properties?.hostname || `Host #${n.properties?.id || n.id}` 
    }));



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
                    {c.key === 'ALL' ? (graphData?.nodes?.length || 0) : getNodeCountByType(c.key)}
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
          {/* Botón para agregar activos dentro del contenedor principal */}
          <AddAssetButton
            projects={projects}
            endpoints={endpoints}
            onCreated={() => fetchInfrastructure(true)}
            showToast={showToast}
          />

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
              fetchTopAPTs={fetchTopAPTs}
            />
          )}

          {activeNav === 'inventario' && (
            <InventoryView
              nodes={graphData?.nodes || []}
              selectedNode={selectedNode}
              setSelectedNode={setSelectedNode}
            />
          )}
          
          {activeNav === 'redes' && (
            <NetworksView
              graphData={graphData}
              setSelectedNode={setSelectedNode}
            />
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
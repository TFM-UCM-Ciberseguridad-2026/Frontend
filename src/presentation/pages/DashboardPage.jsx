import React, { useState } from 'react';
import { HudHeader } from '../components/HudHeader/HudHeader';
import { TopAptsModal } from '../components/TopApts/TopAptsModal';
import { GraphPage } from './GraphPage';
import { InventoryPage } from './InventoryPage';
import { NetworksPage } from './NetworksPage';

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
  getNodeCountByType,
  projects,
  selectedProjectId,
  setSelectedProjectId
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

  return (
    <div style={{ height: '100vh', width: '100vw', overflow: 'hidden', position: 'relative' }}>
      <div className="grid-overlay"></div>

      {/* HEADER HUD */}
      <HudHeader
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        fetchTopAPTs={fetchTopAPTs}
        setShowDashboard={setShowDashboard}
        projects={projects}
        selectedProjectId={selectedProjectId}
        setSelectedProjectId={setSelectedProjectId}
      />

      <div className="app">
        {activeNav === 'grafo' && (
          <GraphPage
            graphData={graphData}
            filterType={filterType}
            setFilterType={setFilterType}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedNode={selectedNode}
            setSelectedNode={setSelectedNode}
            loading={loading}
            error={error}
            fetchInfrastructure={fetchInfrastructure}
            fetchTopAPTs={fetchTopAPTs}
            categories={categories}
            getNodeCountByType={getNodeCountByType}
          />
        )}

        {activeNav === 'inventario' && (
          <InventoryPage
            graphData={graphData}
            categories={categories}
          />
        )}

        {activeNav === 'redes' && (
          <NetworksPage
            graphData={graphData}
            categories={categories}
          />
        )}

        {toastMessage && (
          <div className="canvas-toast" style={{ bottom: '4rem', background: 'var(--c600)', color: 'white', fontWeight: 'bold' }}>
            {toastMessage}
          </div>
        )}
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
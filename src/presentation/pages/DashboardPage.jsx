import React, { useState } from 'react';
import { HudHeader } from '../components/HudHeader/HudHeader';
import { TopAptsModal } from '../components/TopApts/TopAptsModal';
import { ExploitationPathsModal } from '../components/ExploitationPaths/ExploitationPathsModal';
import { GraphPage } from './GraphPage';
import { InventoryPage } from './InventoryPage';
import { NetworksPage } from './NetworksPage';
import { TtpsPage } from './TtpsPage';
import { ExportModal } from '../components/Archive/ExportModal';
import { ImportModal } from '../components/Archive/ImportModal';

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
  showToast,
  showAPTPanel,
  setShowAPTPanel,
  aptData,
  aptLoading,
  aptError,
  fetchInfrastructure,
  handleReset,
  fetchTopAPTs,
  // Rutas de explotación
  showPathsModal,
  setShowPathsModal,
  exploitationPaths,
  pathsLoading,
  pathsError,
  selectedExploitationPath,
  fetchExploitationPaths,
  selectExploitationPath,
  clearSelectedExploitationPath,
  getNodeCountByType,
  projects,
  selectedProjectId,
  setSelectedProjectId,
  createEndpoint,
  createHardware,
  createSoftware,
  createNetwork,
  updateNode,
  deleteNode,
  exportProject,
  exportMitreNavigator,
  exportInventory,
  importProject,
  // Risk Analysis
  riskActionLoading,
  analyzeProjectVulnerabilities,
  computeSelectedProjectRisk,
  selectedProjectNode
}) {
  const [activeNav, setActiveNav] = useState('grafo'); // 'grafo', 'inventario', 'redes'
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
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

  const endpoints = (graphData?.nodes || [])
    .filter(n => n.labels?.includes('Endpoint') || n.primaryLabel === 'Endpoint')
    .map(n => ({ 
      id: n.properties?.id ?? n.id, 
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
        projects={projects}
        selectedProjectId={selectedProjectId}
        setSelectedProjectId={setSelectedProjectId}
        onOpenExport={() => setShowExportModal(true)}
        onOpenImport={() => setShowImportModal(true)}
        selectedProjectNode={selectedProjectNode}
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
            fetchExploitationPaths={fetchExploitationPaths}
            selectedExploitationPath={selectedExploitationPath}
            clearSelectedExploitationPath={clearSelectedExploitationPath}
            categories={categories}
            getNodeCountByType={getNodeCountByType}
            projects={projects}
            endpoints={endpoints}
            showToast={showToast}
            createEndpoint={createEndpoint}
            createHardware={createHardware}
            createSoftware={createSoftware}
            createNetwork={createNetwork}
            updateNode={updateNode}
            deleteNode={deleteNode}
            riskActionLoading={riskActionLoading}
            analyzeProjectVulnerabilities={analyzeProjectVulnerabilities}
            computeSelectedProjectRisk={computeSelectedProjectRisk}
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

        {activeNav === 'ttps' && (
          <TtpsPage
            graphData={graphData}
            showToast={showToast}
          />
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
        onSelectTTP={(ttpId) => {
          setShowAPTPanel(false);
          setActiveNav('grafo');
          setSearchQuery?.(ttpId);

          const q = (ttpId || '').toLowerCase().trim();
          const targetNode = (graphData?.nodes || []).find(n => {
            const p = n.properties || {};
            const ttps = Array.isArray(p.ttps) ? p.ttps.join(' ').toLowerCase() : String(p.ttps || '').toLowerCase();
            const propsStr = JSON.stringify(p).toLowerCase();
            return ttps.includes(q) || propsStr.includes(q) || String(n.id).toLowerCase() === q || (n.name || '').toLowerCase().includes(q);
          });

          if (targetNode) {
            setSelectedNode(targetNode);
            showToast?.(`TTP enfocada: ${ttpId}`, 'info');
          } else {
            showToast?.(`Filtrando TTP: ${ttpId}`, 'info');
          }
        }}
      />

      {/* MODAL RUTAS DE EXPLOTACIÓN */}
      <ExploitationPathsModal
        showPathsModal={showPathsModal}
        setShowPathsModal={setShowPathsModal}
        exploitationPaths={exploitationPaths}
        pathsLoading={pathsLoading}
        pathsError={pathsError}
        fetchExploitationPaths={fetchExploitationPaths}
        selectedExploitationPath={selectedExploitationPath}
        selectExploitationPath={selectExploitationPath}
        clearSelectedExploitationPath={clearSelectedExploitationPath}
      />
      {/* MODAL EXPORTAR ARCHIVE */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onExportProject={(targetProjectId) => exportProject(targetProjectId)}
        onExportMitre={(targetProjectId) => exportMitreNavigator(targetProjectId)}
        onExportInventory={(targetProjectId) => exportInventory(targetProjectId)}
      />

      {/* MODAL IMPORTAR ARCHIVE */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        projects={projects}
        onImport={(fileContent, options) => importProject(fileContent, options)}
      />
    </div>
  );
}
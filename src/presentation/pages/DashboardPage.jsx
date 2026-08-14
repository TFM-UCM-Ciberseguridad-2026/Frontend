import React, { useState } from 'react';
import { HudHeader } from '../components/HudHeader/HudHeader';
import { TopAptsModal } from '../components/TopApts/TopAptsModal';
import { ExploitationPathsModal } from '../components/ExploitationPaths/ExploitationPathsModal';
import { FindingVulnerabilitiesModal } from '../components/FindingVulnerabilities/FindingVulnerabilitiesModal';
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
  createContainer,
  createHardware,
  createSoftware,
  createContainerSoftware,
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
  selectedProjectNode,
  // CVEs de un Finding
  fetchFindingVulnerabilities,
  closeFindingVulnsModal,
  showFindingVulnsModal,
  findingVulnsData,
  findingVulnsLoading,
  findingVulnsError,
  findingVulnsSourceNode
}) {
  const [activeNav, setActiveNav] = useState('grafo'); // 'grafo', 'inventario', 'redes'
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const categories = [
    { key: 'ALL', label: 'Todos', color: '#7973FF' },
    { key: 'Network', label: 'Red / Subred', color: '#7973FF' },
    { key: 'Endpoint', label: 'Endpoint', color: '#FFFFFF' },
    { key: 'Hardware', label: 'Hardware', color: '#A5A5FF' },
    { key: 'Project', label: 'Proyecto', color: '#4D3BFF' },
    { key: 'SoftwareInstallation', label: 'Instalación', color: '#3813FF' },
    { key: 'Software', label: 'Software', color: '#CDCFFF' },
    { key: 'Finding', label: 'Hallazgo', color: '#ef4444' },
    { key: 'Remediation', label: 'Remediación', color: '#2701D6' },
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
            createContainer={createContainer}
            createHardware={createHardware}
            createSoftware={createSoftware}
            createContainerSoftware={createContainerSoftware}
            createNetwork={createNetwork}
            updateNode={updateNode}
            deleteNode={deleteNode}
            riskActionLoading={riskActionLoading}
            analyzeProjectVulnerabilities={analyzeProjectVulnerabilities}
            computeSelectedProjectRisk={computeSelectedProjectRisk}
            fetchFindingVulnerabilities={fetchFindingVulnerabilities}
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

      {/* MODAL VER CVEs DE UN FINDING */}
      <FindingVulnerabilitiesModal
        showFindingVulnsModal={showFindingVulnsModal}
        closeFindingVulnsModal={closeFindingVulnsModal}
        findingVulnsData={findingVulnsData}
        findingVulnsLoading={findingVulnsLoading}
        findingVulnsError={findingVulnsError}
        findingVulnsSourceNode={findingVulnsSourceNode}
        fetchFindingVulnerabilities={fetchFindingVulnerabilities}
      />
    </div>
  );
}
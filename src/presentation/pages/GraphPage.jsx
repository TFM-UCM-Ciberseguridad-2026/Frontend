import React from 'react';
import { NetworkGraph } from '../components/NetworkGraph/NetworkGraph';
import { NodeInspector } from '../components/NodeInspector/NodeInspector';
import { GraphFilterSidebar } from '../components/NetworkGraph/GraphFilterSidebar';
import { AddAssetsButton } from '../components/AddAssets/AddAssetsButton';
import '../components/AddAssets/AddAssetsButton.css';

export function GraphPage({
  graphData,
  filterType,
  setFilterType,
  searchQuery,
  setSearchQuery,
  graphAdvancedFilters,
  updateGraphAdvancedFilter,
  clearGraphAdvancedFilters,
  selectedNode,
  setSelectedNode,
  loading,
  error,
  fetchInfrastructure,
  fetchTopAPTs,
  fetchExploitationPaths,
  selectedExploitationPath,
  clearSelectedExploitationPath,
  categories,
  getNodeCountByType,
  projects,
  endpoints,
  containers,
  networks,
  showToast,
  createEndpoint,
  createContainer,
  createHardware,
  createSoftware,
  createContainerSoftware,
  createNetwork,
  updateNode,
  deleteNode,
  renameProject,
  deleteProject,
  vulnScanLoading,
  vulnScanProgress,
  riskComputeLoading,
  analyzeProjectVulnerabilities,
  computeSelectedProjectRisk,
  fetchFindingVulnerabilities,
  fetchEndpointPatchHistory
}) {
  return (
    <>
      {/* PANEL IZQUIERDO: FILTROS COMPACTOS Y AVANZADOS */}
      <GraphFilterSidebar
        graphData={graphData}
        filterType={filterType}
        setFilterType={setFilterType}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        graphAdvancedFilters={graphAdvancedFilters}
        updateGraphAdvancedFilter={updateGraphAdvancedFilter}
        clearGraphAdvancedFilters={clearGraphAdvancedFilters}
        categories={categories}
        getNodeCountByType={getNodeCountByType}
        fetchExploitationPaths={fetchExploitationPaths}
        selectedExploitationPath={selectedExploitationPath}
        clearSelectedExploitationPath={clearSelectedExploitationPath}
        vulnScanLoading={vulnScanLoading}
        vulnScanProgress={vulnScanProgress}
        riskComputeLoading={riskComputeLoading}
        analyzeProjectVulnerabilities={analyzeProjectVulnerabilities}
        computeSelectedProjectRisk={computeSelectedProjectRisk}
      />

      {/* VISTA CENTRAL: GRAFO */}
      <main className="graph-stage">
        <AddAssetsButton
          projects={projects}
          endpoints={endpoints}
          containers={containers}
          networks={networks}
          onCreated={() => fetchInfrastructure(true)}
          showToast={showToast}
          createEndpoint={createEndpoint}
          createContainer={createContainer}
          createHardware={createHardware}
          createSoftware={createSoftware}
          createContainerSoftware={createContainerSoftware}
          createNetwork={createNetwork}
        />

        <NetworkGraph
          graphData={graphData}
          filterType={filterType}
          searchQuery={searchQuery}
          graphAdvancedFilters={graphAdvancedFilters}
          loading={loading}
          error={error}
          selectedNode={selectedNode}
          setSelectedNode={setSelectedNode}
          fetchInfrastructure={fetchInfrastructure}
          fetchTopAPTs={fetchTopAPTs}
          selectedExploitationPath={selectedExploitationPath}
          clearSelectedExploitationPath={clearSelectedExploitationPath}
        />
      </main>

      {/* PANEL DERECHO: INSPECTOR */}
      <NodeInspector
        selectedNode={selectedNode}
        updateNode={updateNode}
        deleteNode={deleteNode}
        fetchFindingVulnerabilities={fetchFindingVulnerabilities}
        selectedExploitationPath={selectedExploitationPath}
        renameProject={renameProject}
        deleteProject={deleteProject}
        fetchEndpointPatchHistory={fetchEndpointPatchHistory}
        nodes={graphData?.nodes || []}
      />
    </>
  );
}
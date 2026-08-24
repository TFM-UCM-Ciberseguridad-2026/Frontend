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
  riskComputeLoading,
  analyzeProjectVulnerabilities,
  computeSelectedProjectRisk,
  fetchFindingVulnerabilities,
  isAnalysisPending
}) {
  return (
    <>
      {/* PANEL IZQUIERDO: FILTROS COMPACTOS */}
      <GraphFilterSidebar
        graphData={graphData}
        filterType={filterType}
        setFilterType={setFilterType}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        categories={categories}
        getNodeCountByType={getNodeCountByType}
        fetchExploitationPaths={fetchExploitationPaths}
        selectedExploitationPath={selectedExploitationPath}
        clearSelectedExploitationPath={clearSelectedExploitationPath}
        vulnScanLoading={vulnScanLoading}
        riskComputeLoading={riskComputeLoading}
        analyzeProjectVulnerabilities={analyzeProjectVulnerabilities}
        computeSelectedProjectRisk={computeSelectedProjectRisk}
        isAnalysisPending={isAnalysisPending}
      />

      {/* VISTA CENTRAL: GRAFO */}
      <main className="graph-stage">

        <AddAssetsButton
          projects={projects}
          endpoints={endpoints}
          containers={containers}
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
      />
    </>
  );
}
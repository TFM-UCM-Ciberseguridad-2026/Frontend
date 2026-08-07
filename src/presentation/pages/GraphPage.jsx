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
  showToast,
  createEndpoint,
  createHardware,
  createSoftware,
  createNetwork,
  updateNode,
  deleteNode,
  riskActionLoading,
  analyzeProjectVulnerabilities,
  computeSelectedProjectRisk,
  fetchFindingVulnerabilities
}) {
  return (
    <>
      {/* PANEL IZQUIERDO: FILTROS COMPACTOS — grid column 1 (250px) */}
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
        riskActionLoading={riskActionLoading}
        analyzeProjectVulnerabilities={analyzeProjectVulnerabilities}
        computeSelectedProjectRisk={computeSelectedProjectRisk}
      />

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
          selectedExploitationPath={selectedExploitationPath}
          clearSelectedExploitationPath={clearSelectedExploitationPath}
        />
      </main>


      {/* PANEL DERECHO: INSPECTOR — grid column 3 (300px) */}
      <NodeInspector selectedNode={selectedNode} updateNode={updateNode} deleteNode={deleteNode} fetchFindingVulnerabilities={fetchFindingVulnerabilities} />
    </>
  );
}

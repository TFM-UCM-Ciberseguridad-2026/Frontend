import React, { useState } from 'react';
import { NetworksView } from '../components/NetworksView/NetworksView';
import { NodeInspector } from '../components/NodeInspector/NodeInspector';

export function NetworksPage({
  graphData,
  updateNode,
  deleteNode,
  renameProject,
  deleteProject,
  fetchFindingVulnerabilities,
  fetchEndpointPatchHistory,
  selectedExploitationPath
}) {
  const [selectedNode, setSelectedNode] = useState(null);

  return (
    <>
      {/* VISTA CENTRAL: AUDITORÍA DE SUBREDES — ocupa columnas 1 y 2 (1 / 3) */}
      <main className="graph-stage" style={{ gridColumn: '1 / 3' }}>
        <NetworksView
          graphData={graphData}
          setSelectedNode={setSelectedNode}
        />
      </main>

      {/* PANEL DERECHO: INSPECTOR DE NODO (UNIFICADO CON GRAFO E INVENTARIO) */}
      <NodeInspector
        selectedNode={selectedNode}
        updateNode={updateNode}
        deleteNode={deleteNode}
        renameProject={renameProject}
        deleteProject={deleteProject}
        fetchFindingVulnerabilities={fetchFindingVulnerabilities}
        fetchEndpointPatchHistory={fetchEndpointPatchHistory}
        selectedExploitationPath={selectedExploitationPath}
        nodes={graphData?.nodes || []}
      />
    </>
  );
}

export class ExportProjectUseCase {
  /**
   * Genera la estructura JSON descargable de un proyecto para reimportar.
   * @param {Object} graphData - Grafo de infraestructura ({ nodes: [], relationships: [] })
   * @param {string|number} selectedProjectId - ID del proyecto seleccionado
   * @returns {Object} Fichero JSON con formato nativo de exportación
   */
  execute(graphData, selectedProjectId) {
    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
      throw new Error('No hay nodos de infraestructura para exportar.');
    }

    // Buscar el nodo del proyecto
    const projectNode = graphData.nodes.find(
      n => (n.labels?.includes('Project') || n.primaryLabel === 'Project') &&
          String(n.properties?.id ?? n.id) === String(selectedProjectId)
    ) || graphData.nodes.find(n => n.labels?.includes('Project') || n.primaryLabel === 'Project');

    const projectName = projectNode?.properties?.nombre || projectNode?.properties?.name || 'Proyecto';
    const projectId = projectNode?.properties?.id ?? selectedProjectId ?? '1';

    // Construir la estructura exportable
    const exportObject = {
      format: 'orquestador_infrastructure_export',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      project: {
        id: projectId,
        name: projectName
      },
      nodes: graphData.nodes,
      relationships: graphData.relationships || []
    };

    return {
      filename: `${projectName.toLowerCase().replace(/[^a-z0-9]/gi, '_')}_export.json`,
      content: JSON.stringify(exportObject, null, 2)
    };
  }
}

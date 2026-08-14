export class ExportProjectUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  /**
   * Obtiene la estructura JSON descargable de un proyecto exportado nativamente desde Neo4j.
   * @param {string|number} selectedProjectId - ID del proyecto seleccionado
   * @param {string} projectName - Nombre actual del proyecto (para el nombre del archivo)
   * @returns {Object} Fichero JSON con formato nativo de exportación
   */
  async execute(selectedProjectId, projectName = 'Proyecto') {
    if (!selectedProjectId) {
      throw new Error('No se ha seleccionado ningún proyecto para exportar.');
    }

    // Pide al backend el grafo inmaculado sin filtros gráficos (con IPs)
    const exportData = await this.infrastructureRepository.exportProject(selectedProjectId);

    if (!exportData || !exportData.nodes) {
      throw new Error('El backend ha devuelto un formato de exportación inválido o vacío.');
    }

    // Construir la estructura exportable con los metadatos
    const exportObject = {
      format: 'orquestador_infrastructure_export',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      project: {
        id: selectedProjectId,
        name: projectName
      },
      nodes: exportData.nodes || [],
      relationships: exportData.relationships || []
    };

    return {
      filename: `${projectName.replace(/[^\w\sáéíóúÁÉÍÓÚñÑ-]/gi, '_').replace(/\s+/g, '_')}_export.json`,
      content: JSON.stringify(exportObject, null, 2)
    };
  }
}


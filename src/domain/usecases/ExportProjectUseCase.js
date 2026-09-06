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

    const nodes = exportData.nodes || [];
    const relationships = exportData.relationships || [];

    // Recuento por etiqueta: permite comprobar de un vistazo qué se ha llevado el fichero,
    // sin abrir los miles de nodos que puede contener.
    const resumen = {};
    nodes.forEach(n => {
      const label = (n.labels || []).find(l => l !== 'BaseNode' && l !== 'Persistable') || 'Unknown';
      resumen[label] = (resumen[label] || 0) + 1;
    });

    // Construir la estructura exportable con los metadatos
    const exportObject = {
      format: 'orquestador_infrastructure_export',
      // 1.1 incorpora el marco de gobierno (PolicyDocument, Procedure, Role, RACIActivity y
      // SLAConfig) junto a la infraestructura. Los ficheros 1.0 siguen importándose: la
      // diferencia es qué contienen, no cómo se leen.
      version: '1.1',
      exportedAt: new Date().toISOString(),
      project: {
        id: selectedProjectId,
        name: projectName
      },
      summary: {
        totalNodes: nodes.length,
        totalRelationships: relationships.length,
        byLabel: resumen
      },
      nodes,
      relationships
    };

    return {
      filename: `${projectName.replace(/[^\w\sáéíóúÁÉÍÓÚñÑ-]/gi, '_').replace(/\s+/g, '_')}_export.json`,
      content: JSON.stringify(exportObject, null, 2)
    };
  }
}


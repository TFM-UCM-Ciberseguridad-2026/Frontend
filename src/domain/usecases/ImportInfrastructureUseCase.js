export class ImportInfrastructureUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  /**
   * Valida e importa un archivo JSON de infraestructura.
   * @param {string|Object} fileData - Contenido del JSON importado
   * @returns {Promise<Object>} Resultado de la importación
   */
  async execute(fileData) {
    let parsed;
    if (typeof fileData === 'string') {
      try {
        parsed = JSON.parse(fileData);
      } catch (err) {
        throw new Error('El archivo no contiene un formato JSON válido.');
      }
    } else {
      parsed = fileData;
    }

    if (!parsed || (typeof parsed !== 'object')) {
      throw new Error('Formato de datos de importación inválido.');
    }

    // Normalizar la estructura si viene de exportación nativa u otro formato
    let graphToImport = { nodes: [], relationships: [] };

    if (Array.isArray(parsed.nodes)) {
      graphToImport.nodes = parsed.nodes;
      graphToImport.relationships = Array.isArray(parsed.relationships) ? parsed.relationships : [];
    } else if (parsed.graphData && Array.isArray(parsed.graphData.nodes)) {
      graphToImport.nodes = parsed.graphData.nodes;
      graphToImport.relationships = Array.isArray(parsed.graphData.relationships) ? parsed.graphData.relationships : [];
    } else {
      throw new Error('El archivo JSON no contiene un campo "nodes" válido para importar la infraestructura.');
    }

    if (graphToImport.nodes.length === 0) {
      throw new Error('El archivo JSON no contiene ningún nodo de infraestructura.');
    }

    return await this.infrastructureRepository.importInfrastructure(graphToImport);
  }
}

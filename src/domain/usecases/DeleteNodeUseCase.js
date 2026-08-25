export class DeleteNodeUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute(category, id, justification = '') {
    if (!id) {
      throw new Error('ID de activo no válido para eliminación.');
    }
    if (!justification || justification.trim() === '') {
      throw new Error('El motivo/justificación de eliminación es obligatorio.');
    }

    const cat = (category || '').toLowerCase();
    const cleanJustification = justification.trim();

    if (cat.includes('project') || cat === 'proyecto') {
      return await this.infrastructureRepository.deleteProject(id, cleanJustification);
    } else if (cat.includes('endpoint') || cat === 'servidor' || cat === 'server') {
      return await this.infrastructureRepository.deleteEndpoint(id, cleanJustification);
    } else if (cat.includes('network') || cat === 'red' || cat === 'vlan') {
      return await this.infrastructureRepository.deleteNetwork(id, cleanJustification);
    } else if (cat.includes('hardware') || cat === 'hw') {
      return await this.infrastructureRepository.deleteHardware(id, cleanJustification);
    } else if (cat.includes('installation') || cat === 'instalacion' || cat === 'softwareinstallation') {
      return await this.infrastructureRepository.deleteSoftwareInstallation(id, cleanJustification);
    } else if (cat.includes('software') || cat === 'sw') {
      return await this.infrastructureRepository.deleteSoftware(id, cleanJustification);
    } else if (cat.includes('container') || cat === 'contenedor') {
      return await this.infrastructureRepository.deleteContainer(id, cleanJustification);
    } else {
      // Borrado genérico para otros tipos de nodos
      return await this.infrastructureRepository.deleteNode(id, cleanJustification);
    }
  }
}
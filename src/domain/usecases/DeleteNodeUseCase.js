export class DeleteNodeUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute(category, id) {
    if (!id) {
      throw new Error('ID de activo no válido para eliminación.');
    }
    const cat = (category || '').toLowerCase();
    if (cat.includes('project') || cat === 'proyecto') {
      return await this.infrastructureRepository.deleteProject(id);
    } else if (cat.includes('endpoint') || cat === 'servidor' || cat === 'server') {
      return await this.infrastructureRepository.deleteEndpoint(id);
    } else if (cat.includes('network') || cat === 'red' || cat === 'vlan') {
      return await this.infrastructureRepository.deleteNetwork(id);
    } else if (cat.includes('hardware') || cat === 'hw') {
      return await this.infrastructureRepository.deleteHardware(id);
    } else if (cat.includes('installation') || cat === 'instalacion' || cat === 'softwareinstallation') {
      return await this.infrastructureRepository.deleteSoftwareInstallation(id);
    } else if (cat.includes('software') || cat === 'sw') {
      return await this.infrastructureRepository.deleteSoftware(id);
    } else {
      // Para cualquier otro tipo (Hallazgos, Vulnerabilidades, TTPs, etc.), usamos el borrado genérico
      return await this.infrastructureRepository.deleteNode(id);
    }
  }
}

export class CreateEndpointUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute(projectId, endpointData) {
    if (!projectId) {
      throw new Error('Selecciona un proyecto.');
    }
    if (!endpointData.hostname) {
      throw new Error('El hostname es obligatorio.');
    }
    return await this.infrastructureRepository.createEndpoint(projectId, endpointData);
  }
}

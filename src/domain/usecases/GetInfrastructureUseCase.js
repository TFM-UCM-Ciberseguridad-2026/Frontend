export class GetInfrastructureUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute(projectId) {
    return await this.infrastructureRepository.getInfrastructure(projectId);
  }
}

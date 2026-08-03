export class ComputeProjectRiskUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute(projectId) {
    if (!projectId) {
      throw new Error('Selecciona un proyecto.');
    }
    return await this.infrastructureRepository.computeProjectRisk(projectId);
  }
}
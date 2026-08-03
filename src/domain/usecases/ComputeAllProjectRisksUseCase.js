export class ComputeAllProjectRisksUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute() {
    return await this.infrastructureRepository.computeAllProjectRisks();
  }
}
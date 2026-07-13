export class PopulateInfrastructureUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute() {
    return await this.infrastructureRepository.populateInfrastructure();
  }
}

export class GetInfrastructureUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute() {
    return await this.infrastructureRepository.getInfrastructure();
  }
}

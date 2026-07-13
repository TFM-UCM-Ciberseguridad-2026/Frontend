export class GetTopAptsUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute() {
    return await this.infrastructureRepository.getTopApts();
  }
}

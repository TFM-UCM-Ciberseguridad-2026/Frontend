export class GetTopAptsUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute(projectId) {
    return await this.infrastructureRepository.getTopApts(projectId);
  }
}

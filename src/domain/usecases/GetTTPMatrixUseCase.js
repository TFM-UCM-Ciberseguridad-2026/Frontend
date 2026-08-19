export class GetTTPMatrixUseCase {
  constructor(repository) {
    this.repository = repository;
  }

  async execute(projectId) {
    return await this.repository.getTTPMatrix(projectId);
  }
}


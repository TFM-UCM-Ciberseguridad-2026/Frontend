export class CreateProjectUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute(projectData) {
    if (!projectData?.name) {
      throw new Error('El nombre del proyecto es obligatorio.');
    }

    return await this.infrastructureRepository.createProject(projectData);
  }
}
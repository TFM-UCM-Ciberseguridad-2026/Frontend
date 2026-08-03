export class CreateProjectUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute(projectData) {
    const nombre = projectData.nombre || projectData.name;
    if (!nombre) {
      throw new Error('El nombre del proyecto es obligatorio.');
    }

    return await this.infrastructureRepository.createProject(projectData);
  }
}
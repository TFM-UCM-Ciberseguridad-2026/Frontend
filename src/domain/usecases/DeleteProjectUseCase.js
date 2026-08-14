export class DeleteProjectUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute(projectId) {
    if (!projectId) {
      throw new Error("Se requiere un ID de proyecto");
    }
    return await this.infrastructureRepository.deleteProject(projectId);
  }
}

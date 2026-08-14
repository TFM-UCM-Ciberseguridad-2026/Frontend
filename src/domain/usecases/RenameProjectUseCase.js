export class RenameProjectUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute(projectId, newName) {
    if (!projectId || !newName) {
      throw new Error("Se requiere un ID de proyecto y un nuevo nombre");
    }
    return await this.infrastructureRepository.renameProject(projectId, newName);
  }
}

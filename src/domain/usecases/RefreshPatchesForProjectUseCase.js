export class RefreshPatchesForProjectUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute(projectId, options = {}) {
    if (!projectId) {
      throw new Error('projectId es obligatorio para refrescar patches del proyecto');
    }

    return await this.infrastructureRepository.refreshPatchesForProject(projectId, options);
  }
}

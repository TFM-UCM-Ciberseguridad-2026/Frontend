export class GetAppliedPatchHistoryUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute(installationId) {
    if (!installationId) {
      throw new Error('installation_id es obligatorio');
    }

    const result = await this.infrastructureRepository.getAppliedPatchHistory(installationId);
    return result?.applied_patches || [];
  }
}
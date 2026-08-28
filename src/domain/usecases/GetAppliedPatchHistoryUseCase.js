export class GetAppliedPatchHistoryUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute(assetId, assetType) {
    if (!assetId) {
      throw new Error('asset_id es obligatorio');
    }

    const result = await this.infrastructureRepository.getAppliedPatchHistory(assetId, assetType);
    return result?.applied_patches || [];
  }
}

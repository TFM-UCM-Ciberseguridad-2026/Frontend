export class GetAppliedPatchHistoryUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute(assetId, assetType) {
    if (!assetId) {
      throw new Error('asset_id es obligatorio');
    }

    const result = await this.infrastructureRepository.getAppliedPatchHistory(assetId, assetType);
    if (assetType === 'ENDPOINT') {
      const groups = result?.software_groups || [];
      const allPatches = [];
      groups.forEach(g => {
        (g.applied_patches || []).forEach(p => {
          allPatches.push({ ...p, software_name: g.software_name || p.software_name });
        });
        (g.resolved_findings || []).forEach(f => {
          if (!allPatches.some(p => p.cve_id === f.cve_id)) {
            allPatches.push({ ...f, software_name: g.software_name || f.software_name });
          }
        });
      });
      return allPatches;
    }
    return result?.applied_patches || (Array.isArray(result) ? result : []);
  }
}

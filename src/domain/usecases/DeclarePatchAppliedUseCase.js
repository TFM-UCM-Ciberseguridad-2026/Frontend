export class DeclarePatchAppliedUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute(assetId, payload) {
    if (!assetId) {
      throw new Error('asset_id es obligatorio');
    }

    if (!payload?.cve_id) {
      throw new Error('cve_id es obligatorio');
    }

    if (!payload?.remediation_level) {
      throw new Error('remediation_level es obligatorio');
    }

    if (payload.asset_type === 'CONTAINER' && (!payload.finding_id || Number(payload.finding_id) <= 0)) {
      throw new Error('finding_id es obligatorio para remediaciones contextuales de contenedor');
    }

    return await this.infrastructureRepository.declarePatchApplied(assetId, payload);
  }
}

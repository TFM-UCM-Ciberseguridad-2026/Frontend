export class DeclarePatchAppliedUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute(installationId, payload) {
    if (!installationId) {
      throw new Error('installation_id es obligatorio');
    }

    if (!payload?.cve_id) {
      throw new Error('cve_id es obligatorio');
    }

    if (!payload?.remediation_level) {
      throw new Error('remediation_level es obligatorio');
    }

    return await this.infrastructureRepository.declarePatchApplied(installationId, payload);
  }
}
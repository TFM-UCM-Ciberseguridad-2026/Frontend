export class ScanInstallationVulnerabilitiesUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute(installationId, softwareId, options = {}) {
    if (!installationId) {
      throw new Error('Installation ID is required.');
    }
    if (!softwareId) {
      throw new Error('Software ID is required.');
    }
    return await this.infrastructureRepository.scanInstallationVulnerabilities(installationId, softwareId, options);
  }
}

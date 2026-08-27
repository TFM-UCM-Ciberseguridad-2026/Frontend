export class ScanContainerImageVulnerabilitiesUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute(imageId, imageName, options = {}) {
    if (!imageId) {
      throw new Error('El imageId es requerido para el escaneo.');
    }
    return await this.infrastructureRepository.scanContainerImageVulnerabilities(imageId, imageName, options);
  }
}

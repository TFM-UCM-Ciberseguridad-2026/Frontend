export class GetFindingVulnerabilitiesUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute(findingId) {
    if (!findingId) {
      throw new Error('ID de finding requerido.');
    }
    return await this.infrastructureRepository.getFindingVulnerabilities(findingId);
  }
}
export class CreateSoftwareUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute(endpointId, softwareFormData) {
    if (!endpointId) {
      throw new Error('Selecciona un endpoint.');
    }
    if (!softwareFormData.name) {
      throw new Error('El nombre del software es obligatorio.');
    }

    const {
      install_path,
      status,
      criticality_level,
      release_date,
      ...softwareFields
    } = softwareFormData;

    const softwarePayload = { ...softwareFields };
    if (release_date) {
      softwarePayload.release_date = `${release_date}T00:00:00Z`;
    }

    const payload = {
      software: softwarePayload,
      installation: {
        install_path,
        status,
        criticality_level: criticality_level || 'STANDARD'
      }
    };

    return await this.infrastructureRepository.createSoftware(endpointId, payload);
  }
}

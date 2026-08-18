export class CreateContainerSoftwareUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute(containerId, softwareFormData) {
    if (!containerId) {
      throw new Error("El ID del contenedor es obligatorio para registrar software.");
    }
    if (!softwareFormData.name) {
      throw new Error("El nombre del software es obligatorio.");
    }

    let {
      install_path,
      status,
      criticality_level,
      release_date,
      ...softwareFields
    } = softwareFormData;

    if (softwareFields.version) {
      softwareFields.version = softwareFields.version.replace(/^(versi[oó]n|v)[\s:]*/i, '').trim();
    }

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

    return await this.infrastructureRepository.createContainerSoftware(containerId, payload);
  }
}

export class CreateContainerSoftwareUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute(containerId, payload) {
    if (!containerId) {
      throw new Error("El ID del contenedor es obligatorio para registrar software.");
    }
    if (!payload.software || !payload.software.name) {
      throw new Error("El nombre del software es obligatorio.");
    }
    return await this.infrastructureRepository.createContainerSoftware(containerId, payload);
  }
}

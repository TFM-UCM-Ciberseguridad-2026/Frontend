export class CreateHardwareUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute(endpointId, hardwareData) {
    if (!endpointId) {
      throw new Error('Selecciona un endpoint.');
    }
    if (!hardwareData.modelo) {
      throw new Error('El modelo es obligatorio.');
    }
    if (!hardwareData.manufacturer) {
      throw new Error('El fabricante es obligatorio.');
    }

    const payload = {
      ...hardwareData,
      ram_gb: hardwareData.ram_gb === '' || hardwareData.ram_gb === undefined ? 0 : Number(hardwareData.ram_gb),
      storage_gb: hardwareData.storage_gb === '' || hardwareData.storage_gb === undefined ? 0 : Number(hardwareData.storage_gb)
    };

    return await this.infrastructureRepository.createHardware(endpointId, payload);
  }
}

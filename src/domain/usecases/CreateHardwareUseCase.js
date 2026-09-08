import { validateHardwareForm, normalizeHardwarePayload } from '../entities/hardwareValidation';

export class CreateHardwareUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute(endpointId, hardwareData) {
    if (!endpointId) {
      throw new Error('Selecciona un endpoint.');
    }

    // Una sola fuente de reglas, la misma que aplica el backend: basta con el fabricante o
    // el modelo, y las magnitudes tienen que ser posibles.
    const error = validateHardwareForm(hardwareData);
    if (error) {
      throw new Error(error);
    }

    return await this.infrastructureRepository.createHardware(
      endpointId,
      normalizeHardwarePayload(hardwareData)
    );
  }
}

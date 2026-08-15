export class CreateContainerUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute(endpointId, payload) {
    if (!endpointId) {
      throw new Error("El ID del endpoint es obligatorio para crear un contenedor.");
    }
    if (!payload.name) {
      throw new Error("El nombre del contenedor es obligatorio.");
    }
    const ips = (payload.ips || [])
      .filter(entry => entry && typeof entry.ip === 'string' && entry.ip.trim() !== '')
      .map(entry => ({
        ip: entry.ip.trim(),
        vlan_id: entry.vlan_id === '' || entry.vlan_id === undefined || entry.vlan_id === null
          ? null
          : Number(entry.vlan_id)
      }));

    const cleanPayload = { ...payload, ips };

    return await this.infrastructureRepository.createContainer(endpointId, cleanPayload);
  }
}

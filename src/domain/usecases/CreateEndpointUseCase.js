export class CreateEndpointUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute(projectId, endpointData) {
    if (!projectId) {
      throw new Error('Selecciona un proyecto.');
    }
    if (!endpointData.hostname) {
      throw new Error('El hostname es obligatorio.');
    }

    // Normaliza el array de IPs: descarta filas vacías y castea vlan_id a número
    const ips = (endpointData.ips || [])
      .filter(entry => entry && typeof entry.ip === 'string' && entry.ip.trim() !== '')
      .map(entry => ({
        ip: entry.ip.trim(),
        vlan_id: entry.vlan_id === '' || entry.vlan_id === undefined || entry.vlan_id === null
          ? null
          : Number(entry.vlan_id)
      }));

    const payload = { ...endpointData, ips };

    return await this.infrastructureRepository.createEndpoint(projectId, payload);
  }
}
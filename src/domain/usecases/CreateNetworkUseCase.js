export class CreateNetworkUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute(endpointId, networkData) {
    if (!endpointId) {
      throw new Error('Selecciona un endpoint.');
    }
    if (!networkData.nombre) {
      throw new Error('El nombre de la red es obligatorio.');
    }

    const { vlan_id, ...rest } = networkData;
    const payload = {
      ...rest,
      vlan_id: vlan_id === '' || vlan_id === undefined ? 0 : Number(vlan_id)
    };

    return await this.infrastructureRepository.createNetwork(endpointId, payload);
  }
}

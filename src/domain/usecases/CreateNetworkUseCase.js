export class CreateNetworkUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute(networkData) {
    if (!networkData.nombre) {
      throw new Error('El nombre de la red es obligatorio.');
    }
    if (!networkData.cidr) {
      throw new Error('El CIDR de la red es obligatorio.');
    }
    if (!networkData.gateway) {
      throw new Error('La IP del gateway es obligatoria.');
    }

    const { vlan_id, ...rest } = networkData;
    const payload = {
      ...rest,
      vlan_id: vlan_id === '' || vlan_id === undefined ? 0 : Number(vlan_id)
    };

    return await this.infrastructureRepository.createNetwork(payload);
  }
}
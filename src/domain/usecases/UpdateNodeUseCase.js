export class UpdateNodeUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute(category, id, payload, projectId) {
    if (!id) {
      throw new Error('ID de activo no válido.');
    }
    const cat = (category || '').toLowerCase();
    if (cat.includes('endpoint') || cat === 'servidor' || cat === 'server') {
      const ips = (payload.ips || [])
        .filter(entry => entry && typeof entry.ip === 'string' && entry.ip.trim() !== '')
        .map(entry => ({
          ip: entry.ip.trim(),
          vlan_id: entry.vlan_id === '' || entry.vlan_id === undefined || entry.vlan_id === null ? null : Number(entry.vlan_id)
        }));
      const cleanPayload = { ...payload, ips };
      return await this.infrastructureRepository.updateEndpoint(id, cleanPayload);
    } else if (cat.includes('network') || cat === 'red' || cat === 'vlan') {
      const cleanPayload = {
        ...payload,
        vlan_id: payload.vlan_id === '' || payload.vlan_id === undefined ? 0 : Number(payload.vlan_id),
        project_id: projectId ? Number(projectId) : 0
      };
      return await this.infrastructureRepository.updateNetwork(id, cleanPayload);
    } else if (cat.includes('hardware') || cat === 'hw') {
      return await this.infrastructureRepository.updateHardware(id, payload);
    } else if (cat.includes('installation') || cat === 'instalacion' || cat === 'softwareinstallation') {
      return await this.infrastructureRepository.updateSoftwareInstallation(id, payload);
    } else if (cat.includes('software') || cat === 'sw') {
      return await this.infrastructureRepository.updateSoftware(id, payload);
    } else if (cat.includes('container') || cat === 'contenedor') {
      const ips = (payload.ips || [])
        .filter(entry => entry && typeof entry.ip === 'string' && entry.ip.trim() !== '')
        .map(entry => ({
          ip: entry.ip.trim(),
          vlan_id: entry.vlan_id === '' || entry.vlan_id === undefined || entry.vlan_id === null ? null : Number(entry.vlan_id)
        }));
      const cleanPayload = { ...payload, ips };
      return await this.infrastructureRepository.updateContainer(id, cleanPayload);
    } else {
      throw new Error(`La edición para el tipo "${category}" no está soportada o no requiere modificación manual.`);
    }
  }
}

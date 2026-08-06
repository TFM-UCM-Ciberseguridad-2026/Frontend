export class InfrastructureRepository {
  async getInfrastructure() {
    throw new Error('Method getInfrastructure not implemented');
  }

  async populateInfrastructure() {
    throw new Error('Method populateInfrastructure not implemented');
  }

  async getTopApts() {
    throw new Error('Method getTopApts not implemented');
  }

  async getExploitationPaths() {
    throw new Error('Method getExploitationPaths not implemented');
  }

  async createProject(projectData) {
    throw new Error('Method createProject not implemented');
  }
  async createEndpoint(projectId, endpointData) {
    throw new Error('Method createEndpoint not implemented');
  }

  async createHardware(endpointId, hardwareData) {
    throw new Error('Method createHardware not implemented');
  }

  async createSoftware(endpointId, softwarePayload) {
    throw new Error('Method createSoftware not implemented');
  }

  async createNetwork(networkData) {
    throw new Error('Method createNetwork not implemented');
  }
  async importInfrastructure(exportData) {
    throw new Error('Method importInfrastructure not implemented');
  }

  async deleteProject(projectId) {
    throw new Error('Method deleteProject not implemented');
  }

  async scanInstallationVulnerabilities(installationId, softwareId, limit) {
    throw new Error('Method scanInstallationVulnerabilities not implemented');
  }

  async computeProjectRisk(projectId) {
    throw new Error('Method computeProjectRisk not implemented');
  }

  async computeAllProjectRisks() {
    throw new Error('Method computeAllProjectRisks not implemented');
  }

  async updateEndpoint(id, payload) { throw new Error('Not implemented'); }
  async deleteEndpoint(id) { throw new Error('Not implemented'); }
  async updateNetwork(id, payload) { throw new Error('Not implemented'); }
  async deleteNetwork(id) { throw new Error('Not implemented'); }
  async updateHardware(id, payload) { throw new Error('Not implemented'); }
  async deleteHardware(id) { throw new Error('Not implemented'); }
  async updateSoftware(id, payload) { throw new Error('Not implemented'); }
  async deleteSoftware(id) { throw new Error('Not implemented'); }
  async updateSoftwareInstallation(id, payload) { throw new Error('Not implemented'); }
  async deleteSoftwareInstallation(id) { throw new Error('Not implemented'); }
  async deleteNode(id) { throw new Error('Not implemented'); }
}


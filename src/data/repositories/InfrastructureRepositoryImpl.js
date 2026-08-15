import { Node } from '../../domain/entities/Node';
import { AptActor } from '../../domain/entities/AptActor';
import { ExploitationPath } from '../../domain/entities/ExploitationPath';
import { Vulnerability } from '../../domain/entities/Vulnerability';
import { InfrastructureRepository } from '../../domain/repositories/InfrastructureRepository';

export class InfrastructureRepositoryImpl extends InfrastructureRepository {
  constructor(apiDataSource) {
    super();
    this.apiDataSource = apiDataSource;
  }

  async getInfrastructure() {
    const rawData = await this.apiDataSource.fetchInfrastructure();
    const nodes = (rawData.nodes || []).map(n => new Node(n));
    const relationships = rawData.relationships || [];
    return { nodes, relationships };
  }

  async populateInfrastructure() {
    return await this.apiDataSource.populateInfrastructure();
  }

  async getTopApts(projectId) {
    const rawData = await this.apiDataSource.fetchTopApts(projectId);
    return (rawData || []).map(apt => new AptActor(apt));
  }

  async getExploitationPaths(projectId) {
    const rawData = await this.apiDataSource.fetchExploitationPaths(projectId);
    return (rawData || []).map(path => new ExploitationPath(path));
  }

  async createProject(payload) {
    return await this.apiDataSource.createProject(payload);
  }

  async createEndpoint(projectId, payload) {
    const res = await this.apiDataSource.createEndpoint(projectId, payload);
    return res ? new Node(res) : null;
  }

  async createContainer(endpointId, payload) {
    const res = await this.apiDataSource.createContainer(endpointId, payload);
    return res ? new Node(res) : null;
  }

  async createHardware(endpointId, payload) {
    const res = await this.apiDataSource.createHardware(endpointId, payload);
    return res ? new Node(res) : null;
  }

  async createSoftware(endpointId, payload) {
    const res = await this.apiDataSource.createSoftware(endpointId, payload);
    return res ? new Node(res) : null;
  }

  async createContainerSoftware(containerId, payload) {
    const res = await this.apiDataSource.createContainerSoftware(containerId, payload);
    return res ? new Node(res) : null;
  }

  async createNetwork(payload) {
    const res = await this.apiDataSource.createNetwork(payload);
    return res ? new Node(res) : null;
  }

  async importInfrastructure(exportData) {
    return await this.apiDataSource.importInfrastructure(exportData);
  }

  async renameProject(projectId, newName) {
    return await this.apiDataSource.renameProject(projectId, newName);
  }

  async deleteProject(projectId) {
    return await this.apiDataSource.deleteProject(projectId);
  }

  async scanInstallationVulnerabilities(installationId, softwareId, limit) {
    return await this.apiDataSource.scanInstallationVulnerabilities(installationId, softwareId, limit);
  }

  async getFindingVulnerabilities(findingId) {
    const rawData = await this.apiDataSource.fetchFindingVulnerabilities(findingId);
    return (rawData?.vulnerabilities || []).map(v => new Vulnerability(v));
  }

  async computeProjectRisk(projectId) {
    return await this.apiDataSource.computeProjectRisk(projectId);
  }

  async computeAllProjectRisks() {
    return await this.apiDataSource.computeAllProjectRisks();
  }

  async getPatchQueue(projectId, limit) {
    return await this.apiDataSource.fetchPatchQueue(projectId, limit);
  }

  async refreshPatchesForVulnerability(cveId) {
    return await this.apiDataSource.refreshPatchesForVulnerability(cveId);
  }

  async declarePatchApplied(installationId, payload) {
    return await this.apiDataSource.declarePatchApplied(installationId, payload);
  }

  async updateEndpoint(id, payload) { return await this.apiDataSource.updateEndpoint(id, payload); }
  async deleteEndpoint(id) { return await this.apiDataSource.deleteEndpoint(id); }
  async updateNetwork(id, payload) { return await this.apiDataSource.updateNetwork(id, payload); }
  async deleteNetwork(id) { return await this.apiDataSource.deleteNetwork(id); }
  async updateHardware(id, payload) { return await this.apiDataSource.updateHardware(id, payload); }
  async deleteHardware(id) { return await this.apiDataSource.deleteHardware(id); }
  async updateSoftware(id, payload) { return await this.apiDataSource.updateSoftware(id, payload); }
  async deleteSoftware(id) { return await this.apiDataSource.deleteSoftware(id); }
  async updateSoftwareInstallation(id, payload) { return await this.apiDataSource.updateSoftwareInstallation(id, payload); }
  async deleteSoftwareInstallation(id) { return await this.apiDataSource.deleteSoftwareInstallation(id); }
  async updateContainer(id, payload) { return await this.apiDataSource.updateContainer(id, payload); }
  async deleteContainer(id) { return await this.apiDataSource.deleteContainer(id); }
  async deleteNode(id) { return await this.apiDataSource.deleteNode(id); }
  async getEndpointIPs(id) { return await this.apiDataSource.getEndpointIPs(id); }
  async exportProject(id) { return await this.apiDataSource.exportProject(id); }
}


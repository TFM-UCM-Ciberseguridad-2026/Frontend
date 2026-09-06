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

  async getInfrastructure(projectId) {
    const rawData = await this.apiDataSource.fetchInfrastructure(projectId);
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

  async getTTPMatrix(projectId) {
    return await this.apiDataSource.fetchTTPMatrix(projectId);
  }

  async getExploitationPaths(projectId) {
    const rawData = await this.apiDataSource.fetchExploitationPaths(projectId);
    const paths = (rawData.paths || []).map(path => new ExploitationPath(path));
    return {
      paths,
      warning: rawData.warning
    };
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

  async renameProject(projectId, newName, justification) {
    return await this.apiDataSource.renameProject(projectId, newName, justification);
  }

  async deleteProject(projectId, justification) {
    return await this.apiDataSource.deleteProject(projectId, justification);
  }

  async scanInstallationVulnerabilities(installationId, softwareId, options) {
    return await this.apiDataSource.scanInstallationVulnerabilities(installationId, softwareId, options);
  }

  async scanContainerImageVulnerabilities(imageId, imageName, options) {
    return await this.apiDataSource.scanContainerImageVulnerabilities(imageId, imageName, options);
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

  async getPatchQueue(paramsOrProjectId, page, limit) {
    return await this.apiDataSource.fetchPatchQueue(paramsOrProjectId, page, limit);
  }

  async refreshPatchesForVulnerability(cveId) {
    return await this.apiDataSource.refreshPatchesForVulnerability(cveId);
  }

  async getPatchesForVulnerability(cveId) {
    return await this.apiDataSource.fetchPatchesForVulnerability(cveId);
  }

  async declarePatchApplied(assetId, payload) {
    return await this.apiDataSource.declarePatchApplied(assetId, payload);
  }

  async refreshPatchesForProject(projectId, options) {
    return await this.apiDataSource.refreshPatchesForProject(projectId, options);
  }

  async getAppliedPatchHistory(assetId, assetType) {
    return await this.apiDataSource.fetchAppliedPatchHistory(assetId, assetType);
  }

  async getEndpointPatchHistory(endpointId) {
    return await this.apiDataSource.fetchEndpointPatchHistory(endpointId);
  }

  async updateEndpoint(id, payload) { return await this.apiDataSource.updateEndpoint(id, payload); }
  async deleteEndpoint(id, justification) { return await this.apiDataSource.deleteEndpoint(id, justification); }
  async updateNetwork(id, payload) { return await this.apiDataSource.updateNetwork(id, payload); }
  async deleteNetwork(id, justification) { return await this.apiDataSource.deleteNetwork(id, justification); }
  async updateHardware(id, payload) { return await this.apiDataSource.updateHardware(id, payload); }
  async deleteHardware(id, justification) { return await this.apiDataSource.deleteHardware(id, justification); }
  async updateSoftware(id, payload) { return await this.apiDataSource.updateSoftware(id, payload); }
  async deleteSoftware(id, justification) { return await this.apiDataSource.deleteSoftware(id, justification); }
  async updateSoftwareInstallation(id, payload) { return await this.apiDataSource.updateSoftwareInstallation(id, payload); }
  async deleteSoftwareInstallation(id, justification) { return await this.apiDataSource.deleteSoftwareInstallation(id, justification); }
  async updateContainer(id, payload) { return await this.apiDataSource.updateContainer(id, payload); }
  async deleteContainer(id, justification) { return await this.apiDataSource.deleteContainer(id, justification); }
  async deleteNode(id, justification) { return await this.apiDataSource.deleteNode(id, justification); }
  async getEndpointIPs(id) { return await this.apiDataSource.getEndpointIPs(id); }
  async exportProject(id) { return await this.apiDataSource.exportProject(id); }

  async getPaginatedInventory(params) {
    const rawData = await this.apiDataSource.fetchPaginatedInventory(params);
    if (!rawData) {
      return {
        items: [],
        page: 1,
        limit: 50,
        totalItems: 0,
        totalPages: 0,
        categoryCounts: {}
      };
    }
    const items = (rawData.items || []).map(n => new Node(n));
    return {
      items,
      page: rawData.page || 1,
      limit: rawData.limit || 50,
      totalItems: rawData.total_items || 0,
      totalPages: rawData.total_pages || 0,
      categoryCounts: rawData.category_counts || {}
    };
  }
}
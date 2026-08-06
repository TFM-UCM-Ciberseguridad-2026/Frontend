import { Node } from '../../domain/entities/Node';
import { AptActor } from '../../domain/entities/AptActor';
import { ExploitationPath } from '../../domain/entities/ExploitationPath';
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

  async getTopApts() {
    const rawData = await this.apiDataSource.fetchTopApts();
    return (rawData || []).map(apt => new AptActor(apt));
  }

  async getExploitationPaths() {
    const rawData = await this.apiDataSource.fetchExploitationPaths();
    return (rawData || []).map(path => new ExploitationPath(path));
  }

  async createProject(payload) {
    return await this.apiDataSource.createProject(payload);
  }

  async createEndpoint(projectId, payload) {
    const res = await this.apiDataSource.createEndpoint(projectId, payload);
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

  async createNetwork(payload) {
    const res = await this.apiDataSource.createNetwork(payload);
    return res ? new Node(res) : null;
  }

  async importInfrastructure(exportData) {
    return await this.apiDataSource.importInfrastructure(exportData);
  }

  async deleteProject(projectId) {
    return await this.apiDataSource.deleteProject(projectId);
  }

  async scanInstallationVulnerabilities(installationId, softwareId, limit) {
    return await this.apiDataSource.scanInstallationVulnerabilities(installationId, softwareId, limit);
  }

  async computeProjectRisk(projectId) {
    return await this.apiDataSource.computeProjectRisk(projectId);
  }

  async computeAllProjectRisks() {
    return await this.apiDataSource.computeAllProjectRisks();
  }
}

import { Node } from '../../domain/entities/Node';
import { AptActor } from '../../domain/entities/AptActor';
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

  async createNetwork(endpointId, payload) {
    const res = await this.apiDataSource.createNetwork(endpointId, payload);
    return res ? new Node(res) : null;
  }
}

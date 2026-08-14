export class InfrastructureApiDataSource {
  async fetchInfrastructure() {
    const res = await fetch('/api/infrastructure');
    if (!res.ok) {
      throw new Error(`Error en el servidor: ${res.statusText}`);
    }
    return await res.json();
  }

  async populateInfrastructure() {
    const res = await fetch('/api/infrastructure/populate', { method: 'POST' });
    if (!res.ok) {
      throw new Error(`Error de red: ${res.statusText}`);
    }
    return await res.json();
  }

  async fetchTopApts(projectId) {
    const url = projectId ? `/api/infrastructure/top-apts?project_id=${projectId}` : '/api/infrastructure/top-apts';
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Error: ${res.statusText}`);
    }
    return await res.json();
  }

  async fetchExploitationPaths(projectId) {
    const url = projectId
      ? `/api/infrastructure/exploitation-paths?project_id=${projectId}`
      : '/api/infrastructure/exploitation-paths';
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Error: ${res.statusText}`);
    }
    return await res.json();
  }

  async createProject(payload) {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await this._handleResponse(res);
  }


  async createEndpoint(projectId, payload) {
    const res = await fetch(`/api/projects/${projectId}/endpoints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await this._handleResponse(res);
  }

  async createContainer(endpointId, payload) {
    const res = await fetch(`/api/endpoints/${endpointId}/containers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await this._handleResponse(res);
  }

  async createHardware(endpointId, payload) {
    const res = await fetch(`/api/endpoints/${endpointId}/hardware`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await this._handleResponse(res);
  }

  async createSoftware(endpointId, payload) {
    const res = await fetch(`/api/endpoints/${endpointId}/installations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await this._handleResponse(res);
  }

  async createContainerSoftware(containerId, payload) {
    const res = await fetch(`/api/containers/${containerId}/installations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await this._handleResponse(res);
  }

  async createNetwork(payload) {
    // Ya no cuelga de un endpoint: se crea a nivel de infraestructura y el
    // backend enlaza los endpoints compatibles por CIDR + VLAN.
    const res = await fetch('/api/networks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await this._handleResponse(res);
  }
  
  async importInfrastructure(payload) {
    const res = await fetch('/api/infrastructure/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await this._handleResponse(res);
  }

  async deleteProject(projectId) {
    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'DELETE'
    });
    return await this._handleResponse(res);
  }

  async scanInstallationVulnerabilities(installationId, softwareId, limit = 100) {
    const params = new URLSearchParams({
      software_id: String(softwareId),
      limit: String(limit)
    });
    const res = await fetch(`/api/installations/${installationId}/scan-vulns?${params.toString()}`, {
      method: 'POST'
    });
    return await this._handleResponse(res);
  }

  async fetchFindingVulnerabilities(findingId) {
    const res = await fetch(`/api/findings/${findingId}/vulnerabilities`);
    if (!res.ok) {
      throw new Error(`Error: ${res.statusText}`);
    }
    return await res.json();
  }

  async computeProjectRisk(projectId) {
    const res = await fetch(`/api/projects/${projectId}/compute-risk`, {
      method: 'POST'
    });
    return await this._handleResponse(res);
  }

  async computeAllProjectRisks() {
    const res = await fetch('/api/risk/recalculate-all-projects', {
      method: 'POST'
    });
    return await this._handleResponse(res);
  }

  async updateEndpoint(id, payload) {
    const res = await fetch(`/api/endpoints/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await this._handleResponse(res);
  }

  async deleteEndpoint(id) {
    const res = await fetch(`/api/endpoints/${id}`, { method: 'DELETE' });
    return await this._handleResponse(res);
  }

  async updateNetwork(id, payload) {
    const res = await fetch(`/api/networks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await this._handleResponse(res);
  }

  async deleteNetwork(id) {
    const res = await fetch(`/api/networks/${id}`, { method: 'DELETE' });
    return await this._handleResponse(res);
  }

  async updateHardware(id, payload) {
    const res = await fetch(`/api/hardware/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await this._handleResponse(res);
  }

  async deleteHardware(id) {
    const res = await fetch(`/api/hardware/${id}`, { method: 'DELETE' });
    return await this._handleResponse(res);
  }

  async updateSoftware(id, payload) {
    const res = await fetch(`/api/software/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await this._handleResponse(res);
  }

  async deleteSoftware(id) {
    const res = await fetch(`/api/software/${id}`, { method: 'DELETE' });
    return await this._handleResponse(res);
  }

  async updateSoftwareInstallation(id, payload) {
    const res = await fetch(`/api/installations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await this._handleResponse(res);
  }

  async deleteSoftwareInstallation(id) {
    const res = await fetch(`/api/installations/${id}`, { method: 'DELETE' });
    return await this._handleResponse(res);
  }

  async updateContainer(id, payload) {
    const res = await fetch(`/api/containers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await this._handleResponse(res);
  }

  async deleteContainer(id) {
    const res = await fetch(`/api/containers/${id}`, { method: 'DELETE' });
    return await this._handleResponse(res);
  }

  async deleteNode(id) {
    const res = await fetch(`/api/nodes/${id}`, { method: 'DELETE' });
    return await this._handleResponse(res);
  }
  async getEndpointIPs(id) {
    const res = await fetch(`/api/endpoints/${id}/ips`);
    return await this._handleResponse(res);
  }

  async exportProject(id) {
    const res = await fetch(`/api/projects/${id}/export`);
    return await this._handleResponse(res);
  }

  async _handleResponse(res) {
    if (!res.ok) {
      let backendMessage = res.statusText;
      try {
        const errBody = await res.json();
        backendMessage = errBody.error || errBody.message || JSON.stringify(errBody);
      } catch {
        // Not JSON
      }
      throw new Error(backendMessage);
    }
    try {
      return await res.json();
    } catch {
      return null;
    }
  }
}
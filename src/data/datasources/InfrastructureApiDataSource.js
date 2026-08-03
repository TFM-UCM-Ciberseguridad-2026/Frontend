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

  async fetchTopApts() {
    const res = await fetch('/api/infrastructure/top-apts');
    if (!res.ok) {
      throw new Error(`Error: ${res.statusText}`);
    }
    return await res.json();
  }

  async fetchExploitationPaths() {
    const res = await fetch('/api/infrastructure/exploitation-paths');
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

  async createNetwork(endpointId, payload) {
    const res = await fetch(`/api/endpoints/${endpointId}/networks`, {
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

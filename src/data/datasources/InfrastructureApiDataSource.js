export class InfrastructureApiDataSource {
  async fetchInfrastructure(projectId) {
    const url = projectId ? `/api/infrastructure?project_id=${projectId}` : '/api/infrastructure';
    const res = await fetch(url);
    return await this._handleResponse(res);
  }

  async populateInfrastructure() {
    const res = await fetch('/api/infrastructure/populate', { method: 'POST' });
    return await this._handleResponse(res);
  }

  async fetchTopApts(projectId) {
    const url = projectId ? `/api/infrastructure/top-apts?project_id=${projectId}` : '/api/infrastructure/top-apts';
    const res = await fetch(url);
    return await this._handleResponse(res);
  }

  async fetchTTPMatrix(projectId) {
    const url = projectId ? `/api/infrastructure/ttps?project_id=${projectId}` : '/api/infrastructure/ttps';
    const res = await fetch(url);
    return await this._handleResponse(res);
  }

  async fetchExploitationPaths(projectId) {
    const url = projectId
      ? `/api/infrastructure/exploitation-paths?project_id=${projectId}`
      : '/api/infrastructure/exploitation-paths';
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Error: ${res.statusText}`);
    }
    const paths = await res.json();
    const isPending = res.headers.get("X-Analysis-Pending") === "true";
    const rawWarning = res.headers.get("X-Analysis-Warning");
    // decodeURIComponent doesn't decode '+' to spaces, so we replace them explicitly
    const warning = rawWarning ? decodeURIComponent(rawWarning.replace(/\+/g, '%20')) : null;
    
    return {
      paths,
      warning: isPending ? warning : null
    };
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

  async searchCPE(query) {
    const res = await fetch(`/api/cpe/search?query=${encodeURIComponent(query)}`);
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

  async deleteProject(projectId, justification = '') {
    const query = justification ? `?justification=${encodeURIComponent(justification)}` : '';
    const res = await fetch(`/api/projects/${projectId}${query}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ justification })
    });
    return await this._handleResponse(res);
  }

  async renameProject(projectId, newName, justification = '') {
    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, justification })
    });
    return await this._handleResponse(res);
  }

  async scanInstallationVulnerabilities(installationId, softwareId, { limit, forceRefresh } = {}) {
    const params = new URLSearchParams({
      software_id: String(softwareId)
    });

    if (Number.isInteger(limit) && limit > 0) {
      params.set('limit', String(limit));
    }

    if (forceRefresh) {
      params.set('force_refresh', 'true');
    }

    const res = await fetch(`/api/installations/${installationId}/scan-vulns?${params.toString()}`, {
      method: 'POST'
    });
    return await this._handleResponse(res);
  }

  async fetchFindingVulnerabilities(findingId) {
    const res = await fetch(`/api/findings/${findingId}/vulnerabilities`);
    return await this._handleResponse(res);
  }

  async scanContainerImageVulnerabilities(imageId, imageName, { forceRefresh } = {}) {
    const params = new URLSearchParams();
    if (forceRefresh) {
      params.set('force_refresh', 'true');
    }

    const queryString = params.toString();
    const url = `/api/containers/images/${encodeURIComponent(imageId)}/scan-vulns${queryString ? `?${queryString}` : ''}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_name: imageName })
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

  async updateEndpoint(id, payload) {
    const res = await fetch(`/api/endpoints/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await this._handleResponse(res);
  }

  async deleteEndpoint(id, justification = '') {
    const query = justification ? `?justification=${encodeURIComponent(justification)}` : '';
    const res = await fetch(`/api/endpoints/${id}${query}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ justification })
    });
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

  async deleteNetwork(id, justification = '') {
    const query = justification ? `?justification=${encodeURIComponent(justification)}` : '';
    const res = await fetch(`/api/networks/${id}${query}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ justification })
    });
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

  async deleteHardware(id, justification = '') {
    const query = justification ? `?justification=${encodeURIComponent(justification)}` : '';
    const res = await fetch(`/api/hardware/${id}${query}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ justification })
    });
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

  async deleteSoftware(id, justification = '') {
    const query = justification ? `?justification=${encodeURIComponent(justification)}` : '';
    const res = await fetch(`/api/software/${id}${query}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ justification })
    });
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

  async deleteSoftwareInstallation(id, justification = '') {
    const query = justification ? `?justification=${encodeURIComponent(justification)}` : '';
    const res = await fetch(`/api/installations/${id}${query}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ justification })
    });
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

  async deleteContainer(id, justification = '') {
    const query = justification ? `?justification=${encodeURIComponent(justification)}` : '';
    const res = await fetch(`/api/containers/${id}${query}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ justification })
    });
    return await this._handleResponse(res);
  }

  async deleteNode(id, justification = '') {
    const query = justification ? `?justification=${encodeURIComponent(justification)}` : '';
    const res = await fetch(`/api/nodes/${id}${query}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ justification })
    });
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
      let backendMessage = res.statusText || 'Error en la petición';
      try {
        const text = await res.text();
        if (text) {
          try {
            const errBody = JSON.parse(text);
            backendMessage = errBody.error || errBody.message || JSON.stringify(errBody);
          } catch {
            backendMessage = text.trim();
          }
        }
      } catch {}
      throw new Error(backendMessage);
    }
    try {
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  }

  async fetchPatchQueue(paramsOrProjectId = {}, legacyPage = 1, legacyLimit = 20) {
    let queryParams = {};
    if (typeof paramsOrProjectId === 'object' && paramsOrProjectId !== null) {
      queryParams = paramsOrProjectId;
    } else {
      queryParams = {
        projectId: paramsOrProjectId,
        page: legacyPage,
        limit: legacyLimit
      };
    }

    const params = new URLSearchParams();
    if (queryParams.projectId) params.set('project_id', String(queryParams.projectId));
    if (queryParams.page) params.set('page', String(queryParams.page));
    if (queryParams.limit) params.set('limit', String(queryParams.limit));
    if (queryParams.search) params.set('search', queryParams.search);
    if (queryParams.vendorSearch) params.set('vendor_search', queryParams.vendorSearch);
    if (queryParams.hostnameSearch) params.set('hostname_search', queryParams.hostnameSearch);
    if (queryParams.environment && queryParams.environment !== 'ALL') params.set('environment', queryParams.environment);
    if (queryParams.internetExposed && queryParams.internetExposed !== 'ALL') params.set('internet_exposed', queryParams.internetExposed);
    if (queryParams.inContainer && queryParams.inContainer !== 'ALL') params.set('in_container', queryParams.inContainer);
    if (queryParams.priorityTier && queryParams.priorityTier !== 'ALL') params.set('priority_tier', queryParams.priorityTier);
    if (queryParams.patchAvailable && queryParams.patchAvailable !== 'ALL') params.set('patch_available', queryParams.patchAvailable);
    if (queryParams.remediationKind && queryParams.remediationKind !== 'ALL') params.set('remediation_kind', queryParams.remediationKind);
    if (queryParams.sortField) params.set('sort_field', queryParams.sortField);
    if (queryParams.sortDirection) params.set('sort_direction', queryParams.sortDirection);

    const res = await fetch(`/api/patch-queue?${params.toString()}`);
    return await this._handleResponse(res);
  }

  async refreshPatchesForVulnerability(cveId) {
    const res = await fetch(`/api/vulnerabilities/${encodeURIComponent(cveId)}/patches/refresh`, {
      method: 'POST'
    });
    return await this._handleResponse(res);
  }

  async fetchPatchesForVulnerability(cveId) {
    const res = await fetch(`/api/vulnerabilities/${encodeURIComponent(cveId)}/patches`);
    return await this._handleResponse(res);
  }

  async declarePatchApplied(installationId, payload) {
    const res = await fetch(`/api/installations/${encodeURIComponent(installationId)}/applied-patches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await this._handleResponse(res);
  }

  async fetchAppliedPatchHistory(installationId) {
    const res = await fetch(`/api/installations/${encodeURIComponent(installationId)}/applied-patches`);
    return await this._handleResponse(res);
  }


  async refreshPatchesForProject(projectId, { limit = 20, offset = 0 } = {}) {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    params.set('offset', String(offset));

    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/patches/refresh?${params.toString()}`, {
      method: 'POST'
    });
    return await this._handleResponse(res);
  }

  async fetchPaginatedInventory({
    projectId,
    page = 1,
    limit = 50,
    category = 'ALL',
    categories = [],
    search = '',
    ipSearch = '',
    vendorSearch = '',
    environment = '',
    internetExposed = '',
    status = '',
    riskTier = '',
    sortField = 'name',
    sortDirection = 'asc'
  } = {}) {
    const params = new URLSearchParams();
    if (projectId) params.set('project_id', String(projectId));
    if (page) params.set('page', String(page));
    if (limit) params.set('limit', String(limit));
    if (category) params.set('category', category);
    if (Array.isArray(categories) && categories.length > 0) {
      params.set('categories', categories.join(','));
    }
    if (search) params.set('search', search);
    if (ipSearch) params.set('ip_search', ipSearch);
    if (vendorSearch) params.set('vendor_search', vendorSearch);
    if (environment) params.set('environment', environment);
    if (internetExposed) params.set('internet_exposed', internetExposed);
    if (status) params.set('status', status);
    if (riskTier) params.set('risk_tier', riskTier);
    if (sortField) params.set('sort_by', sortField);
    if (sortDirection) params.set('order', sortDirection);

    const res = await fetch(`/api/inventory?${params.toString()}`);
    return await this._handleResponse(res);
  }
}

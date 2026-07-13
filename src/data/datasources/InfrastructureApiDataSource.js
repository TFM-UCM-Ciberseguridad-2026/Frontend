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
}

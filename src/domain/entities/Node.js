export class Node {
  constructor({ id, labels, properties }) {
    this.id = id;
    this.labels = labels || [];
    this.properties = properties || {};
  }

  get domainId() {
    const props = this.properties || {};
    if (props.id !== undefined && props.id !== null) return props.id;
    if (props.installation_id !== undefined && props.installation_id !== null) return props.installation_id;
    if (props.cve_id !== undefined && props.cve_id !== null) return props.cve_id;
    if (props.ttp_id !== undefined && props.ttp_id !== null) return props.ttp_id;
    if (props.actor_id !== undefined && props.actor_id !== null) return props.actor_id;
    return this.id;
  }

  get primaryLabel() {
    if (this.labels.length === 0) return 'Unknown';
    const validLabels = this.labels.filter(l => l !== 'BaseNode' && l !== 'Persistable');
    return validLabels[0] || this.labels[0];
  }

  get categoryId() {
    const label = this.primaryLabel;
    switch (label) {
      case 'Project':
        return 'proyecto';
      case 'Network':
        return 'red';
      case 'Endpoint':
        return 'endpoint';
      case 'Software':
        return 'software';
      case 'SoftwareInstallation':
        return 'instalacion';
      case 'Finding':
        return 'hallazgo';
      case 'Vulnerability':
        return 'vulnerabilidad';
      case 'Remediation':
      case 'Patch':
        return 'remediacion';
      case 'Hardware':
        return 'hardware';
      case 'Container':
        return 'container';
      case 'ContainerImage':
        return 'containerimage';
      default:
        return 'todos';
    }
  }

  get name() {
    const label = this.primaryLabel;
    const props = this.properties;

    switch (label) {
      case 'Project':
        return props.name || `Proyecto #${props.id}`;
      case 'Network':
        return `${props.nombre || props.name || 'Red'} (${props.cidr || ''})`;
      case 'Endpoint':
        let hostname = props.hostname || props.nombre || props.name;
        if (!hostname) hostname = `Endpoint #${props.id}`;
        return hostname;
      case 'Hardware': {
        const clean = (v) => {
          if (v === undefined || v === null) return '';
          const s = String(v).trim();
          if (s === '' || s === '0' || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined' || s.toLowerCase() === 'n/a' || s.toLowerCase() === 'none') return '';
          return s;
        };
        const mfg = clean(props.manufacturer || props.fabricante);
        const mod = clean(props.modelo || props.model);
        const fullName = [mfg, mod].filter(Boolean).join(' ');

        const cpuVal = clean(props.cpu ?? props.cpu_cores);
        const ramVal = clean(props.ram_gb ?? props.ram);
        const specs = [
          cpuVal && Number(cpuVal) > 0 ? `${cpuVal}C` : null,
          ramVal && Number(ramVal) > 0 ? `${ramVal}GB` : null
        ].filter(Boolean).join('/');

        if (fullName) {
          return specs ? `${fullName} (${specs})` : fullName;
        }
        if (specs) return `HW: ${specs}`;
        return `Hardware #${props.id}`;
      }
      case 'Container':
        return props.name || `Container #${props.id}`;
      case 'ContainerImage': {
          if (!props.name) return `Image #${props.id}`;
          // Si el name ya lleva tag (contiene ':'), usarlo tal cual para no duplicar como "httpd:2.4.49:latest"
          if (props.name.includes(':')) return props.name;
          return props.tag ? `${props.name}:${props.tag}` : props.name;
        }
      case 'Software':
        return `${props.name || 'Software'} v${props.version || ''}`;
      case 'SoftwareInstallation':
        if (props.software_name) {
          return `${props.software_name} (${props.install_path || 'Inst'})`;
        }
        return props.install_path || `Inst: #${props.installation_id || props.id}`;
      case 'Finding':
        return `Finding #${props.id}`;
      case 'Vulnerability':
        return props.cve_id || `Vuln #${props.id}`;
      case 'Remediation':
        return props.description ? (props.description.length > 30 ? props.description.substring(0, 30) + '...' : props.description) : 'Mitigación';
      case 'Patch':
        return props.name || `Parche #${props.id}`;
      case 'TTP':
        return `${props.id || ''}: ${props.name || ''}`;
      case 'ThreatActor':
        return props.name || `Actor #${props.id}`;
      default:
        return `${label} (${props.id || 'N/A'})`;
    }
  }

}
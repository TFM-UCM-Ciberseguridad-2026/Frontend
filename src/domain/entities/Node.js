export class Node {
  constructor({ id, labels, properties }) {
    this.id = id;
    this.labels = labels || [];
    this.properties = properties || {};
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
      default:
        return 'todos';
    }
  }

  get name() {
    const label = this.primaryLabel;
    const props = this.properties;

    switch (label) {
      case 'Project':
        return props.nombre || props.name || `Proyecto #${props.id}`;
      case 'Network':
        return `${props.nombre || props.name || 'Red'} (${props.cidr || ''})`;
      case 'Endpoint':
        return props.hostname || `Host #${props.id}`;
      case 'Software':
        return `${props.name || 'Software'} v${props.version || ''}`;
      case 'SoftwareInstallation':
        // FIX: antes leía props.path (clave inexistente); la clave real es
        // "install_path" (json:"install_path" en el struct Go)
        return props.install_path || `Inst: #${props.installation_id || props.id}`;
      case 'Finding':
        return props.title || `Finding #${props.id}`;
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
      case 'Hardware':
        return `${props.manufacturer || ''} ${props.model || ''}`.trim() || `Hardware #${props.id}`;
      default:
        return `${label} (${props.id || 'N/A'})`;
    }
  }

  get colors() {
    const cat = this.categoryId;
    switch (cat) {
      case 'proyecto':
        return 'var(--c400)';
      case 'red':
        return 'var(--c300)';
      case 'endpoint':
        return 'var(--c500)';
      case 'hardware':
        return 'var(--c800)';
      case 'instalacion':
        return 'var(--c600)';
      case 'software':
        return 'var(--c300)';
      case 'hallazgo':
        return 'var(--c700)';
      case 'vulnerabilidad':
        return 'var(--c50)';
      case 'remediacion':
        return 'var(--c500)';
      default:
        return 'var(--c400)';
    }
  }
}
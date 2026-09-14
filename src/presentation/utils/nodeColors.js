export function getNodeColor(node) {
  if (!node) return '#7973FF';
  const cat = typeof node === 'string'
    ? node
    : (node.primaryLabel || node.categoryId || node.labels?.[0]);

  switch (cat) {
    case 'proyecto':
    case 'Project':
      return '#4D3BFF';
    case 'red':
    case 'Network':
      return '#7973FF';
    case 'endpoint':
    case 'Endpoint':
      return '#FFFFFF';
    case 'hardware':
    case 'Hardware':
      return '#a855f7';
    case 'container':
    case 'Container':
    case 'ContainerImage':
      return '#0db7ed';
    case 'instalacion':
    case 'SoftwareInstallation':
      return '#3813FF';
    case 'software':
    case 'Software':
      return '#CDCFFF';
    case 'hallazgo':
    case 'Finding':
      return '#f59e0b';
    case 'vulnerabilidad':
    case 'Vulnerability':
      return '#ef4444';
    case 'remediacion':
    case 'Remediation':
      return '#2701D6';
    case 'parche':
    default:
      return '#7973FF';
  }
}

export function getTierColor(tier) {
  switch ((tier || '').toUpperCase()) {
    case 'CRITICAL': return '#ff0055';
    case 'HIGH': return '#ff6b00';
    case 'MEDIUM': return '#ffb700';
    case 'LOW': return '#10b981';
    default: return null;
  }
}
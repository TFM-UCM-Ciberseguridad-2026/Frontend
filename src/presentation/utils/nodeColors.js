export function getNodeColor(node) {
  if (!node) return '#7973FF';
  const cat = typeof node === 'string' ? node : node.categoryId;

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
      return '#A5A5FF';
    case 'instalacion':
    case 'SoftwareInstallation':
      return '#3813FF';
    case 'software':
    case 'Software':
      return '#CDCFFF';
    case 'hallazgo':
    case 'Finding':
      return '#ef4444';
    case 'vulnerabilidad':
    case 'Vulnerability':
      return '#ef4444';
    case 'remediacion':
    case 'Remediation':
    case 'Patch':
      return '#2701D6';
    default:
      return '#7973FF';
  }
}
export function getNodeColor(node) {
  if (!node) return 'var(--c400)';
  const cat = typeof node === 'string' ? node : node.categoryId;

  switch (cat) {
    case 'proyecto':
    case 'Project':
      return 'var(--c400)';
    case 'red':
    case 'Network':
      return 'var(--c300)';
    case 'endpoint':
    case 'Endpoint':
      return 'var(--c500)';
    case 'hardware':
    case 'Hardware':
      return 'var(--c800)';
    case 'instalacion':
    case 'SoftwareInstallation':
      return 'var(--c600)';
    case 'software':
    case 'Software':
      return 'var(--c300)';
    case 'hallazgo':
    case 'Finding':
      return 'var(--c700)';
    case 'vulnerabilidad':
    case 'Vulnerability':
      return 'var(--c50)';
    case 'remediacion':
    case 'Remediation':
    case 'Patch':
      return 'var(--c500)';
    default:
      return 'var(--c400)';
  }
}

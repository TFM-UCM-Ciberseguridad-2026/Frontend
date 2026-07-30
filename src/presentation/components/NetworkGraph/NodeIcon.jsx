import React from 'react';

/**
 * NodeIcon component for NetworkGraph
 * Renders high-precision SVG icons tailored for each cybersecurity entity type.
 */
export function NodeIcon({ categoryId, primaryLabel, color = '#FFFFFF', size = 20 }) {
  const cat = (categoryId || primaryLabel || '').toLowerCase();

  // Pick icon paths based on category
  const renderPaths = () => {
    switch (cat) {
      case 'proyecto':
      case 'project':
        // Spiral Notebook / Libreta de apuntes
        return (
          <>
            <rect x="5" y="3" width="15" height="18" rx="2" />
            <line x1="9" y1="7" x2="16" y2="7" strokeWidth="1.5" />
            <line x1="9" y1="11" x2="16" y2="11" strokeWidth="1.5" />
            <line x1="9" y1="15" x2="13" y2="15" strokeWidth="1.5" />
            <path d="M3 6h4M3 10h4M3 14h4M3 18h4" strokeWidth="1.8" />
          </>
        );

      case 'red':
      case 'network':
        // Network Topology / Switch / Hub Nodes
        return (
          <>
            <rect x="9" y="2" width="6" height="6" rx="1.5" />
            <rect x="2" y="16" width="6" height="6" rx="1.5" />
            <rect x="16" y="16" width="6" height="6" rx="1.5" />
            <path d="M12 8v4M5 16v-2a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2" />
          </>
        );

      case 'endpoint':
      case 'hardware':
        // Desktop PC Monitor / Computer Host
        return (
          <>
            <rect x="2" y="3" width="20" height="13" rx="2" />
            <path d="M12 16v4M8 20h8" />
            <line x1="6" y1="8" x2="12" y2="8" strokeWidth="1.5" />
            <circle cx="15" cy="8" r="0.75" fill={color} />
          </>
        );


      case 'instalacion':
      case 'softwareinstallation':
        // Deployment Package / Box
        return (
          <>
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </>
        );

      case 'software':
        // App Window & Terminal Code Prompt
        return (
          <>
            <rect x="3" y="3" width="18" height="18" rx="2.5" />
            <path d="M7 9l3.5 3L7 15M13 15h4" strokeWidth="2" />
          </>
        );

      case 'hallazgo':
      case 'finding':
        // Magnifying Glass with Exclamation Search
        return (
          <>
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.05" y2="16.05" />
            <line x1="11" y1="8" x2="11" y2="11.5" strokeWidth="2" />
            <circle cx="11" cy="14" r="0.75" fill={color} />
          </>
        );

      case 'vulnerabilidad':
      case 'vulnerability':
        // Warning Alert Triangle / Hazard CVE
        return (
          <>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" strokeWidth="2" />
            <circle cx="12" cy="16.5" r="0.75" fill={color} />
          </>
        );

      case 'remediacion':
      case 'remediation':
      case 'parche':
      case 'patch':
        // Shield with Checkmark Mitigation
        return (
          <>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" strokeWidth="2" />
          </>
        );

      default:
        // Default Circle & Dot Node
        return (
          <>
            <circle cx="12" cy="12" r="8" />
            <circle cx="12" cy="12" r="3" fill={color} />
          </>
        );
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      x={-size / 2}
      y={-size / 2}
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ pointerEvents: 'none', display: 'block' }}
    >
      {renderPaths()}
    </svg>
  );
}

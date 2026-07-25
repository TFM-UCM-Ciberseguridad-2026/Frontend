import React, { useState, useMemo } from 'react';

const CATEGORIES = [
  { key: 'ALL', label: 'Todos' },
  { key: 'Network', label: 'Red / Subred' },
  { key: 'Endpoint', label: 'Endpoint' },
  { key: 'Hardware', label: 'Hardware' },
  { key: 'Project', label: 'Proyecto' },
  { key: 'SoftwareInstallation', label: 'Instalación' },
  { key: 'Software', label: 'Software' },
  { key: 'Finding', label: 'Hallazgo' },
  { key: 'Vulnerability', label: 'Vulnerabilidad (CVE)' },
  { key: 'Remediation', label: 'Remediación' }
];

export function InventoryView({ nodes = [], selectedNode, setSelectedNode }) {
  const [localSearch, setLocalSearch] = useState('');
  const [localCategory, setLocalCategory] = useState('ALL');
  const [sortField, setSortField] = useState('id'); // Default sort field
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderCaret = (field) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? ' ⏶' : ' ⏷';
  };

  const processedNodes = useMemo(() => {
    // Filter
    let filtered = nodes.filter(node => {
      const nameMatch = !localSearch || node.name.toLowerCase().includes(localSearch.toLowerCase());
      const catMatch = localCategory === 'ALL' || node.primaryLabel === localCategory;
      return nameMatch && catMatch;
    });

    // Sort
    if (sortField) {
      filtered.sort((a, b) => {
        let valA, valB;
        if (sortField === 'id') {
          // Attempt numeric compare, fallback to string comparison
          const numA = parseInt(a.id, 10);
          const numB = parseInt(b.id, 10);
          if (!isNaN(numA) && !isNaN(numB)) {
            valA = numA;
            valB = numB;
          } else {
            valA = String(a.id);
            valB = String(b.id);
          }
        } else if (sortField === 'name') {
          valA = String(a.name || '').toLowerCase();
          valB = String(b.name || '').toLowerCase();
        } else if (sortField === 'category') {
          valA = String(a.primaryLabel || '').toLowerCase();
          valB = String(b.primaryLabel || '').toLowerCase();
        } else if (sortField === 'properties') {
          valA = Object.entries(a.properties || {}).map(([k, v]) => `${k}:${v}`).join(', ').toLowerCase();
          valB = Object.entries(b.properties || {}).map(([k, v]) => `${k}:${v}`).join(', ').toLowerCase();
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [nodes, localSearch, localCategory, sortField, sortDirection]);

  return (
    <div style={{ padding: '24px', overflowY: 'auto', height: '100%', fontFamily: 'Share Tech Mono, monospace' }}>
      <h2 className="eyebrow" style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Inventario de Activos</h2>

      {/* Futuristic Local Controls Widget */}
      <div className="inventory-controls">
        <div>
          <label htmlFor="local-search" style={{ marginRight: '8px' }}>Buscar:</label>
          <input
            id="local-search"
            type="text"
            placeholder="Ej. tomcat, CVE, hostname..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="local-category" style={{ marginRight: '8px' }}>Categoría:</label>
          <select
            id="local-category"
            value={localCategory}
            onChange={(e) => setLocalCategory(e.target.value)}
          >
            {CATEGORIES.map(cat => (
              <option key={cat.key} value={cat.key}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--c100)', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
            <th
              onClick={() => handleSort('id')}
              style={{ padding: '8px 12px', color: 'var(--c400)', cursor: 'pointer', userSelect: 'none' }}
            >
              ID{renderCaret('id')}
            </th>
            <th
              onClick={() => handleSort('name')}
              style={{ padding: '8px 12px', color: 'var(--c400)', cursor: 'pointer', userSelect: 'none' }}
            >
              NOMBRE{renderCaret('name')}
            </th>
            <th
              onClick={() => handleSort('category')}
              style={{ padding: '8px 12px', color: 'var(--c400)', cursor: 'pointer', userSelect: 'none' }}
            >
              CATEGORÍA{renderCaret('category')}
            </th>
            <th
              onClick={() => handleSort('properties')}
              style={{ padding: '8px 12px', color: 'var(--c400)', cursor: 'pointer', userSelect: 'none' }}
            >
              PROPIEDADES{renderCaret('properties')}
            </th>
          </tr>
        </thead>
        <tbody>
          {processedNodes.map(node => (
            <tr
              key={node.id}
              onClick={() => setSelectedNode(node)}
              style={{
                borderBottom: '1px solid rgba(122, 115, 255, 0.08)',
                cursor: 'pointer',
                background: selectedNode && selectedNode.id === node.id ? 'rgba(79, 58, 255, 0.12)' : 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(122, 115, 255, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = selectedNode && selectedNode.id === node.id ? 'rgba(79, 58, 255, 0.12)' : 'transparent';
              }}
            >
              <td style={{ padding: '10px 12px' }}>{node.id}</td>
              <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>{node.name}</td>
              <td style={{ padding: '10px 12px' }}>
                <span
                  className="badge"
                  style={{
                    background: 'transparent',
                    borderColor: node.colors || 'var(--c400)',
                    color: node.colors || 'var(--c400)',
                    fontSize: '9px',
                    padding: '2px 6px',
                    margin: 0
                  }}
                >
                  {node.primaryLabel.toUpperCase()}
                </span>
              </td>
              <td
                style={{
                  padding: '10px 12px',
                  color: 'var(--muted)',
                  maxWidth: '280px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                title={Object.entries(node.properties || {}).map(([k, v]) => `${k}:${v}`).join(', ')}
              >
                {Object.entries(node.properties || {}).map(([k, v]) => `${k}:${v}`).join(', ')}
              </td>
            </tr>
          ))}
          {processedNodes.length === 0 && (
            <tr>
              <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: 'var(--c900)' }}>
                NO SE ENCONTRARON ACTIVOS
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

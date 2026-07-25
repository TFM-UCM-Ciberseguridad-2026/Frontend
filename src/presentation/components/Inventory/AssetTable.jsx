import React from 'react';

export function AssetTable({
  processedNodes,
  selectedNode,
  setSelectedNode,
  sortField,
  sortDirection,
  handleSort
}) {
  return (
    <main className="graph-stage" style={{ padding: '24px', overflowY: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--c100)', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
            <th 
              onClick={() => handleSort('id')}
              style={{ padding: '8px 12px', color: 'var(--c400)', cursor: 'pointer', userSelect: 'none' }}
            >
              ID {sortField === 'id' ? (sortDirection === 'asc' ? ' ⏶' : ' ⏷') : ''}
            </th>
            <th 
              onClick={() => handleSort('name')}
              style={{ padding: '8px 12px', color: 'var(--c400)', cursor: 'pointer', userSelect: 'none' }}
            >
              NOMBRE {sortField === 'name' ? (sortDirection === 'asc' ? ' ⏶' : ' ⏷') : ''}
            </th>
            <th 
              onClick={() => handleSort('category')}
              style={{ padding: '8px 12px', color: 'var(--c400)', cursor: 'pointer', userSelect: 'none' }}
            >
              CATEGORÍA {sortField === 'category' ? (sortDirection === 'asc' ? ' ⏶' : ' ⏷') : ''}
            </th>
            <th 
              onClick={() => handleSort('properties')}
              style={{ padding: '8px 12px', color: 'var(--c400)', cursor: 'pointer', userSelect: 'none' }}
            >
              PROPIEDADES {sortField === 'properties' ? (sortDirection === 'asc' ? ' ⏶' : ' ⏷') : ''}
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
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(122, 115, 255, 0.05)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = selectedNode && selectedNode.id === node.id ? 'rgba(79, 58, 255, 0.12)' : 'transparent' }}
            >
              <td style={{ padding: '10px 12px', fontFamily: 'Share Tech Mono, monospace' }}>{node.id}</td>
              <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>{node.name}</td>
              <td style={{ padding: '10px 12px' }}>
                <span className="badge" style={{ background: 'transparent', borderColor: node.colors, color: node.colors, fontSize: '9px', padding: '2px 6px', margin: 0 }}>
                   {node.primaryLabel.toUpperCase()}
                </span>
              </td>
              <td style={{ padding: '10px 12px', color: 'var(--muted)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {Object.entries(node.properties || {}).map(([k, v]) => `${k}:${v}`).join(', ')}
              </td>
            </tr>
          ))}
          {processedNodes.length === 0 && (
            <tr>
              <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: 'var(--c900)', fontFamily: 'Share Tech Mono, monospace' }}>
                NO SE ENCONTRARON ACTIVOS
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}

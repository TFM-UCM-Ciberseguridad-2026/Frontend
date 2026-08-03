import React from 'react';

export function NetworksView({ graphData, setSelectedNode }) {
  const networks = (graphData?.nodes || []).filter(n => n.primaryLabel === 'Network');

  return (
    <div style={{ padding: '24px', overflowY: 'auto', height: '100%', fontFamily: 'Share Tech Mono, monospace' }}>
      <h2 className="eyebrow" style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Auditoría de Subredes</h2>
      {networks.map(net => {
        // Encontrar endpoints conectados a esta red
        const connectedEndpoints = (graphData?.relationships || [])
          .filter(rel => rel.type === 'CONNECTED_TO' && (rel.source === net.id || rel.target === net.id))
          .map(rel => {
            const otherId = rel.source === net.id ? rel.target : rel.source;
            return graphData.nodes.find(n => n.id === otherId);
          })
          .filter(n => n && n.primaryLabel === 'Endpoint');

        return (
          <div key={net.id} style={{ border: '1px solid var(--line)', borderRadius: '8px', padding: '16px', marginBottom: '16px', background: 'rgba(5, 6, 30, 0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--c100)' }}>{net.name}</span>
              <span className="badge" style={{ background: 'transparent', borderColor: 'var(--c300)', color: 'var(--c300)' }}>NET ID: {net.id}</span>
            </div>
            <div style={{ color: 'var(--muted)', marginBottom: '8px' }}>
              CIDR: {net.properties?.cidr || 'N/A'} | ESTADO: {net.properties?.status || 'ACTIVA'}
            </div>
            <div style={{ fontSize: '12px' }}>
              <p className="eyebrow" style={{ fontSize: '9px', color: 'var(--c400)', margin: '8px 0 4px 0' }}>Equipos conectados ({connectedEndpoints.length})</p>
              {connectedEndpoints.map(ep => (
                <div
                  key={ep.id}
                  onClick={() => setSelectedNode(ep)}
                  style={{
                    padding: '6px 10px',
                    background: 'rgba(122, 115, 255, 0.05)',
                    borderRadius: '4px',
                    marginBottom: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>{ep.name}</span>
                  <span style={{ color: ep.properties?.priority_tier === 'CRITICAL' ? '#74050e' : 'var(--muted)' }}>
                    P: {ep.properties?.priority_tier || 'N/A'}
                    {ep.properties?.priority_score !== undefined ? ` · ${Math.round(Number(ep.properties.priority_score) * 100)}%` : ''}
                  </span>
                </div>
              ))}
              {connectedEndpoints.length === 0 && (
                <div style={{ color: 'var(--c900)', fontStyle: 'italic' }}>Ningún equipo detectado en este segmento.</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

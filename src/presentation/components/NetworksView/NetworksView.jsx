import React from 'react';
import { formatPercent } from '../Risk/riskFormat';


export function NetworksView({ graphData, setSelectedNode }) {
  const networks = (graphData?.nodes || []).filter(
    n => n.primaryLabel === 'Network' || n.labels?.includes('Network')
  );

  // Jerarquía de subredes, calculada por el backend y materializada como CONTAINS_SUBNET.
  // Sin pintarla, un rango padre al que se le han declarado subredes aparece con cero
  // activos y no hay forma de saber por qué: sus activos están en las hijas, que son las
  // que ganan por ser más específicas.
  const parentOf = new Map();
  const childrenOf = new Map();
  (graphData?.relationships || []).forEach(rel => {
    if (rel.type !== 'CONTAINS_SUBNET') return;
    const parentId = String(rel.source);
    const childId = String(rel.target);
    parentOf.set(childId, parentId);
    if (!childrenOf.has(parentId)) childrenOf.set(parentId, []);
    childrenOf.get(parentId).push(childId);
  });

  const netById = new Map(networks.map(n => [String(n.id), n]));
  const nameOf = id => {
    const net = netById.get(String(id));
    if (!net) return `red ${id}`;
    return net.name || net.properties?.cidr || `red ${id}`;
  };

  return (
    <div style={{ padding: '24px', overflowY: 'auto', height: '100%', fontFamily: 'Share Tech Mono, monospace' }}>
      <h2 className="eyebrow" style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Auditoría de Subredes</h2>

      {networks.map(net => {
        // Encontrar activos (Endpoints y Contenedores) conectados a esta red mediante aristas CONNECTED_TO
        const connectedAssets = (graphData?.relationships || [])
          .filter(rel => rel.type === 'CONNECTED_TO' && (String(rel.source) === String(net.id) || String(rel.target) === String(net.id)))
          .map(rel => {
            const otherId = String(rel.source) === String(net.id) ? rel.target : rel.source;
            return (graphData?.nodes || []).find(n => String(n.id) === String(otherId));
          })
          .filter(n => n && (
            n.primaryLabel === 'Endpoint' ||
            n.primaryLabel === 'Container' ||
            n.labels?.includes('Endpoint') ||
            n.labels?.includes('Container')
          ));

        const padre = parentOf.get(String(net.id));
        const subredes = childrenOf.get(String(net.id)) || [];

        return (
          <div key={net.id} style={{ border: '1px solid var(--line)', borderRadius: '8px', padding: '16px', marginBottom: '16px', background: 'rgba(5, 6, 30, 0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--c100)' }}>{net.name}</span>
              <span className="badge" style={{ background: 'transparent', borderColor: 'var(--c300)', color: 'var(--c300)' }}>
                NET ID: {net.id}
              </span>
            </div>

            <div style={{ color: 'var(--muted)', marginBottom: '8px', display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12.5px' }}>
              <span>CIDR: <strong style={{ color: 'var(--c100)' }}>{net.properties?.cidr || 'N/A'}</strong></span>
              <span>GATEWAY: <strong style={{ color: 'var(--c100)' }}>{net.properties?.gateway || 'N/A'}</strong></span>
              {net.properties?.vlan_id > 0 && (
                <span>VLAN: <strong style={{ color: 'var(--c200)' }}>#{net.properties.vlan_id}</strong></span>
              )}
              <span>ESTADO: <strong style={{ color: '#4ade80' }}>{net.properties?.status || 'ACTIVA'}</strong></span>
            </div>

            {net.properties?.descripcion && (
              <p style={{ color: 'var(--c200)', fontSize: '12px', margin: '0 0 10px 0' }}>
                {net.properties.descripcion}
              </p>
            )}

            {(padre || subredes.length > 0) && (
              <div style={{ fontSize: '11px', color: 'var(--c300)', margin: '0 0 10px 0', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {padre && <span>DENTRO DE: <strong style={{ color: 'var(--c200)' }}>{nameOf(padre)}</strong></span>}
                {subredes.length > 0 && (
                  <span>SUBREDES: <strong style={{ color: 'var(--c200)' }}>{subredes.map(nameOf).join(', ')}</strong></span>
                )}
              </div>
            )}

            <div style={{ fontSize: '12px' }}>
              <p className="eyebrow" style={{ fontSize: '9px', color: 'var(--c400)', margin: '8px 0 6px 0' }}>
                Activos Conectados ({connectedAssets.length})
              </p>

              {connectedAssets.map(asset => {
                const isContainer = asset.primaryLabel === 'Container' || asset.labels?.includes('Container');
                const props = asset.properties || {};

                return (
                  <div
                    key={asset.id}
                    onClick={() => setSelectedNode(asset)}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(122, 115, 255, 0.05)',
                      border: '1px solid rgba(122, 115, 255, 0.15)',
                      borderRadius: '4px',
                      marginBottom: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(122, 115, 255, 0.12)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(122, 115, 255, 0.05)'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--c100)', fontWeight: 'bold' }}>{asset.name}</span>
                      <span style={{
                        fontSize: '9.5px',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        letterSpacing: '0.5px',
                        background: isContainer ? 'rgba(0, 240, 255, 0.1)' : 'rgba(255, 255, 255, 0.08)',
                        border: `1px solid ${isContainer ? 'rgba(0, 240, 255, 0.45)' : 'rgba(255, 255, 255, 0.35)'}`,
                        color: isContainer ? '#00f0ff' : '#ffffff',
                        boxShadow: isContainer ? '0 0 8px rgba(0, 240, 255, 0.2)' : '0 0 8px rgba(255, 255, 255, 0.15)'
                      }}>
                        {isContainer ? 'CONTAINER' : 'ENDPOINT'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        color: props.priority_tier === 'CRITICAL' ? '#f87171' : props.priority_tier === 'HIGH' ? '#fb923c' : 'var(--muted)',
                        fontSize: '11px'
                      }}>
                        {props.priority_tier ? `P: ${props.priority_tier}` : (props.status || props.state || 'ACTIVE').toUpperCase()}
                        {props.priority_score !== undefined ? ` · ${Math.round(Number(props.priority_score) * 100)}%` : ''}
                      </span>
                    </div>
                  </div>
                );
              })}

              {connectedAssets.length === 0 && (
                <div style={{ color: 'var(--c900)', fontStyle: 'italic', padding: '4px 0' }}>
                  {subredes.length > 0
                    ? `Ningún activo directo: sus IPs caen dentro de ${subredes.map(nameOf).join(', ')}, que son más específicas.`
                    : 'Ningún activo conectado en este segmento de red.'}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {networks.length === 0 && (
        <div style={{ color: 'var(--c900)', textAlign: 'center', padding: '40px 0' }}>
          NO HAY SUBREDES CONFIGURADAS EN ESTE PROYECTO.
        </div>
      )}
    </div>
  );
}
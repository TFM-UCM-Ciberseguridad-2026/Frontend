import React from 'react';
import { getNodeColor } from '../../utils/nodeColors';
import { ActiveFilterChips } from './ActiveFilterChips';

export function AssetTable({
  processedNodes = [],
  selectedNode,
  setSelectedNode,
  sortField,
  sortDirection,
  handleSort,
  filters = {},
  updateFilter,
  removeFilter,
  clearAllFilters,
  categoriesList = [],
  page = 1,
  totalPages = 1,
  totalItems = 0,
  loading = false,
  prevPage,
  nextPage,
  firstPage,
  lastPage
}) {
  // Formateador de Atributos Clave según Categoría
  const renderAssetAttributes = (node) => {
    const props = node.properties || {};
    const cat = node.primaryLabel || 'Unknown';

    switch (cat) {
      case 'Endpoint': {
        const ips = Array.isArray(props.ips) ? props.ips : (props.ip ? [props.ip] : []);

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {ips.length > 0 ? (
              ips.map((ipEntry, idx) => {
                const ipStr = typeof ipEntry === 'object' && ipEntry !== null ? ipEntry.ip : String(ipEntry);
                const vlanId = typeof ipEntry === 'object' && ipEntry !== null ? ipEntry.vlan_id : (props.vlan_id || null);

                return (
                  <span
                    key={idx}
                    style={{
                      fontFamily: 'Share Tech Mono, monospace',
                      background: 'rgba(122, 115, 255, 0.12)',
                      border: '1px solid rgba(122, 115, 255, 0.25)',
                      color: 'var(--c100)',
                      fontSize: '11px',
                      padding: '1px 6px',
                      borderRadius: '3px'
                    }}
                  >
                    {ipStr || 'Sin IP'}{vlanId ? ` (VLAN #${vlanId})` : ''}
                  </span>
                );
              })
            ) : (
              <span style={{ color: 'var(--muted)', fontSize: '11px' }}>Sin IP asignada</span>
            )}
          </div>
        );
      }

      case 'Software':
      case 'SoftwareInstallation': {
        const vendor = props.vendor || props.software_vendor;
        const version = props.version || props.software_version;
        const swName = props.software_name || props.name;

        return (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {vendor && <span style={{ color: 'var(--c100)', fontWeight: 'bold' }}>{vendor}</span>}
            {swName && swName !== node.name && <span style={{ color: 'var(--c300)' }}>({swName})</span>}
            {version && (
              <span style={{
                background: 'rgba(79, 58, 255, 0.15)',
                border: '1px solid rgba(79, 58, 255, 0.3)',
                color: '#a5b4fc',
                padding: '0 5px',
                borderRadius: '3px',
                fontFamily: 'Share Tech Mono, monospace',
                fontSize: '11px'
              }}>
                v{version}
              </span>
            )}
          </div>
        );
      }

      case 'Hardware': {
        const mfg = props.manufacturer || props.fabricante;
        const model = props.model || props.modelo;
        const cpu = props.cpu_cores ?? props.cpu ?? props.cores;
        const ram = props.ram ?? props.ram_gb;
        const storage = props.storage ?? props.storage_gb ?? props.disk_gb ?? props.disk;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '12px' }}>
            <div>
              {mfg && <strong style={{ color: 'var(--c100)' }}>{mfg} </strong>}
              {model && <span style={{ color: 'var(--c300)' }}>{model}</span>}
              {!mfg && !model && <span style={{ color: 'var(--c300)' }}>Hardware</span>}
            </div>
            <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: 'var(--muted)', fontFamily: 'Share Tech Mono, monospace' }}>
              {cpu !== undefined && cpu !== null && <span>CPU: {cpu}</span>}
              {ram !== undefined && ram !== null && <span>RAM: {ram}GB</span>}
              {storage !== undefined && storage !== null && <span>DISC: {storage}GB</span>}
            </div>
          </div>
        );
      }

      case 'Network': {
        const cidr = props.cidr || props.rango;
        const vlan = props.vlan_id || props.vlan;
        const netType = props.type || props.tipo;

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {cidr && (
              <span style={{
                fontFamily: 'Share Tech Mono, monospace',
                background: 'rgba(122, 115, 255, 0.12)',
                border: '1px solid rgba(122, 115, 255, 0.25)',
                color: 'var(--c100)',
                fontSize: '11px',
                padding: '1px 6px',
                borderRadius: '3px'
              }}>
                {cidr}
              </span>
            )}
            {vlan && (
              <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '11px', color: 'var(--c300)' }}>
                VLAN #{vlan}
              </span>
            )}
            {netType && (
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                ({netType})
              </span>
            )}
          </div>
        );
      }

      case 'Container':
      case 'ContainerImage': {
        const image = props.image || props.image_name;
        const tag = props.tag;
        const repo = props.repository;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {image && (
              <span style={{ color: 'var(--c100)', fontFamily: 'Share Tech Mono, monospace', fontSize: '12px' }}>
                {image}{tag ? `:${tag}` : ''}
              </span>
            )}
            {repo && <span style={{ fontSize: '10px', color: 'var(--muted)' }}>Repo: {repo}</span>}
          </div>
        );
      }

      case 'Project': {
        const riskScore = props.risk_score;
        const riskTier = props.risk_tier;

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px' }}>
            {riskTier && <span style={{ color: 'var(--c200)' }}>Nivel de Riesgo: <strong>{riskTier}</strong></span>}
            {riskScore !== undefined && riskScore !== null && (
              <span style={{ fontFamily: 'Share Tech Mono, monospace', color: 'var(--muted)' }}>Score: {Number(riskScore).toFixed(1)}</span>
            )}
          </div>
        );
      }

      default: {
        const entries = Object.entries(props).filter(([k]) => !['id', 'name', 'nombre', 'hostname', 'title'].includes(k)).slice(0, 3);
        if (entries.length === 0) return <span style={{ color: 'var(--muted)', fontSize: '11px' }}>-</span>;

        return (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '11px' }}>
            {entries.map(([k, v]) => (
              <span key={k} style={{ color: 'var(--c300)' }}>
                <span style={{ color: 'var(--muted)' }}>{k}:</span> {String(v)}
              </span>
            ))}
          </div>
        );
      }
    }
  };

  // Helper para estilos de badges de nivel de riesgo (CRITICAL, HIGH, MEDIUM, LOW)
  const getRiskBadgeStyle = (tier) => {
    const t = (tier || '').toUpperCase();
    switch (t) {
      case 'CRITICAL':
        return {
          background: 'rgba(239, 68, 68, 0.18)',
          color: '#f87171',
          border: '1px solid #ef4444'
        };
      case 'HIGH':
        return {
          background: 'rgba(249, 115, 22, 0.18)',
          color: '#fb923c',
          border: '1px solid #f97316'
        };
      case 'MEDIUM':
        return {
          background: 'rgba(245, 158, 11, 0.18)',
          color: '#fbbf24',
          border: '1px solid #f59e0b'
        };
      case 'LOW':
        return {
          background: 'rgba(16, 185, 129, 0.18)',
          color: '#34d399',
          border: '1px solid #10b981'
        };
      default:
        return {
          background: 'rgba(122, 115, 255, 0.12)',
          color: 'var(--c200)',
          border: '1px solid var(--line)'
        };
    }
  };

  // Renderizado de Badges de Estado y Riesgo (sin mostrar el entorno)
  const renderAssetStatus = (node) => {
    const props = node.properties || {};
    const isExposed = props.internet_exposed === true || props.internet_exposed === 'true';
    const status = props.status || props.estado;
    const riskTier = props.risk_tier || props.severity;

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        {isExposed && (
          <span style={{
            background: 'rgba(14, 165, 233, 0.15)',
            border: '1px solid #0ea5e9',
            color: '#38bdf8',
            fontSize: '10px',
            fontWeight: 'bold',
            padding: '2px 6px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap'
          }}>
            ☁ INTERNET EXPOSED
          </span>
        )}

        {status && (
          <span style={{
            background: status.toLowerCase() === 'running' || status.toLowerCase() === 'active' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${status.toLowerCase() === 'running' || status.toLowerCase() === 'active' ? '#22c55e' : 'var(--line)'}`,
            color: status.toLowerCase() === 'running' || status.toLowerCase() === 'active' ? '#4ade80' : 'var(--muted)',
            fontSize: '10px',
            padding: '2px 6px',
            borderRadius: '4px',
            textTransform: 'uppercase'
          }}>
            {status}
          </span>
        )}

        {riskTier && (
          <span style={{
            fontSize: '10px',
            fontWeight: 'bold',
            padding: '2px 6px',
            borderRadius: '4px',
            textTransform: 'uppercase',
            ...getRiskBadgeStyle(riskTier)
          }}>
            {riskTier}
          </span>
        )}
      </div>
    );
  };

  return (
    <main className="graph-stage" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
      
      {/* BARRA DE CHIPS DE FILTROS ACTIVOS */}
      <ActiveFilterChips
        filters={filters}
        onRemoveFilter={removeFilter}
        onClearAll={clearAllFilters}
      />

      {/* CONTENEDOR DE TABLA ESTILIZADO ACORDE A GOVERNANCE */}
      <div 
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          position: 'relative',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '8px',
          border: '1px solid var(--line)',
          overflowX: 'auto'
        }}
      >
        {loading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(10, 10, 20, 0.65)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--c400)',
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: '14px',
            zIndex: 10
          }}>
            <span style={{ animation: 'pulse 1.2s infinite' }}>CARGANDO ACTIVOS DESDE EL SERVIDOR...</span>
          </div>
        )}

        <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--c100)', fontSize: '13px', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)', background: 'rgba(0,0,0,0.2)' }}>
              
              {/* 1. CABECERA ACTIVO */}
              <th style={{ padding: '12px 16px', color: 'var(--c300)', fontWeight: 'normal', fontFamily: 'Orbitron, sans-serif', userSelect: 'none', width: '25%', position: 'relative' }}>
                <span onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                  ACTIVO {sortField === 'name' ? (sortDirection === 'asc' ? ' ⏶' : ' ⏷') : ''}
                </span>
              </th>

              {/* 2. CABECERA CATEGORÍA */}
              <th style={{ padding: '12px 16px', color: 'var(--c300)', fontWeight: 'normal', fontFamily: 'Orbitron, sans-serif', userSelect: 'none', width: '20%', position: 'relative' }}>
                <span onClick={() => handleSort('category')} style={{ cursor: 'pointer' }}>
                  CATEGORÍA {sortField === 'category' ? (sortDirection === 'asc' ? ' ⏶' : ' ⏷') : ''}
                </span>
              </th>

              {/* 3. CABECERA ATRIBUTOS CLAVE */}
              <th style={{ padding: '12px 16px', color: 'var(--c300)', fontWeight: 'normal', fontFamily: 'Orbitron, sans-serif', userSelect: 'none', width: '35%', position: 'relative' }}>
                <span onClick={() => handleSort('properties')} style={{ cursor: 'pointer' }}>
                  ATRIBUTOS CLAVE {sortField === 'properties' ? (sortDirection === 'asc' ? ' ⏶' : ' ⏷') : ''}
                </span>
              </th>

              {/* 4. CABECERA ESTADO / RIESGO */}
              <th style={{ padding: '12px 16px', color: 'var(--c300)', fontWeight: 'normal', fontFamily: 'Orbitron, sans-serif', userSelect: 'none', width: '20%', position: 'relative' }}>
                <span>ESTADO / RIESGO</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {processedNodes.map(node => {
              const catColor = getNodeColor(node);
              // El `id` de dominio se repite entre tipos distintos (un Project, un
              // Software, una Network y un Endpoint pueden compartir id=1), así que la
              // identidad de fila es el par (categoría, id): sin esto React colisiona las
              // keys y al seleccionar uno se resaltaban todos los que comparten id.
              const nodeKey = `${node.primaryLabel}:${node.id}`;
              const isSelected = selectedNode
                && selectedNode.id === node.id
                && selectedNode.primaryLabel === node.primaryLabel;
              return (
                <tr
                  key={nodeKey}
                  onClick={() => setSelectedNode(node)}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(79, 58, 255, 0.12)' : 'transparent'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(122, 115, 255, 0.05)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = isSelected ? 'rgba(79, 58, 255, 0.12)' : 'transparent' }}
                >
                  {/* 1. NOMBRE / ACTIVO */}
                  <td style={{ padding: '12px 16px', fontWeight: 'bold', fontSize: '13px', color: 'var(--c100)' }}>
                    {node.name}
                  </td>

                  {/* 2. CATEGORÍA (ESTILO PILL REDONDEADO) */}
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      borderRadius: '999px',
                      fontSize: '11.5px',
                      fontWeight: 'bold',
                      border: `1px solid ${catColor}`,
                      color: catColor,
                      background: 'rgba(255,255,255,0.03)',
                      whiteSpace: 'nowrap',
                      textTransform: 'uppercase'
                    }}>
                       {node.primaryLabel}
                    </span>
                  </td>

                  {/* 3. ATRIBUTOS CLAVE */}
                  <td style={{ padding: '12px 16px' }}>
                    {renderAssetAttributes(node)}
                  </td>

                  {/* 4. ESTADO / RIESGO */}
                  <td style={{ padding: '12px 16px' }}>
                    {renderAssetStatus(node)}
                  </td>
                </tr>
              );
            })}

            {processedNodes.length === 0 && !loading && (
              <tr>
                <td colSpan="4" style={{ padding: '35px', textAlign: 'center', color: 'var(--c300)', fontStyle: 'italic' }}>
                  No se encontraron activos con los filtros actuales
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* BARRA INFERIOR DE PAGINACIÓN */}
      <div style={{
        marginTop: '16px',
        paddingTop: '12px',
        borderTop: '1px solid var(--line)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: 'var(--c300)',
        fontSize: '12px',
        fontFamily: 'Share Tech Mono, monospace'
      }}>
        <div>
          <span>MOSTRANDO PÁGINA <strong>{page}</strong> DE <strong>{totalPages || 1}</strong></span>
          <span style={{ margin: '0 8px', opacity: 0.4 }}>|</span>
          <span style={{ color: 'var(--muted)' }}>TOTAL: <strong>{totalItems}</strong> ACTIVOS (50 por pág.)</span>
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button
            onClick={firstPage}
            disabled={page <= 1 || loading}
            style={{
              background: page <= 1 || loading ? 'rgba(255,255,255,0.03)' : 'rgba(122, 115, 255, 0.1)',
              border: '1px solid var(--line)',
              color: page <= 1 || loading ? 'var(--c900)' : 'var(--c100)',
              padding: '4px 10px',
              borderRadius: '4px',
              cursor: page <= 1 || loading ? 'not-allowed' : 'pointer',
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: '12px',
              transition: 'all 0.2s'
            }}
            title="Primera página"
          >
            &laquo;
          </button>

          <button
            onClick={prevPage}
            disabled={page <= 1 || loading}
            style={{
              background: page <= 1 || loading ? 'rgba(255,255,255,0.03)' : 'rgba(122, 115, 255, 0.1)',
              border: '1px solid var(--line)',
              color: page <= 1 || loading ? 'var(--c900)' : 'var(--c100)',
              padding: '4px 10px',
              borderRadius: '4px',
              cursor: page <= 1 || loading ? 'not-allowed' : 'pointer',
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: '12px',
              transition: 'all 0.2s'
            }}
            title="Página anterior"
          >
            &lt; ANTERIOR
          </button>

          <span style={{ padding: '0 8px', color: 'var(--c100)', fontWeight: 'bold' }}>
            {page} / {totalPages || 1}
          </span>

          <button
            onClick={nextPage}
            disabled={page >= totalPages || totalPages === 0 || loading}
            style={{
              background: page >= totalPages || totalPages === 0 || loading ? 'rgba(255,255,255,0.03)' : 'rgba(122, 115, 255, 0.1)',
              border: '1px solid var(--line)',
              color: page >= totalPages || totalPages === 0 || loading ? 'var(--c900)' : 'var(--c100)',
              padding: '4px 10px',
              borderRadius: '4px',
              cursor: page >= totalPages || totalPages === 0 || loading ? 'not-allowed' : 'pointer',
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: '12px',
              transition: 'all 0.2s'
            }}
            title="Página siguiente"
          >
            SIGUIENTE &gt;
          </button>

          <button
            onClick={lastPage}
            disabled={page >= totalPages || totalPages === 0 || loading}
            style={{
              background: page >= totalPages || totalPages === 0 || loading ? 'rgba(255,255,255,0.03)' : 'rgba(122, 115, 255, 0.1)',
              border: '1px solid var(--line)',
              color: page >= totalPages || totalPages === 0 || loading ? 'var(--c900)' : 'var(--c100)',
              padding: '4px 10px',
              borderRadius: '4px',
              cursor: page >= totalPages || totalPages === 0 || loading ? 'not-allowed' : 'pointer',
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: '12px',
              transition: 'all 0.2s'
            }}
            title="Última página"
          >
            &raquo;
          </button>
        </div>
      </div>
    </main>
  );
}
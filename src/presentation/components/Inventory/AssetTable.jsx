import React, { useState, useRef, useEffect } from 'react';
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
  const [activePopover, setActivePopover] = useState(null); // 'name', 'category', 'attributes', 'status'
  const popoverRef = useRef(null);

  // Cerrar popover al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setActivePopover(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const togglePopover = (columnKey) => {
    setActivePopover(prev => (prev === columnKey ? null : columnKey));
  };

  // Formateador de Atributos Clave según Categoría
  const renderAssetAttributes = (node) => {
    const props = node.properties || {};
    const cat = node.primaryLabel || 'Unknown';

    switch (cat) {
      case 'Endpoint': {
        const ips = Array.isArray(props.ips) ? props.ips : (props.ip ? [props.ip] : []);
        const env = props.environment || props.entorno;
        const type = props.type || props.tipo;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {ips.length > 0 ? (
                ips.map((ip, idx) => (
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
                    {ip}
                  </span>
                ))
              ) : (
                <span style={{ color: 'var(--muted)', fontSize: '11px' }}>Sin IP asignada</span>
              )}
            </div>

            <div style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', gap: '8px' }}>
              {type && <span>Tipo: <strong style={{ color: 'var(--c200)' }}>{type}</strong></span>}
              {env && <span>Entorno: <strong style={{ color: 'var(--c200)' }}>{env}</strong></span>}
            </div>
          </div>
        );
      }

      case 'Software':
      case 'SoftwareInstallation': {
        const vendor = props.vendor || props.software_vendor;
        const version = props.version || props.software_version;
        const swName = props.software_name || props.name;
        const cpe = props.cpe;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
            {cpe && (
              <span style={{
                fontFamily: 'Share Tech Mono, monospace',
                fontSize: '10px',
                color: 'var(--muted)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '320px'
              }}>
                cpe: {cpe}
              </span>
            )}
          </div>
        );
      }

      case 'Hardware': {
        const mfg = props.manufacturer || props.fabricante;
        const model = props.model || props.modelo;
        const cpu = props.cpu;
        const ram = props.ram_gb || props.ram;
        const storage = props.storage_gb || props.almacenamiento;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '12px' }}>
            <div>
              {mfg && <strong style={{ color: 'var(--c100)' }}>{mfg} </strong>}
              {model && <span style={{ color: 'var(--c300)' }}>{model}</span>}
            </div>
            <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: 'var(--muted)', fontFamily: 'Share Tech Mono, monospace' }}>
              {cpu && <span>CPU: {cpu}</span>}
              {ram && <span>RAM: {ram}GB</span>}
              {storage && <span>DISC: {storage}GB</span>}
            </div>
          </div>
        );
      }

      case 'Network': {
        const cidr = props.cidr || props.rango;
        const vlan = props.vlan_id || props.vlan;
        const netType = props.type || props.tipo;

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {cidr && (
              <span style={{
                fontFamily: 'Share Tech Mono, monospace',
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: '#38bdf8',
                padding: '2px 7px',
                borderRadius: '4px',
                fontWeight: 'bold'
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

  // Renderizado de Badges de Estado y Riesgo
  const renderAssetStatus = (node) => {
    const props = node.properties || {};
    const isExposed = props.internet_exposed === true || props.internet_exposed === 'true';
    const status = props.status || props.estado;
    const environment = props.environment || props.entorno;
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

        {environment && (
          <span style={{
            background: environment.toLowerCase().includes('prod') ? 'rgba(168, 85, 247, 0.15)' : 'rgba(59, 130, 246, 0.15)',
            border: `1px solid ${environment.toLowerCase().includes('prod') ? '#a855f7' : '#3b82f6'}`,
            color: environment.toLowerCase().includes('prod') ? '#c084fc' : '#60a5fa',
            fontSize: '10px',
            fontWeight: 'bold',
            padding: '2px 6px',
            borderRadius: '4px',
            textTransform: 'uppercase'
          }}>
            {environment}
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
            background: riskTier.toUpperCase() === 'CRITICAL' ? 'rgba(239, 68, 68, 0.2)' : riskTier.toUpperCase() === 'HIGH' ? 'rgba(249, 115, 22, 0.2)' : 'rgba(122, 115, 255, 0.12)',
            color: riskTier.toUpperCase() === 'CRITICAL' ? '#f87171' : riskTier.toUpperCase() === 'HIGH' ? '#fb923c' : 'var(--c200)',
            border: `1px solid ${riskTier.toUpperCase() === 'CRITICAL' ? '#ef4444' : riskTier.toUpperCase() === 'HIGH' ? '#f97316' : 'var(--line)'}`
          }}>
            {riskTier}
          </span>
        )}
      </div>
    );
  };

  const availableCategories = categoriesList.filter(c => c.key !== 'ALL');

  return (
    <main className="graph-stage" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
      
      {/* BARRA DE CHIPS DE FILTROS ACTIVOS */}
      <ActiveFilterChips
        filters={filters}
        onRemoveFilter={removeFilter}
        onClearAll={clearAllFilters}
      />

      <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }} ref={popoverRef}>
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

        <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--c100)', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
              
              {/* 1. CABECERA ACTIVO */}
              <th style={{ padding: '10px 12px', color: 'var(--c400)', userSelect: 'none', width: '25%', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                    ACTIVO {sortField === 'name' ? (sortDirection === 'asc' ? ' ⏶' : ' ⏷') : ''}
                  </span>
                  <button
                    onClick={() => togglePopover('name')}
                    style={{
                      background: filters.search ? 'rgba(79, 58, 255, 0.3)' : 'transparent',
                      border: 'none',
                      color: filters.search ? 'var(--c100)' : 'var(--muted)',
                      cursor: 'pointer',
                      fontSize: '12px',
                      padding: '2px 4px',
                      borderRadius: '3px'
                    }}
                    title="Filtrar por nombre"
                  >
                    🔍
                  </button>
                </div>

                {/* Popover Filtro Nombre */}
                {activePopover === 'name' && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    zIndex: 20,
                    background: '#121224',
                    border: '1px solid var(--c400)',
                    padding: '12px',
                    borderRadius: '6px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    width: '220px'
                  }}>
                    <label style={{ fontSize: '11px', color: 'var(--c400)', display: 'block', marginBottom: '6px' }}>Buscar por nombre/hostname:</label>
                    <input
                      type="text"
                      value={filters.search || ''}
                      onChange={(e) => updateFilter('search', e.target.value)}
                      placeholder="Ej. srv-web-01..."
                      style={{
                        width: '100%',
                        background: '#0a0a14',
                        border: '1px solid var(--line)',
                        color: 'var(--c100)',
                        padding: '6px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                )}
              </th>

              {/* 2. CABECERA CATEGORÍA */}
              <th style={{ padding: '10px 12px', color: 'var(--c400)', userSelect: 'none', width: '20%', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span onClick={() => handleSort('category')} style={{ cursor: 'pointer' }}>
                    CATEGORÍA {sortField === 'category' ? (sortDirection === 'asc' ? ' ⏶' : ' ⏷') : ''}
                  </span>
                  <button
                    onClick={() => togglePopover('category')}
                    style={{
                      background: (filters.categories && filters.categories.length > 0) ? 'rgba(79, 58, 255, 0.3)' : 'transparent',
                      border: 'none',
                      color: (filters.categories && filters.categories.length > 0) ? 'var(--c100)' : 'var(--muted)',
                      cursor: 'pointer',
                      fontSize: '12px',
                      padding: '2px 4px',
                      borderRadius: '3px'
                    }}
                    title="Filtrar categorías"
                  >
                    ⚙
                  </button>
                </div>

                {/* Popover Filtro Categorías (Multi-select) */}
                {activePopover === 'category' && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    zIndex: 20,
                    background: '#121224',
                    border: '1px solid var(--c400)',
                    padding: '12px',
                    borderRadius: '6px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    width: '210px',
                    maxHeight: '250px',
                    overflowY: 'auto'
                  }}>
                    <label style={{ fontSize: '11px', color: 'var(--c400)', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Filtrar Categorías:</label>
                    {availableCategories.map(cat => {
                      const isChecked = (filters.categories || []).includes(cat.key);
                      return (
                        <label key={cat.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', margin: '4px 0', cursor: 'pointer', color: 'var(--c100)' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const curr = filters.categories || [];
                              if (e.target.checked) {
                                updateFilter('categories', [...curr, cat.key]);
                              } else {
                                updateFilter('categories', curr.filter(c => c !== cat.key));
                              }
                            }}
                          />
                          <span style={{ color: cat.color }}>{cat.label}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </th>

              {/* 3. CABECERA ATRIBUTOS CLAVE */}
              <th style={{ padding: '10px 12px', color: 'var(--c400)', userSelect: 'none', width: '35%', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span onClick={() => handleSort('properties')} style={{ cursor: 'pointer' }}>
                    ATRIBUTOS CLAVE {sortField === 'properties' ? (sortDirection === 'asc' ? ' ⏶' : ' ⏷') : ''}
                  </span>
                  <button
                    onClick={() => togglePopover('attributes')}
                    style={{
                      background: (filters.ipSearch || filters.vendorSearch) ? 'rgba(79, 58, 255, 0.3)' : 'transparent',
                      border: 'none',
                      color: (filters.ipSearch || filters.vendorSearch) ? 'var(--c100)' : 'var(--muted)',
                      cursor: 'pointer',
                      fontSize: '12px',
                      padding: '2px 4px',
                      borderRadius: '3px'
                    }}
                    title="Filtrar por IP o Proveedor"
                  >
                    🔍
                  </button>
                </div>

                {/* Popover Filtro Atributos (IP/Subred & Vendor) */}
                {activePopover === 'attributes' && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    zIndex: 20,
                    background: '#121224',
                    border: '1px solid var(--c400)',
                    padding: '12px',
                    borderRadius: '6px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    width: '240px'
                  }}>
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ fontSize: '11px', color: 'var(--c400)', display: 'block', marginBottom: '4px' }}>IP / Subred (CIDR):</label>
                      <input
                        type="text"
                        value={filters.ipSearch || ''}
                        onChange={(e) => updateFilter('ipSearch', e.target.value)}
                        placeholder="Ej. 192.168.1..."
                        style={{
                          width: '100%',
                          background: '#0a0a14',
                          border: '1px solid var(--line)',
                          color: 'var(--c100)',
                          padding: '6px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--c400)', display: 'block', marginBottom: '4px' }}>Proveedor / Vendor:</label>
                      <input
                        type="text"
                        value={filters.vendorSearch || ''}
                        onChange={(e) => updateFilter('vendorSearch', e.target.value)}
                        placeholder="Ej. Apache, Dell..."
                        style={{
                          width: '100%',
                          background: '#0a0a14',
                          border: '1px solid var(--line)',
                          color: 'var(--c100)',
                          padding: '6px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>
                )}
              </th>

              {/* 4. CABECERA ESTADO / RIESGO */}
              <th style={{ padding: '10px 12px', color: 'var(--c400)', userSelect: 'none', width: '20%', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>ESTADO / RIESGO</span>
                  <button
                    onClick={() => togglePopover('status')}
                    style={{
                      background: (filters.internetExposed !== 'ALL' || filters.environment !== 'ALL' || filters.riskTier !== 'ALL') ? 'rgba(79, 58, 255, 0.3)' : 'transparent',
                      border: 'none',
                      color: (filters.internetExposed !== 'ALL' || filters.environment !== 'ALL' || filters.riskTier !== 'ALL') ? 'var(--c100)' : 'var(--muted)',
                      cursor: 'pointer',
                      fontSize: '12px',
                      padding: '2px 4px',
                      borderRadius: '3px'
                    }}
                    title="Filtrar por exposición, entorno o riesgo"
                  >
                    ⚙
                  </button>
                </div>

                {/* Popover Filtro Estado/Exposición/Riesgo */}
                {activePopover === 'status' && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    zIndex: 20,
                    background: '#121224',
                    border: '1px solid var(--c400)',
                    padding: '12px',
                    borderRadius: '6px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    width: '220px'
                  }}>
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ fontSize: '11px', color: 'var(--c400)', display: 'block', marginBottom: '4px' }}>Exposición Internet:</label>
                      <select
                        value={filters.internetExposed || 'ALL'}
                        onChange={(e) => updateFilter('internetExposed', e.target.value)}
                        style={{
                          width: '100%',
                          background: '#0a0a14',
                          border: '1px solid var(--line)',
                          color: 'var(--c100)',
                          padding: '6px',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}
                      >
                        <option value="ALL">Todos los activos</option>
                        <option value="TRUE">☁ Solo Expuestos</option>
                        <option value="FALSE">🔒 Solo Internos</option>
                      </select>
                    </div>

                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ fontSize: '11px', color: 'var(--c400)', display: 'block', marginBottom: '4px' }}>Entorno:</label>
                      <select
                        value={filters.environment || 'ALL'}
                        onChange={(e) => updateFilter('environment', e.target.value)}
                        style={{
                          width: '100%',
                          background: '#0a0a14',
                          border: '1px solid var(--line)',
                          color: 'var(--c100)',
                          padding: '6px',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}
                      >
                        <option value="ALL">Todos los entornos</option>
                        <option value="production">Production</option>
                        <option value="development">Development</option>
                        <option value="staging">Staging</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--c400)', display: 'block', marginBottom: '4px' }}>Nivel de Riesgo:</label>
                      <select
                        value={filters.riskTier || 'ALL'}
                        onChange={(e) => updateFilter('riskTier', e.target.value)}
                        style={{
                          width: '100%',
                          background: '#0a0a14',
                          border: '1px solid var(--line)',
                          color: 'var(--c100)',
                          padding: '6px',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}
                      >
                        <option value="ALL">Todos los niveles</option>
                        <option value="CRITICAL">Critical</option>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                      </select>
                    </div>
                  </div>
                )}
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
                {/* 1. NOMBRE / ACTIVO */}
                <td style={{ padding: '12px', fontWeight: 'bold', fontSize: '13px', color: 'var(--c100)' }}>
                  {node.name}
                </td>

                {/* 2. CATEGORÍA */}
                <td style={{ padding: '12px' }}>
                  <span className="badge" style={{
                    background: 'transparent',
                    borderColor: getNodeColor(node),
                    color: getNodeColor(node),
                    fontSize: '10px',
                    padding: '2px 7px',
                    margin: 0,
                    fontWeight: 'bold'
                  }}>
                     {(node.primaryLabel || 'UNKNOWN').toUpperCase()}
                  </span>
                </td>

                {/* 3. ATRIBUTOS CLAVE */}
                <td style={{ padding: '12px' }}>
                  {renderAssetAttributes(node)}
                </td>

                {/* 4. ESTADO / RIESGO */}
                <td style={{ padding: '12px' }}>
                  {renderAssetStatus(node)}
                </td>
              </tr>
            ))}

            {processedNodes.length === 0 && !loading && (
              <tr>
                <td colSpan="4" style={{ padding: '35px', textAlign: 'center', color: 'var(--c900)', fontFamily: 'Share Tech Mono, monospace' }}>
                  NO SE ENCONTRARON ACTIVOS CON LOS FILTROS ACTUALES
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
        color: 'var(--c400)',
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

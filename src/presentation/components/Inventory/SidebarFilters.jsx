import React, { useState } from 'react';

export function SidebarFilters({
  search,
  setSearch,
  category,
  setCategory,
  categories = [],
  categoryCounts = {},
  totalItems = 0,
  filters = {},
  updateFilter,
  clearAllFilters
}) {
  const [openSections, setOpenSections] = useState({
    categories: true,
    advanced: true
  });

  const toggleSection = (sectionKey) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const getNodeCount = (catKey) => {
    if (categoryCounts && Object.keys(categoryCounts).length > 0) {
      return categoryCounts[catKey] || 0;
    }
    return 0;
  };

  // Contabilizar filtros activos
  const activeAdvancedCount = [
    filters.ipSearch?.trim(),
    filters.vendorSearch?.trim(),
    filters.environment && filters.environment !== 'ALL' ? filters.environment : null,
    filters.internetExposed && filters.internetExposed !== 'ALL' ? filters.internetExposed : null,
    filters.status && filters.status !== 'ALL' ? filters.status : null,
    filters.execState && filters.execState !== 'ALL' ? filters.execState : null,
    filters.riskTier && filters.riskTier !== 'ALL' ? filters.riskTier : null
  ].filter(Boolean).length;

  const activeFilterCount = (category !== 'ALL' ? 1 : 0) + (search?.trim() !== '' ? 1 : 0) + activeAdvancedCount;

  return (
    <aside className="sidebar compact-sidebar">
      {/* HEADER DE FILTROS Y RESET */}
      <div className="filter-header-bar">
        <div className="filter-title-group">
          <svg className="filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <span className="filter-main-title">Filtros</span>
          {activeFilterCount > 0 && (
            <span className="filter-active-badge">{activeFilterCount} activo{activeFilterCount > 1 ? 's' : ''}</span>
          )}
        </div>

        {activeFilterCount > 0 && (
          <button
            className="filter-reset-btn"
            onClick={clearAllFilters}
            title="Limpiar todos los filtros"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* BÚSQUEDA */}
      <div className="compact-search-wrapper">
        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          id="search"
          type="text"
          className="compact-search-input"
          placeholder="Buscar activo..."
          value={search || ''}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            className="search-clear-btn"
            onClick={() => setSearch('')}
            title="Borrar búsqueda"
          >
            ✕
          </button>
        )}
      </div>

      {/* CONTENEDOR DE ACORDEONES */}
      <div className="filter-scroll-container">
        
        {/* SECCIÓN 1: CATEGORÍAS */}
        <div className="filter-accordion">
          <button
            className="accordion-header"
            onClick={() => toggleSection('categories')}
          >
            <div className="accordion-title-wrap">
              <span className="eyebrow-compact">Categorías</span>
              <span className="accordion-count">({categories.length})</span>
            </div>
            <svg
              className={`accordion-chevron ${openSections.categories ? 'open' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {openSections.categories && (
            <div className="accordion-content">
              <div className="cat-chip-grid">
                {categories.map(c => {
                  const count = c.key === 'ALL'
                    ? (categoryCounts['ALL'] ?? totalItems)
                    : getNodeCount(c.key);
                  const isActive = category === c.key;

                  return (
                    <button
                      key={c.key}
                      className={`cat-chip ${isActive ? 'active' : ''}`}
                      onClick={() => setCategory(c.key)}
                      title={`${c.label} (${count})`}
                    >
                      <span
                        className="cat-chip-dot"
                        style={{
                          background: c.color || 'var(--c400)',
                          boxShadow: isActive ? `0 0 8px ${c.color}` : 'none'
                        }}
                      />
                      <span className="cat-chip-label">{c.label}</span>
                      <span className="cat-chip-count">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* SECCIÓN 2: FILTROS AVANZADOS */}
        {updateFilter && (
          <div className="filter-accordion">
            <button
              className="accordion-header"
              onClick={() => toggleSection('advanced')}
            >
              <div className="accordion-title-wrap">
                <span className="eyebrow-compact">Filtros Avanzados</span>
                {activeAdvancedCount > 0 && (
                  <span className="filter-active-badge" style={{ fontSize: '10px', padding: '1px 5px' }}>
                    {activeAdvancedCount}
                  </span>
                )}
              </div>
              <svg
                className={`accordion-chevron ${openSections.advanced ? 'open' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {openSections.advanced && (
              <div className="accordion-content" style={{ padding: '10px 4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--c400)', fontWeight: 'bold' }}>
                    Exposición a Internet:
                  </label>
                  <select
                    className="sidebar-filter-control"
                    value={filters.internetExposed || 'ALL'}
                    onChange={(e) => updateFilter('internetExposed', e.target.value)}
                  >
                    <option value="ALL">Todos los activos</option>
                    <option value="TRUE">☁ Solo Expuestos</option>
                    <option value="FALSE">🔒 Solo Internos</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--c400)', fontWeight: 'bold' }}>
                    Entorno de Despliegue:
                  </label>
                  <select
                    className="sidebar-filter-control"
                    value={filters.environment || 'ALL'}
                    onChange={(e) => updateFilter('environment', e.target.value)}
                  >
                    <option value="ALL">Todos los entornos</option>
                    <option value="production">Production</option>
                    <option value="dev">Development</option>
                    <option value="staging">Staging</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--c400)', fontWeight: 'bold' }}>
                    IP / Subred (CIDR):
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 192.168.1..."
                    value={filters.ipSearch || ''}
                    onChange={(e) => updateFilter('ipSearch', e.target.value)}
                    style={{
                      background: '#0d0d1a',
                      border: '1px solid var(--line)',
                      color: 'var(--c100)',
                      padding: '5px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontFamily: 'Share Tech Mono, monospace'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--c400)', fontWeight: 'bold' }}>
                    Proveedor / Vendor:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Apache, Cisco..."
                    value={filters.vendorSearch || ''}
                    onChange={(e) => updateFilter('vendorSearch', e.target.value)}
                    style={{
                      background: '#0d0d1a',
                      border: '1px solid var(--line)',
                      color: 'var(--c100)',
                      padding: '5px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontFamily: 'Share Tech Mono, monospace'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--c400)', fontWeight: 'bold' }}>
                    Estado (Endpoint):
                  </label>
                  <select
                    className="sidebar-filter-control"
                    value={filters.status || 'ALL'}
                    onChange={(e) => updateFilter('status', e.target.value)}
                  >
                    <option value="ALL">Todos los estados</option>
                    <option value="active">Active</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--c400)', fontWeight: 'bold' }}>
                    Estado de Ejecución (Contenedor):
                  </label>
                  <select
                    className="sidebar-filter-control"
                    value={filters.execState || 'ALL'}
                    onChange={(e) => updateFilter('execState', e.target.value)}
                  >
                    <option value="ALL">Todos los estados</option>
                    <option value="running">Running</option>
                    <option value="stopped">Stopped</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--c400)', fontWeight: 'bold' }}>
                    Nivel de Riesgo:
                  </label>
                  <select
                    className="sidebar-filter-control"
                    value={filters.riskTier || 'ALL'}
                    onChange={(e) => updateFilter('riskTier', e.target.value)}
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
          </div>
        )}
      </div>

      <div className="sidebar-stats-footer">
        <div className="stat-chip">
          <span className="stat-num">{totalItems}</span>
          <span className="stat-lbl">Activos</span>
        </div>
        <div className="stat-chip">
          <span className="stat-num">{categories.length - 1}</span>
          <span className="stat-lbl">Tipos</span>
        </div>
      </div>
    </aside>
  );
}
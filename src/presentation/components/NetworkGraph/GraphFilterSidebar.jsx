import React, { useState } from 'react';

export function GraphFilterSidebar({
  graphData,
  filterType,
  setFilterType,
  searchQuery,
  setSearchQuery,
  categories = [],
  getNodeCountByType,
  fetchExploitationPaths,
  selectedExploitationPath,
  clearSelectedExploitationPath
}) {
  const [openSections, setOpenSections] = useState({
    categories: true,
    advanced: false
  });

  const toggleSection = (sectionKey) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const activeFilterCount = (filterType !== 'ALL' ? 1 : 0) + (searchQuery.trim() !== '' ? 1 : 0);

  const handleResetFilters = () => {
    setFilterType('ALL');
    setSearchQuery('');
  };

  const totalNodes = graphData?.nodes?.length || 0;
  const totalEdges = graphData?.links?.length || graphData?.edges?.length || 0;

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
            onClick={handleResetFilters}
            title="Limpiar todos los filtros"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* BARRA DE BÚSQUEDA COMPACTA */}
      <div className="compact-search-wrapper">
        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          id="search"
          type="text"
          className="compact-search-input"
          placeholder="Buscar activo, CVE..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            className="search-clear-btn"
            onClick={() => setSearchQuery('')}
            title="Borrar búsqueda"
          >
            ✕
          </button>
        )}
      </div>

      {/* BOTÓN DE ACCIÓN RÁPIDA: RUTAS DE EXPLOTACIÓN */}

      {fetchExploitationPaths && (
        <div style={{ margin: '4px 0 8px 0' }}>
          {selectedExploitationPath ? (
            <button
              className="btn btn-secondary"
              onClick={clearSelectedExploitationPath}
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: '11px',
                fontFamily: 'Orbitron, sans-serif',
                borderColor: '#ef4444',
                color: '#f87171',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <span>QUITAR RUTA DESTACADA</span>
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={fetchExploitationPaths}
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: '11px',
                fontFamily: 'Orbitron, sans-serif',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(220, 38, 38, 0.15))',
                borderColor: '#ef4444',
                color: '#fca5a5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}

            >
              <span>RUTAS DE ATAQUE</span>
            </button>
          )}
        </div>
      )}

      {/* CONTENEDOR DE SECCIONES CON SCROLL SLIM */}

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
                    ? totalNodes
                    : (getNodeCountByType ? getNodeCountByType(c.key) : 0);
                  const isActive = filterType === c.key;

                  return (
                    <button
                      key={c.key}
                      className={`cat-chip ${isActive ? 'active' : ''}`}
                      onClick={() => setFilterType(c.key)}
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

        {/* SECCIÓN 2: FILTROS AVANZADOS (FUTUROS) */}
        <div className="filter-accordion">
          <button
            className="accordion-header"
            onClick={() => toggleSection('advanced')}
          >
            <div className="accordion-title-wrap">
              <span className="eyebrow-compact">Filtros Avanzados</span>
              <span className="accordion-tag">Próximamente</span>
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
            <div className="accordion-content">
              <div className="future-filters-placeholder">
                <div className="placeholder-item">
                  <span>Severidad Vulnerabilidad</span>
                  <span className="ph-badge">Alta / Crítica</span>
                </div>
                <div className="placeholder-item">
                  <span>Estado de Activo</span>
                  <span className="ph-badge">Activo / Inactivo</span>
                </div>
                <small className="placeholder-note">
                  Modo preparado para integrar filtros por rangos, tags y atributos extendidos.
                </small>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FOOTER RESUMEN DE COMPONENTES DE GRAFO */}
      <div className="sidebar-stats-footer">
        <div className="stat-chip">
          <span className="stat-num">{totalNodes}</span>
          <span className="stat-lbl">Nodos</span>
        </div>
        <div className="stat-chip">
          <span className="stat-num">{totalEdges}</span>
          <span className="stat-lbl">Conexiones</span>
        </div>
      </div>
    </aside>
  );
}

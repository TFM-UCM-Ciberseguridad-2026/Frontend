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
  clearSelectedExploitationPath,
  riskActionLoading,
  analyzeProjectVulnerabilities,
  computeSelectedProjectRisk
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
        <input
          id="search"
          type="text"
          className="compact-search-input"
          placeholder="🔍 Buscar activo..."
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

      {/* BOTONES DE ACCIÓN RÁPIDA EN EL SIDEBAR */}
      <div className="sidebar-action-group">
        <div className="sidebar-action-title">Acciones de Análisis</div>
        <div className="sidebar-action-buttons">
          {fetchExploitationPaths && (
            selectedExploitationPath ? (
              <button
                type="button"
                className="sidebar-action-btn path-active"
                onClick={clearSelectedExploitationPath}
              >
                <span className="ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </span>
                <span>Quitar Ruta Destacada</span>
              </button>
            ) : (
              <button
                type="button"
                className="sidebar-action-btn path-btn"
                onClick={fetchExploitationPaths}
              >
                <span className="ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </span>
                <span>Rutas de Ataque</span>
              </button>
            )
          )}

          {analyzeProjectVulnerabilities && (
            <button
              type="button"
              className="sidebar-action-btn vuln-btn"
              disabled={riskActionLoading}
              onClick={analyzeProjectVulnerabilities}
            >
              <span className="ic">
                {riskActionLoading ? (
                  <svg className="spin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="M12 8v4" />
                    <path d="M12 16h.01" />
                  </svg>
                )}
              </span>
              <span>{riskActionLoading ? 'Procesando...' : 'Analizar vulnerabilidades'}</span>
            </button>
          )}

          {computeSelectedProjectRisk && (
            <button
              type="button"
              className="sidebar-action-btn risk-btn"
              disabled={riskActionLoading}
              onClick={computeSelectedProjectRisk}
            >
              <span className="ic">
                {riskActionLoading ? (
                  <svg className="spin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0z" />
                    <path d="M12 12L16 8" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                )}
              </span>
              <span>{riskActionLoading ? 'Procesando...' : 'Calcular riesgo'}</span>
            </button>
          )}
        </div>
      </div>

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
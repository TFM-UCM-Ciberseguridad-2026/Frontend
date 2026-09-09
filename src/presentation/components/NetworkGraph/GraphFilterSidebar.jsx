import React, { useState, useEffect } from 'react';

export function GraphFilterSidebar({
  graphData,
  filterType,
  setFilterType,
  searchQuery,
  setSearchQuery,
  graphAdvancedFilters = {},
  updateGraphAdvancedFilter,
  clearGraphAdvancedFilters,
  categories = [],
  getNodeCountByType,
  fetchExploitationPaths,
  selectedExploitationPath,
  clearSelectedExploitationPath,
  vulnScanLoading,
  riskComputeLoading,
  analyzeProjectVulnerabilities,
  computeSelectedProjectRisk,
  isAnalysisPending
}) {
  const [openSections, setOpenSections] = useState({
    categories: true,
    advanced: true
  });

  // Progreso fluido y reactivo gestionado internamente
  const [progressPercent, setProgressPercent] = useState(0);

  useEffect(() => {
    let timer = null;
    if (vulnScanLoading) {
      setProgressPercent(8);
      timer = setInterval(() => {
        setProgressPercent(prev => {
          if (prev < 35) return prev + 5;
          if (prev < 70) return prev + 3;
          if (prev < 92) return prev + 1;
          return prev;
        });
      }, 160);
    } else {
      if (progressPercent > 0) {
        setProgressPercent(100);
        const resetTimer = setTimeout(() => setProgressPercent(0), 600);
        return () => clearTimeout(resetTimer);
      }
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [vulnScanLoading]);

  const toggleSection = (sectionKey) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const activeAdvancedCount = [
    graphAdvancedFilters.ipSearch?.trim(),
    graphAdvancedFilters.vendorSearch?.trim(),
    graphAdvancedFilters.environment !== 'ALL' ? graphAdvancedFilters.environment : null,
    graphAdvancedFilters.internetExposed !== 'ALL' ? graphAdvancedFilters.internetExposed : null,
    graphAdvancedFilters.status !== 'ALL' ? graphAdvancedFilters.status : null,
    graphAdvancedFilters.riskTier !== 'ALL' ? graphAdvancedFilters.riskTier : null
  ].filter(Boolean).length;

  const activeFilterCount = (filterType !== 'ALL' ? 1 : 0) + (searchQuery.trim() !== '' ? 1 : 0) + activeAdvancedCount;

  const handleResetFilters = () => {
    if (clearGraphAdvancedFilters) {
      clearGraphAdvancedFilters();
    } else {
      setFilterType('ALL');
      setSearchQuery('');
    }
  };

  const totalNodes = graphData?.nodes?.length || 0;
  const totalEdges = graphData?.links?.length || graphData?.edges?.length || graphData?.relationships?.length || 0;

  // Cálculo del trazado SVG del anillo de progreso
  const radius = 8.5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

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

      {/* BANNER ENRIQUECIMIENTO NVD */}
      {isAnalysisPending && (
        <div className="nvd-pending-banner" title="El enriquecimiento de vulnerabilidades con datos de NVD está en curso.">
          <svg className="spin-icon nvd-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          <span>Enriqueciendo CVEs con NVD…<br/><small>El grafo se actualizará solo</small></span>
        </div>
      )}

      {/* BOTONES DE ACCIÓN */}
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

          {/* BOTÓN CON RUEDA DE PROGRESO FLUIDA */}
          {analyzeProjectVulnerabilities && (
            <button
              type="button"
              className="sidebar-action-btn vuln-btn"
              disabled={vulnScanLoading || riskComputeLoading}
              onClick={analyzeProjectVulnerabilities}
            >
              <span className="ic">
                {vulnScanLoading || progressPercent > 0 ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
                    <circle
                      cx="12"
                      cy="12"
                      r={radius}
                      stroke="rgba(122, 115, 255, 0.25)"
                      strokeWidth="2.5"
                      fill="none"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r={radius}
                      stroke="var(--c400, #7973FF)"
                      strokeWidth="2.5"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="none"
                      style={{ transition: 'stroke-dashoffset 0.18s linear' }}
                    />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="M12 8v4" />
                    <path d="M12 16h.01" />
                  </svg>
                )}
              </span>
              <span>
                {vulnScanLoading || progressPercent > 0
                  ? `Analizando... ${progressPercent}%`
                  : 'Analizar vulnerabilidades'}
              </span>
            </button>
          )}

          {computeSelectedProjectRisk && (
            <button
              type="button"
              className="sidebar-action-btn risk-btn"
              disabled={vulnScanLoading || riskComputeLoading}
              onClick={computeSelectedProjectRisk}
            >
              <span className="ic">
                {riskComputeLoading ? (
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
              <span>{riskComputeLoading ? 'Calculando...' : 'Calcular riesgo'}</span>
            </button>
          )}
        </div>
      </div>

      {/* SECCIONES DE FILTRO */}
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

        {/* SECCIÓN 2: FILTROS AVANZADOS */}
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
                  value={graphAdvancedFilters.internetExposed || 'ALL'}
                  onChange={(e) => updateGraphAdvancedFilter && updateGraphAdvancedFilter('internetExposed', e.target.value)}
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
                  value={graphAdvancedFilters.environment || 'ALL'}
                  onChange={(e) => updateGraphAdvancedFilter && updateGraphAdvancedFilter('environment', e.target.value)}
                >
                  <option value="ALL">Todos los entornos</option>
                  <option value="production">Production</option>
                  <option value="development">Development</option>
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
                  value={graphAdvancedFilters.ipSearch || ''}
                  onChange={(e) => updateGraphAdvancedFilter && updateGraphAdvancedFilter('ipSearch', e.target.value)}
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
                  value={graphAdvancedFilters.vendorSearch || ''}
                  onChange={(e) => updateGraphAdvancedFilter && updateGraphAdvancedFilter('vendorSearch', e.target.value)}
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
                  Estado de Ejecución:
                </label>
                <select
                  className="sidebar-filter-control"
                  value={graphAdvancedFilters.status || 'ALL'}
                  onChange={(e) => updateGraphAdvancedFilter && updateGraphAdvancedFilter('status', e.target.value)}
                >
                  <option value="ALL">Todos los estados</option>
                  <option value="running">Running</option>
                  <option value="stopped">Stopped</option>
                  <option value="active">Active</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--c400)', fontWeight: 'bold' }}>
                  Nivel de Riesgo:
                </label>
                <select
                  className="sidebar-filter-control"
                  value={graphAdvancedFilters.riskTier || 'ALL'}
                  onChange={(e) => updateGraphAdvancedFilter && updateGraphAdvancedFilter('riskTier', e.target.value)}
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
      </div>

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
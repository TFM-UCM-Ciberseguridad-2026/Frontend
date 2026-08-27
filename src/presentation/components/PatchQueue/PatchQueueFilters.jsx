import React from 'react';
import './PatchQueueFilters.css';

export function PatchQueueFilters({ filters = {}, onUpdateFilter }) {
  return (
    <div className="patch-filters-bar">
      {/* Búsqueda Global */}
      <div className="patch-filter-group patch-filter-search">
        <label className="patch-filter-label">BÚSQUEDA GLOBAL</label>
        <div className="patch-input-wrapper">
          <span className="patch-input-icon">🔍</span>
          <input
            type="text"
            className="patch-filter-input"
            placeholder="CVE, software, host..."
            value={filters.search || ''}
            onChange={(e) => onUpdateFilter('search', e.target.value)}
          />
          {filters.search && (
            <button
              className="patch-input-clear"
              onClick={() => onUpdateFilter('search', '')}
              title="Limpiar búsqueda"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Hostname */}
      <div className="patch-filter-group">
        <label className="patch-filter-label">HOST / ACTIVO</label>
        <input
          type="text"
          className="patch-filter-input"
          placeholder="Nombre del host..."
          value={filters.hostnameSearch || ''}
          onChange={(e) => onUpdateFilter('hostnameSearch', e.target.value)}
        />
      </div>

      {/* Proveedor / Vendor */}
      <div className="patch-filter-group">
        <label className="patch-filter-label">PROVEEDOR</label>
        <input
          type="text"
          className="patch-filter-input"
          placeholder="Apache, Linux..."
          value={filters.vendorSearch || ''}
          onChange={(e) => onUpdateFilter('vendorSearch', e.target.value)}
        />
      </div>

      {/* Nivel de Prioridad */}
      <div className="patch-filter-group">
        <label className="patch-filter-label">PRIORIDAD (TIER)</label>
        <select
          className="patch-filter-select"
          value={filters.priorityTier || 'ALL'}
          onChange={(e) => onUpdateFilter('priorityTier', e.target.value)}
        >
          <option value="ALL">Todas las prioridades</option>
          <option value="CRITICAL">🔴 CRITICAL</option>
          <option value="HIGH">🟠 HIGH</option>
          <option value="MEDIUM">🟡 MEDIUM</option>
          <option value="LOW">🔵 LOW</option>
        </select>
      </div>

      {/* Disponibilidad de Parche */}
      <div className="patch-filter-group">
        <label className="patch-filter-label">DISPONIBILIDAD</label>
        <select
          className="patch-filter-select"
          value={filters.patchAvailable || 'ALL'}
          onChange={(e) => onUpdateFilter('patchAvailable', e.target.value)}
        >
          <option value="ALL">Todos los estados</option>
          <option value="TRUE">✅ Con Parche Disponible</option>
          <option value="FALSE">❌ Sin Parche Disponible</option>
        </select>
      </div>

      {/* Tipo de Remediación */}
      <div className="patch-filter-group">
        <label className="patch-filter-label">TIPO REMEDIACIÓN</label>
        <select
          className="patch-filter-select"
          value={filters.remediationKind || 'ALL'}
          onChange={(e) => onUpdateFilter('remediationKind', e.target.value)}
        >
          <option value="ALL">Cualquier remediación</option>
          <option value="OFFICIAL_FIX">Patch Oficial</option>
          <option value="WORKAROUND">Mitigación / Workaround</option>
          <option value="TEMPORARY_FIX">Fix Temporal</option>
          <option value="UNAVAILABLE">Sin Remediación</option>
        </select>
      </div>

      {/* Entorno */}
      <div className="patch-filter-group">
        <label className="patch-filter-label">ENTORNO</label>
        <select
          className="patch-filter-select"
          value={filters.environment || 'ALL'}
          onChange={(e) => onUpdateFilter('environment', e.target.value)}
        >
          <option value="ALL">Todos los entornos</option>
          <option value="prod">Producción (prod)</option>
          <option value="staging">Staging</option>
          <option value="dev">Desarrollo (dev)</option>
          <option value="test">Testing</option>
        </select>
      </div>

      {/* Exposición a Internet */}
      <div className="patch-filter-group">
        <label className="patch-filter-label">EXPOSICIÓN</label>
        <select
          className="patch-filter-select"
          value={filters.internetExposed || 'ALL'}
          onChange={(e) => onUpdateFilter('internetExposed', e.target.value)}
        >
          <option value="ALL">Todas las redes</option>
          <option value="TRUE">🌐 Expuesto a Internet</option>
          <option value="FALSE">🔒 Solo Red Interna</option>
        </select>
      </div>

      {/* Contenedor */}
      <div className="patch-filter-group">
        <label className="patch-filter-label">DESPLIEGUE</label>
        <select
          className="patch-filter-select"
          value={filters.inContainer || 'ALL'}
          onChange={(e) => onUpdateFilter('inContainer', e.target.value)}
        >
          <option value="ALL">Hosts y Contenedores</option>
          <option value="TRUE">📦 Solo Contenedores</option>
          <option value="FALSE">🖥️ Solo Host Directo</option>
        </select>
      </div>
    </div>
  );
}

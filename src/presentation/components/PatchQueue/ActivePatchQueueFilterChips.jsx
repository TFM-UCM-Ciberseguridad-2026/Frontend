import React from 'react';

export function ActivePatchQueueFilterChips({ filters = {}, onRemoveFilter, onClearAll }) {
  const chips = [];

  // 1. Texto de Búsqueda Global
  if (filters.search) {
    chips.push({
      id: 'search',
      label: `Búsqueda: "${filters.search}"`,
      onRemove: () => onRemoveFilter('search', '')
    });
  }

  // 2. Host / Activo
  if (filters.hostnameSearch) {
    chips.push({
      id: 'hostnameSearch',
      label: `Host: "${filters.hostnameSearch}"`,
      onRemove: () => onRemoveFilter('hostnameSearch', '')
    });
  }

  // 3. Proveedor / Vendor
  if (filters.vendorSearch) {
    chips.push({
      id: 'vendorSearch',
      label: `Proveedor: "${filters.vendorSearch}"`,
      onRemove: () => onRemoveFilter('vendorSearch', '')
    });
  }

  // 4. Prioridad (Tier)
  if (filters.priorityTier && filters.priorityTier !== 'ALL') {
    chips.push({
      id: 'priorityTier',
      label: `Prioridad: ${filters.priorityTier}`,
      onRemove: () => onRemoveFilter('priorityTier', 'ALL')
    });
  }

  // 5. Disponibilidad de Parche
  if (filters.patchAvailable && filters.patchAvailable !== 'ALL') {
    const text = filters.patchAvailable === 'TRUE' ? 'Parche: Disponible' : 'Parche: No disponible';
    chips.push({
      id: 'patchAvailable',
      label: text,
      onRemove: () => onRemoveFilter('patchAvailable', 'ALL')
    });
  }

  // 6. Tipo de Remediación
  if (filters.remediationKind && filters.remediationKind !== 'ALL') {
    const labels = {
      OFFICIAL_FIX: 'Fix Oficial',
      MITIGATION: 'Mitigación',
      WORKAROUND: 'Mitigación',
      TEMPORARY_FIX: 'Mitigación',
      UNAVAILABLE: 'Sin Remediación'
    };
    chips.push({
      id: 'remediationKind',
      label: `Remediación: ${labels[filters.remediationKind] || filters.remediationKind}`,
      onRemove: () => onRemoveFilter('remediationKind', 'ALL')
    });
  }

  // 7. Entorno
  if (filters.environment && filters.environment !== 'ALL') {
    chips.push({
      id: 'environment',
      label: `Entorno: ${filters.environment}`,
      onRemove: () => onRemoveFilter('environment', 'ALL')
    });
  }

  // 8. Exposición
  if (filters.internetExposed && filters.internetExposed !== 'ALL') {
    const text = filters.internetExposed === 'TRUE' ? 'Exposición: Internet' : 'Exposición: Interna';
    chips.push({
      id: 'internetExposed',
      label: text,
      onRemove: () => onRemoveFilter('internetExposed', 'ALL')
    });
  }

  // 9. Despliegue en Contenedor
  if (filters.inContainer && filters.inContainer !== 'ALL') {
    const text = filters.inContainer === 'TRUE' ? 'Despliegue: Contenedor' : 'Despliegue: Host Directo';
    chips.push({
      id: 'inContainer',
      label: text,
      onRemove: () => onRemoveFilter('inContainer', 'ALL')
    });
  }

  if (chips.length === 0) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      flexWrap: 'wrap',
      padding: '8px 14px',
      marginBottom: '12px',
      background: 'rgba(18, 18, 36, 0.75)',
      border: '1px solid rgba(122, 115, 255, 0.2)',
      borderRadius: '6px',
      fontSize: '12px',
      fontFamily: 'Share Tech Mono, monospace'
    }}>
      <span style={{ color: '#7a73ff', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', marginRight: '4px' }}>
        FILTROS ACTIVOS ({chips.length}):
      </span>

      {chips.map(chip => (
        <span
          key={chip.id}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(122, 115, 255, 0.15)',
            border: '1px solid rgba(122, 115, 255, 0.35)',
            color: '#e2e8f0',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px'
          }}
        >
          {chip.label}
          <button
            onClick={chip.onRemove}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '13px',
              lineHeight: 1,
              padding: 0,
              display: 'flex',
              alignItems: 'center'
            }}
            title="Quitar filtro"
          >
            &times;
          </button>
        </span>
      ))}

      <button
        onClick={onClearAll}
        style={{
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#f87171',
          padding: '2px 8px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '11px',
          fontFamily: 'Share Tech Mono, monospace',
          marginLeft: 'auto',
          transition: 'all 0.2s'
        }}
        title="Limpiar todos los filtros"
      >
        Limpiar Filtros
      </button>
    </div>
  );
}

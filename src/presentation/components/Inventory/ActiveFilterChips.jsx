import React from 'react';

export function ActiveFilterChips({ filters = {}, onRemoveFilter, onClearAll }) {
  const chips = [];

  // 1. Texto de Búsqueda
  if (filters.search) {
    chips.push({
      id: 'search',
      label: `Búsqueda: "${filters.search}"`,
      onRemove: () => onRemoveFilter('search', '')
    });
  }

  // 2. Categorías Seleccionadas (Multi-select)
  if (Array.isArray(filters.categories) && filters.categories.length > 0) {
    filters.categories.forEach(cat => {
      chips.push({
        id: `cat_${cat}`,
        label: `Cat: ${cat}`,
        onRemove: () => onRemoveFilter('categories', cat)
      });
    });
  }

  // 3. IP / Subred
  if (filters.ipSearch) {
    chips.push({
      id: 'ipSearch',
      label: `IP / Subred: "${filters.ipSearch}"`,
      onRemove: () => onRemoveFilter('ipSearch', '')
    });
  }

  // 4. Vendor / Proveedor
  if (filters.vendorSearch) {
    chips.push({
      id: 'vendorSearch',
      label: `Proveedor: "${filters.vendorSearch}"`,
      onRemove: () => onRemoveFilter('vendorSearch', '')
    });
  }

  // 5. Exposición a Internet
  if (filters.internetExposed && filters.internetExposed !== 'ALL') {
    const text = filters.internetExposed === 'TRUE' ? 'Exposición: Expuesto a Internet' : 'Exposición: Solo Interno';
    chips.push({
      id: 'internetExposed',
      label: text,
      onRemove: () => onRemoveFilter('internetExposed', 'ALL')
    });
  }

  // 6. Entorno
  if (filters.environment && filters.environment !== 'ALL') {
    chips.push({
      id: 'environment',
      label: `Entorno: ${filters.environment}`,
      onRemove: () => onRemoveFilter('environment', 'ALL')
    });
  }

  // 7. Estado
  if (filters.status && filters.status !== 'ALL') {
    chips.push({
      id: 'status',
      label: `Estado: ${filters.status}`,
      onRemove: () => onRemoveFilter('status', 'ALL')
    });
  }

  // 8. Nivel de Riesgo
  if (filters.riskTier && filters.riskTier !== 'ALL') {
    chips.push({
      id: 'riskTier',
      label: `Riesgo: ${filters.riskTier}`,
      onRemove: () => onRemoveFilter('riskTier', 'ALL')
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
      <span style={{ color: 'var(--c400)', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', marginRight: '4px' }}>
        FILTROS ACTIVOS ({chips.length}):
      </span>

      {chips.map(chip => (
        <span
          key={chip.id}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(79, 58, 255, 0.15)',
            border: '1px solid rgba(122, 115, 255, 0.35)',
            color: 'var(--c100)',
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
              color: 'var(--c300)',
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
      >
        LIMPIAR TODOS
      </button>
    </div>
  );
}

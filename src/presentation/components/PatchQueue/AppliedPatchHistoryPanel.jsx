import React, { useMemo } from 'react';
import './AppliedPatchHistoryPanel.css';

function formatDate(value) {
  if (!value) return 'N/A';
  try {
    return new Date(value).toLocaleString('es-ES');
  } catch {
    return String(value);
  }
}

function levelClass(level) {
  return `history-level history-level-${String(level || 'unknown').toLowerCase()}`;
}

export function AppliedPatchHistoryPanel({
  selectedItem,
  onSelectAsset,
  allAssets = [],
  history = [],
  loading,
  error,
  onRefresh
}) {
  // Group assets into Endpoints (Hosts) vs Containers for organized optgroups
  const { endpointAssets, containerAssets } = useMemo(() => {
    const endpoints = [];
    const containers = [];

    allAssets.forEach(asset => {
      if (asset.asset_type === 'ENDPOINT') {
        endpoints.push(asset);
      } else if (asset.asset_type === 'CONTAINER') {
        containers.push(asset);
      }
    });

    return { endpointAssets: endpoints, containerAssets: containers };
  }, [allAssets]);

  // Key calculation for matching dropdown selection
  const currentKey = selectedItem
    ? `${selectedItem.asset_type || 'ENDPOINT'}-${selectedItem.asset_id || selectedItem.container_id || selectedItem.endpoint_id}`
    : '';

  const handleDropdownChange = (e) => {
    const val = e.target.value;
    if (!val) {
      onSelectAsset?.(null);
      return;
    }
    const found = allAssets.find(a => a.key === val);
    if (found) {
      onSelectAsset?.(found);
    }
  };

  return (
    <aside className="applied-history-panel">
      <div className="applied-history-header">
        <div>
          <p className="eyebrow">Blue Team Operations</p>
          <h3>Patch History</h3>
        </div>
        {selectedItem && onRefresh && (
          <button
            type="button"
            className="history-refresh-btn"
            onClick={onRefresh}
            title="Refrescar histórico del activo"
            disabled={loading}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
          </button>
        )}
      </div>

      {/* DESPLEGABLE DE ACTIVOS (HOSTS Y CONTENEDORES) */}
      <div className="applied-history-selector-box">
        <label htmlFor="history-asset-select" className="applied-history-select-label">
          SELECCIONAR ACTIVO / SERVIDOR
        </label>
        <select
          id="history-asset-select"
          className="applied-history-select"
          value={currentKey}
          onChange={handleDropdownChange}
        >
          <option value="">-- Elige un host o contenedor para ver histórico --</option>
          {endpointAssets.length > 0 && (
            <optgroup label="Hosts / Servidores">
              {endpointAssets.map(asset => (
                <option key={asset.key} value={asset.key}>
                  {asset.label}
                </option>
              ))}
            </optgroup>
          )}
          {containerAssets.length > 0 && (
            <optgroup label="Contenedores">
              {containerAssets.map(asset => (
                <option key={asset.key} value={asset.key}>
                  {asset.label}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {selectedItem && (
        <div className="applied-history-asset-info">
          <h4 className="applied-history-asset-title">
            {selectedItem.software_name || selectedItem.hostname || 'Activo'}
          </h4>
          <p className="applied-history-subtitle">
            {selectedItem.asset_type === 'ENDPOINT'
              ? `Host: ${selectedItem.hostname} (#${selectedItem.endpoint_id || selectedItem.asset_id})`
              : selectedItem.asset_type === 'CONTAINER'
              ? `Container · ${selectedItem.container_name || selectedItem.container_id || selectedItem.asset_id}`
              : `SoftwareInstallation · ${selectedItem.hostname ? selectedItem.hostname + ' · ' : ''}${selectedItem.installation_id || selectedItem.asset_id}`}
          </p>
        </div>
      )}

      {loading && <div className="applied-history-empty">Cargando histórico...</div>}
      {error && <div className="applied-history-error">⚠️ {error}</div>}

      {!selectedItem && !loading && (
        <div className="applied-history-empty">
          Elige un activo del desplegable superior o haz clic en una fila de la cola de parches para consultar su histórico.
        </div>
      )}

      {selectedItem && !loading && !error && history.length === 0 && (
        <div className="applied-history-empty">
          No hay remediaciones ni parches aplicados registrados para este activo.
        </div>
      )}

      {selectedItem && !loading && !error && history.map((entry, index) => (
        <article className="applied-history-card" key={`${entry.patch_id}-${entry.cve_id}-${entry.applied_at || index}`}>
          <div className="applied-history-card-header">
            <strong>{entry.cve_id}</strong>
            <span className={levelClass(entry.remediation_level)}>
              {entry.remediation_level || 'N/A'}
            </span>
          </div>

          {entry.software_name && selectedItem.asset_type === 'ENDPOINT' && (
            <div className="applied-history-card-software-badge">
              Software: {entry.software_name}
            </div>
          )}

          <p className="applied-history-description">
            {entry.patch_description || 'Remediación sin descripción'}
          </p>

          {entry.patch_url && (
            <a href={entry.patch_url} target="_blank" rel="noreferrer">
              {entry.patch_url}
            </a>
          )}

          <dl className="applied-history-facts">
            <div>
              <dt>Applied by</dt>
              <dd>{entry.applied_by || 'N/A'}</dd>
            </div>
            <div>
              <dt>Applied at</dt>
              <dd>{formatDate(entry.applied_at)}</dd>
            </div>
            <div>
              <dt>Factor</dt>
              <dd>{entry.remediation_factor ?? 'N/A'}</dd>
            </div>
            <div>
              <dt>Verification</dt>
              <dd>{entry.verification?.reason || entry.verification_reason || 'N/A'}</dd>
            </div>
          </dl>

          {entry.notes && (
            <pre className="applied-history-notes">{entry.notes}</pre>
          )}
        </article>
      ))}
    </aside>
  );
}

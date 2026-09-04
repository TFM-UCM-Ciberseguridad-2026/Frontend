import React from 'react';
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
  history = [],
  loading,
  error
}) {
  if (!selectedItem) {
    return (
      <aside className="applied-history-panel">
        <p className="eyebrow">Patch History</p>
        <h3>Histórico</h3>
        <div className="applied-history-empty">
          Selecciona una fila de Patch Queue para ver el histórico de remediaciones del activo.
        </div>
      </aside>
    );
  }

  return (
    <aside className="applied-history-panel">
      <p className="eyebrow">Patch History</p>
      <h3>{selectedItem.software_name || 'Software'}</h3>
      <p className="applied-history-subtitle">
        {selectedItem.asset_type === 'CONTAINER'
          ? `Container · ${selectedItem.container_id || selectedItem.asset_id}`
          : `SoftwareInstallation · ${selectedItem.installation_id}`}
      </p>

      {loading && <div className="applied-history-empty">Cargando histórico...</div>}
      {error && <div className="applied-history-error">⚠️ {error}</div>}

      {!loading && !error && history.length === 0 && (
        <div className="applied-history-empty">
          No hay remediaciones aplicadas en este activo.
        </div>
      )}

      {!loading && !error && history.map((entry, index) => (
        <article className="applied-history-card" key={`${entry.patch_id}-${entry.cve_id}-${entry.applied_at || index}`}>
          <div className="applied-history-card-header">
            <strong>{entry.cve_id}</strong>
            <span className={levelClass(entry.remediation_level)}>
              {entry.remediation_level || 'N/A'}
            </span>
          </div>

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
              <dd>{entry.verification?.reason || 'N/A'}</dd>
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

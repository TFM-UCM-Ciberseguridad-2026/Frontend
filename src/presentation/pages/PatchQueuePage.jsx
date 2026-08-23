import React, { useEffect, useState } from 'react';
import { ApplyPatchModal } from '../components/PatchQueue/ApplyPatchModal';
import './PatchQueuePage.css';

const percent = (value) => `${Math.round(Number(value || 0) * 100)}%`;

function tierClass(tier) {
  return `patch-tier patch-tier-${String(tier || 'low').toLowerCase()}`;
}

export function PatchQueuePage({
  selectedProjectId,
  patchQueue,
  patchQueueCount,
  patchQueueLoading,
  patchQueueError,
  fetchPatchQueue,
  refreshPatchesForCVE,
  focusPatchQueueItem,
  patchApplyLoading,
  patchApplyingKey,
  patchApplyError,
  declarePatchApplied,
  patchesByCVE,
  patchDetailsLoading,
  patchDetailsError,
  fetchPatchesForCVE,
  setActiveNav
}) {

  const [selectedPatchItem, setSelectedPatchItem] = useState(null);

  useEffect(() => {
    fetchPatchQueue?.();
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedPatchItem?.cve_id) return;
    fetchPatchesForCVE?.(selectedPatchItem.cve_id);
  }, [selectedPatchItem?.cve_id]);

  const openInGraph = (item) => {
    const found = focusPatchQueueItem?.(item);
    if (found) {
      setActiveNav?.('grafo');
    }
  };


  const getPatchQueueItemKey = (item) =>
    `${item.installation_id}-${item.cve_id}-${item.finding_id}`;

  const selectedPatchItemKey = selectedPatchItem ? getPatchQueueItemKey(selectedPatchItem) : null;
  const currentSelectedPatchItem = selectedPatchItemKey
    ? patchQueue.find(item => getPatchQueueItemKey(item) === selectedPatchItemKey) || selectedPatchItem
    : null;

  const submitPatchApplication = async (payload) => {
    if (!currentSelectedPatchItem) return;

    await declarePatchApplied?.(
      currentSelectedPatchItem.installation_id,
      payload,
      getPatchQueueItemKey(currentSelectedPatchItem)
    );

    setSelectedPatchItem(null);
  };  



  return (
    <section className="patch-queue-page">
      <div className="patch-queue-header">
        <div>
          <p className="eyebrow">Blue Team Operations</p>
          <h2>Patch Queue</h2>
          <p className="patch-queue-subtitle">
            Findings pendientes ordenados por prioridad de parcheo.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={() => fetchPatchQueue?.()} disabled={patchQueueLoading}>
          {patchQueueLoading ? 'Actualizando...' : 'Refrescar cola'}
        </button>
      </div>

      {patchQueueError && (
        <div className="patch-queue-error">⚠️ {patchQueueError}</div>
      )}
      {patchApplyError && (
        <div className="patch-queue-error">⚠️ {patchApplyError}</div>
      )}

      <div className="patch-queue-summary">
        <span>{patchQueueCount || patchQueue.length} elementos pendientes</span>
      </div>

      <div className="patch-queue-table-wrap">
        <table className="patch-queue-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Patch Priority</th>
              <th>CVE</th>
              <th>Activo</th>
              <th>Software</th>
              <th>Versiones</th>
              <th>Risk</th>
              <th>Patch</th>
              <th>Contexto</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {patchQueueLoading && (
              <tr>
                <td colSpan="10">Cargando Patch Queue...</td>
              </tr>
            )}

            {!patchQueueLoading && patchQueue.length === 0 && (
              <tr>
                <td colSpan="10">No hay findings pendientes de parcheo.</td>
              </tr>
            )}

            {!patchQueueLoading && patchQueue.map(item => {
              const itemKey = getPatchQueueItemKey(item);
              const isApplyingThisRow = patchApplyingKey === itemKey;
              const hasPatchAvailable = Boolean(item.patch_available);

              return (
              <tr key={itemKey}>
                <td>{item.position}</td>
                <td>
                  <span className={tierClass(item.priority_tier)}>
                    {item.priority_tier || 'LOW'} · {percent(item.priority_score)}
                  </span>
                </td>
                <td className="patch-cve">{item.cve_id}</td>
                <td>
                  <strong>{item.hostname || 'N/A'}</strong>
                  <small>#{item.endpoint_id}</small>
                </td>
                <td>
                  <strong>{item.software_name || 'N/A'}</strong>
                  <small>{item.installation_id}</small>
                </td>
                <td>
                  <span>{item.software_version || 'N/A'}</span>
                  <small>fix: {item.fixed_version || 'pendiente'}</small>
                </td>
                <td>{percent(item.risk_score)}</td>
                <td>
                  <span className={`patch-available ${item.patch_available ? 'yes' : 'no'}`}>
                    {item.patch_available ? 'Disponible' : 'Sin patch'}
                  </span>
                </td>
                <td>
                  {item.in_container
                    ? `Container: ${item.container_name || 'N/A'}`
                    : `Host · ${item.environment || 'N/A'}`}
                </td>
                <td>
                  <div className="patch-actions">
                    <button type="button" onClick={() => openInGraph(item)}>
                      Ver
                    </button>
                    <button type="button" onClick={() => refreshPatchesForCVE?.(item.cve_id)}>
                      Refresh patches
                    </button>
                    {hasPatchAvailable && (
                      <button
                        type="button"
                        onClick={() => setSelectedPatchItem(item)}
                        disabled={isApplyingThisRow}
                        title="Aplicar patch a esta instalación"
                      >
                        {isApplyingThisRow ? 'Aplicando...' : 'Aplicar patch'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ApplyPatchModal
        isOpen={Boolean(currentSelectedPatchItem)}
        item={currentSelectedPatchItem}
        patches={currentSelectedPatchItem ? patchesByCVE?.[currentSelectedPatchItem.cve_id] || [] : []}
        patchesLoading={patchDetailsLoading}
        patchesError={patchDetailsError}
        loading={patchApplyLoading}
        error={patchApplyError}
        onClose={() => setSelectedPatchItem(null)}
        onSubmit={submitPatchApplication}
      />
    </section>
  );
}

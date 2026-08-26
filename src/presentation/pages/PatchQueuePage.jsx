import React, { useEffect, useState } from 'react';
import { ApplyPatchModal } from '../components/PatchQueue/ApplyPatchModal';
import { AppliedPatchHistoryPanel } from '../components/PatchQueue/AppliedPatchHistoryPanel';
import './PatchQueuePage.css';

const percent = (value) => `${Math.round(Number(value || 0) * 100)}%`;

function tierClass(tier) {
  return `patch-tier patch-tier-${String(tier || 'low').toLowerCase()}`;
}

function patchAvailability(item) {
  switch (item.remediation_kind) {
    case 'OFFICIAL_FIX':
      return { label: 'Patch oficial', className: 'yes' };
    case 'WORKAROUND':
      return { label: 'Mitigación', className: 'warning' };
    case 'TEMPORARY_FIX':
      return { label: 'Temporal', className: 'warning' };
    case 'UNAVAILABLE':
    default:
      return { label: 'Sin remediación', className: 'no' };
  }
}


export function PatchQueuePage({
  selectedProjectId,
  patchQueue = [],
  patchQueueCount = 0,
  patchQueuePage = 1,
  patchQueueTotal = 0,
  patchQueueTotalPages = 1,
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
  setActiveNav,
  refreshPatchesForProject,
  patchProjectRefreshLoading,
  patchProjectRefreshError,
  patchProjectRefreshProgress,
  appliedPatchHistory,
  appliedPatchHistoryLoading,
  appliedPatchHistoryError,
  appliedPatchHistoryInstallationId,
  fetchAppliedPatchHistory
}) {

  const [selectedPatchItem, setSelectedPatchItem] = useState(null);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);



  useEffect(() => {
    setSelectedHistoryItem(null);
    fetchPatchQueue?.(1, 20);
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

    if (selectedHistoryItem?.installation_id === currentSelectedPatchItem.installation_id) {
      await fetchAppliedPatchHistory?.(currentSelectedPatchItem.installation_id);
    }

    setSelectedPatchItem(null);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > patchQueueTotalPages || newPage === patchQueuePage) return;
    fetchPatchQueue?.(newPage, 20);
  };

  const totalItems = patchQueueTotal || patchQueueCount || patchQueue.length;
  const startItem = totalItems === 0 ? 0 : (patchQueuePage - 1) * 20 + 1;
  const endItem = Math.min(patchQueuePage * 20, totalItems);

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, patchQueuePage - 2);
    let endPage = Math.min(patchQueueTotalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          className={`patch-pagination-page ${i === patchQueuePage ? 'active' : ''}`}
          onClick={() => handlePageChange(i)}
          disabled={patchQueueLoading}
        >
          {i}
        </button>
      );
    }
    return pages;
  };


  const selectHistoryItem = async (item) => {
    setSelectedHistoryItem(item);
    await fetchAppliedPatchHistory?.(item.installation_id);
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
        <button
          className="btn btn-secondary"
          onClick={() => refreshPatchesForProject?.()}
          disabled={patchQueueLoading || patchProjectRefreshLoading}
        >
          {patchProjectRefreshLoading ? 'Refrescando patches...' : 'Refrescar cola'}
        </button>
      </div>

      {patchQueueError && (
        <div className="patch-queue-error">⚠️ {patchQueueError}</div>
      )}
      {patchApplyError && (
        <div className="patch-queue-error">⚠️ {patchApplyError}</div>
      )}
      {patchProjectRefreshError && (
        <div className="patch-queue-error">⚠️ {patchProjectRefreshError}</div>
      )}

      <div className="patch-queue-summary">
        <span>
          Mostrando {startItem} - {endItem} de {totalItems} parches pendientes
        </span>
        {patchProjectRefreshProgress && (
          <span className="patch-queue-refresh-progress">
            Refrescando patches... {patchProjectRefreshProgress.processed}/{patchProjectRefreshProgress.total || '?'}
          </span>
        )}
      </div>

      <div className="patch-queue-content-layout">
        <div className="patch-queue-main-column">
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
                  const patchState = patchAvailability(item);
                  const isSelectedHistoryRow = selectedHistoryItem && getPatchQueueItemKey(selectedHistoryItem) === itemKey;

                  return (
                    <tr
                      key={itemKey}
                      className={isSelectedHistoryRow ? 'is-selected-history-row' : ''}
                      onClick={() => selectHistoryItem(item)}
                    >
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
                        <span className={`patch-available ${patchState.className}`}>
                          {patchState.label}
                        </span>
                      </td>
                      <td>
                        {item.in_container
                          ? `Container: ${item.container_name || 'N/A'}`
                          : `Host · ${item.environment || 'N/A'}`}
                      </td>
                      <td>
                        <div className="patch-actions">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openInGraph(item);
                            }}
                          >
                            Ver
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              refreshPatchesForCVE?.(item.cve_id);
                            }}
                          >
                            Refresh CVE
                          </button>
                          {hasPatchAvailable && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedPatchItem(item);
                              }}
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

          {patchQueueTotalPages > 1 && (
            <div className="patch-pagination-container">
              <button
                className="patch-pagination-btn"
                onClick={() => handlePageChange(patchQueuePage - 1)}
                disabled={patchQueuePage <= 1 || patchQueueLoading}
              >
                &laquo; Anterior
              </button>

              <div className="patch-pagination-pages">
                {renderPageNumbers()}
              </div>

              <button
                className="patch-pagination-btn"
                onClick={() => handlePageChange(patchQueuePage + 1)}
                disabled={patchQueuePage >= patchQueueTotalPages || patchQueueLoading}
              >
                Siguiente &raquo;
              </button>

              <span className="patch-pagination-info">
                Página {patchQueuePage} de {patchQueueTotalPages}
              </span>
            </div>
          )}
        </div>

        <AppliedPatchHistoryPanel
          selectedItem={selectedHistoryItem}
          history={appliedPatchHistory}
          loading={appliedPatchHistoryLoading}
          error={appliedPatchHistoryError}
        />
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

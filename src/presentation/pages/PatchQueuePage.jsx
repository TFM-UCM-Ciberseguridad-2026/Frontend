import React, { useEffect, useState } from 'react';
import { ApplyPatchModal } from '../components/PatchQueue/ApplyPatchModal';
import { AppliedPatchHistoryPanel } from '../components/PatchQueue/AppliedPatchHistoryPanel';
import { PatchQueueFilters } from '../components/PatchQueue/PatchQueueFilters';
import { ActivePatchQueueFilterChips } from '../components/PatchQueue/ActivePatchQueueFilterChips';
import { usePatchQueue } from '../hooks/usePatchQueue';
import './PatchQueuePage.css';
import { formatPercent } from '../components/Risk/riskFormat';

const percent = formatPercent;

function tierClass(tier) {
  return `patch-tier patch-tier-${String(tier || 'low').toLowerCase()}`;
}

function patchAvailability(item) {
  switch (item.remediation_kind) {
    case 'OFFICIAL_FIX':
      return { label: 'Patch oficial', className: 'yes' };
    case 'MITIGATION':
    case 'TEMPORARY_FIX':
    case 'WORKAROUND':
      return { label: 'Mitigación', className: 'warning' };
    case 'UNAVAILABLE':
    default:
      return { label: 'Sin remediación', className: 'no' };
  }
}

export function PatchQueuePage({
  selectedProjectId,
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
  fetchAppliedPatchHistory,
  patchFocus,
  onPatchFocusConsumed
}) {
  // Centralized hook for advanced filtering, sorting, and pagination
  const {
    filters,
    updateFilter,
    removeFilter,
    clearAllFilters,
    sortField,
    sortDirection,
    handleSort,
    page,
    totalPages,
    totalItems,
    priorityTierCounts,
    queue,
    loading: patchQueueLoading,
    error: patchQueueError,
    goToPage,
    refetch
  } = usePatchQueue(selectedProjectId);

  const [selectedPatchItem, setSelectedPatchItem] = useState(null);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);

  useEffect(() => {
    setSelectedHistoryItem(null);
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedPatchItem?.cve_id) return;
    fetchPatchesForCVE?.(selectedPatchItem.cve_id);
  }, [selectedPatchItem?.cve_id, fetchPatchesForCVE]);

  // Llegada desde la ficha de una técnica ATT&CK: se filtra la cola por su CVE. El
  // filtro pasa por el debounce del hook, así que la fila tarda un momento en aparecer
  // y la selección se hace en un efecto aparte, cuando la cola ya se ha recargado.
  useEffect(() => {
    if (!patchFocus?.cve_id) return;
    updateFilter('search', patchFocus.cve_id);
  }, [patchFocus?.cve_id]);

  // Con una sola fila que case, se abre directamente su ficha de aplicación; con varias
  // se deja la cola filtrada, porque elegir activo por el usuario no es cosa nuestra.
  useEffect(() => {
    if (!patchFocus?.cve_id || patchQueueLoading) return;

    const candidatas = queue.filter(item => item.cve_id === patchFocus.cve_id);
    const exacta = patchFocus.asset_id
      ? candidatas.find(item => String(item.asset_id || item.installation_id) === String(patchFocus.asset_id))
      : null;
    const elegida = exacta || (candidatas.length === 1 ? candidatas[0] : null);

    if (elegida) setSelectedPatchItem(elegida);
    if (candidatas.length > 0 || totalItems === 0) onPatchFocusConsumed?.();
  }, [patchFocus?.cve_id, patchFocus?.asset_id, queue, patchQueueLoading, totalItems]);

  const openInGraph = (item) => {
    const found = focusPatchQueueItem?.(item);
    if (found) {
      setActiveNav?.('grafo');
    }
  };

  const getPatchQueueItemKey = (item) =>
    `${item.asset_type || 'SOFTWARE_INSTALLATION'}-${item.asset_id || item.installation_id}-${item.cve_id}-${item.finding_id}`;

  const selectedPatchItemKey = selectedPatchItem ? getPatchQueueItemKey(selectedPatchItem) : null;
  const currentSelectedPatchItem = selectedPatchItemKey
    ? queue.find(item => getPatchQueueItemKey(item) === selectedPatchItemKey) || selectedPatchItem
    : null;

  const submitPatchApplication = async (payload) => {
    if (!currentSelectedPatchItem) return;

    const assetType = currentSelectedPatchItem.asset_type || 'SOFTWARE_INSTALLATION';
    const assetId = currentSelectedPatchItem.asset_id || currentSelectedPatchItem.installation_id;
    await declarePatchApplied?.(
      assetId,
      { ...payload, asset_type: assetType, asset_id: assetId, finding_id: currentSelectedPatchItem.finding_id },
      getPatchQueueItemKey(currentSelectedPatchItem)
    );

    if (selectedHistoryItem && getPatchQueueItemKey(selectedHistoryItem) === getPatchQueueItemKey(currentSelectedPatchItem)) {
      await fetchAppliedPatchHistory?.(assetId, assetType);
    }

    setSelectedPatchItem(null);
    refetch();
  };

  const startItem = totalItems === 0 ? 0 : (page - 1) * 20 + 1;
  const endItem = Math.min(page * 20, totalItems);

  const renderSortIcon = (field) => {
    if (sortField !== field) return null;
    return <span className="patch-sort-icon">{sortDirection === 'asc' ? '▲' : '▼'}</span>;
  };

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, page - 2);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          className={`patch-pagination-page ${i === page ? 'active' : ''}`}
          onClick={() => goToPage(i)}
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
    await fetchAppliedPatchHistory?.(item.asset_id || item.installation_id, item.asset_type);
  };

  const handleMetricBadgeClick = (tier) => {
    if (filters.priorityTier === tier) {
      updateFilter('priorityTier', 'ALL');
    } else {
      updateFilter('priorityTier', tier);
    }
  };

  return (
    <section className="patch-queue-page">
      <div className="patch-queue-header">
        <div>
          <p className="eyebrow">Blue Team Operations</p>
          <h2>Patch Queue</h2>
          <p className="patch-queue-subtitle">
            Cola priorizada de remediación según vulnerabilidad y criticidad contextual del activo.
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={async () => {
            await refreshPatchesForProject?.(queue);
            await refetch();
          }}
          disabled={patchQueueLoading || patchProjectRefreshLoading}
        >
          {patchProjectRefreshLoading ? 'Refrescando patches...' : 'Refrescar cola'}
        </button>
      </div>

      {/* Badges de métricas por Nivel de Prioridad */}
      <div className="patch-queue-metrics-bar">
        <div
          className={`patch-metric-badge ${filters.priorityTier === 'ALL' ? 'active' : ''}`}
          onClick={() => handleMetricBadgeClick('ALL')}
          title="Filtrar todas las prioridades"
        >
          <span className="patch-metric-label">TOTAL PENDIENTES</span>
          <span className="patch-metric-count">{totalItems}</span>
        </div>
        <div
          className={`patch-metric-badge patch-metric-critical ${filters.priorityTier === 'CRITICAL' ? 'active' : ''}`}
          onClick={() => handleMetricBadgeClick('CRITICAL')}
          title="Filtrar prioridad CRITICAL"
        >
          <span className="patch-metric-label">🔴 CRITICAL</span>
          <span className="patch-metric-count">{priorityTierCounts.CRITICAL || 0}</span>
        </div>
        <div
          className={`patch-metric-badge patch-metric-high ${filters.priorityTier === 'HIGH' ? 'active' : ''}`}
          onClick={() => handleMetricBadgeClick('HIGH')}
          title="Filtrar prioridad HIGH"
        >
          <span className="patch-metric-label">🟠 HIGH</span>
          <span className="patch-metric-count">{priorityTierCounts.HIGH || 0}</span>
        </div>
        <div
          className={`patch-metric-badge patch-metric-medium ${filters.priorityTier === 'MEDIUM' ? 'active' : ''}`}
          onClick={() => handleMetricBadgeClick('MEDIUM')}
          title="Filtrar prioridad MEDIUM"
        >
          <span className="patch-metric-label">🟡 MEDIUM</span>
          <span className="patch-metric-count">{priorityTierCounts.MEDIUM || 0}</span>
        </div>
        <div
          className={`patch-metric-badge patch-metric-low ${filters.priorityTier === 'LOW' ? 'active' : ''}`}
          onClick={() => handleMetricBadgeClick('LOW')}
          title="Filtrar prioridad LOW"
        >
          <span className="patch-metric-label">🔵 LOW</span>
          <span className="patch-metric-count">{priorityTierCounts.LOW || 0}</span>
        </div>
      </div>

      {/* Controles de Filtro Avanzado */}
      <PatchQueueFilters filters={filters} onUpdateFilter={updateFilter} />

      {/* Chips de Filtros Activos */}
      <ActivePatchQueueFilterChips
        filters={filters}
        onRemoveFilter={removeFilter}
        onClearAll={clearAllFilters}
      />

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
                  <th className="sortable-th" onClick={() => handleSort('priority_score')}>
                    Patch Priority {renderSortIcon('priority_score')}
                  </th>
                  <th className="sortable-th" onClick={() => handleSort('cve')}>
                    CVE {renderSortIcon('cve')}
                  </th>
                  <th className="sortable-th" onClick={() => handleSort('hostname')}>
                    Activo {renderSortIcon('hostname')}
                  </th>
                  <th className="sortable-th" onClick={() => handleSort('software')}>
                    Software {renderSortIcon('software')}
                  </th>
                  <th>Versiones</th>
                  <th className="sortable-th" onClick={() => handleSort('risk')}>
                    Risk {renderSortIcon('risk')}
                  </th>
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

                {!patchQueueLoading && queue.length === 0 && (
                  <tr>
                    <td colSpan="10">No hay findings pendientes que coincidan con los filtros aplicados.</td>
                  </tr>
                )}

                {!patchQueueLoading && queue.map(item => {
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
                        <small>{item.asset_type === 'CONTAINER' ? `Container: ${item.container_id || item.asset_id || 'N/A'}` : item.installation_id}</small>
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
                              refetch();
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

          {totalPages > 1 && (
            <div className="patch-pagination-container">
              <button
                className="patch-pagination-btn"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1 || patchQueueLoading}
              >
                &laquo; Anterior
              </button>

              <div className="patch-pagination-pages">
                {renderPageNumbers()}
              </div>

              <button
                className="patch-pagination-btn"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages || patchQueueLoading}
              >
                Siguiente &raquo;
              </button>

              <span className="patch-pagination-info">
                Página {page} de {totalPages}
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

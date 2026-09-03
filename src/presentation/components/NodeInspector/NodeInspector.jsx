import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RiskSummary } from '../Risk/RiskSummary';
import { EditNodeModal } from './EditNodeModal';
import { DeleteNodeModal } from './DeleteNodeModal';
import { RiskScoreGauge } from '../Risk/RiskScoreGauge';
import { toPercent } from '../Risk/riskFormat';
import { RenameProjectModal, DeleteProjectModal } from '../HudHeader/ProjectActionModals';
import './NodeInspector.css';

const getRiskBadgeClass = (score, tier) => {
  const t = (tier || '').toUpperCase();
  const numScore = Number(score || 0);

  if (t === 'CRITICAL' || numScore >= 0.9) return 'risk-badge-critical';
  if (t === 'HIGH' || numScore >= 0.7) return 'risk-badge-high';
  if (t === 'MEDIUM' || numScore >= 0.4) return 'risk-badge-medium';
  return 'risk-badge-low';
};


const getFindingPatchState = (props = {}) => {
  const status = String(props.status || 'OPEN').toUpperCase();
  const remediationKind = String(
    props.remediation_kind || 'UNAVAILABLE'
  ).toUpperCase();

  const remediationFactorRaw = Number(props.remediation_factor);
  const hasValidRemediationFactor = Number.isFinite(remediationFactorRaw);
  const remediationFactor = hasValidRemediationFactor
    ? remediationFactorRaw
    : 1;

  const hasAvailableRemediation = Boolean(
    props.patch_available ||
    props.fixed_version ||
    (remediationKind && remediationKind !== 'UNAVAILABLE')
  );

  if (status === 'PATCHED') {
    return {
      label: 'PATCHED',
      className: 'finding-state-patched',
      help: 'Finding corregido mediante una remediación oficial aplicada.'
    };
  }

  if (
    status === 'MITIGATED' ||
    (remediationFactor > 0 && remediationFactor < 1)
  ) {
    return {
      label: 'MITIGATED',
      className: 'finding-state-mitigated',
      help: 'Finding tratado con mitigación o corrección temporal. Mantiene riesgo residual.'
    };
  }

  if (hasAvailableRemediation) {
    return {
      label: 'ANALYSED',
      className: 'finding-state-analysed',
      help: 'Finding con remediación conocida disponible, pendiente de aplicar.'
    };
  }

  return {
    label: 'IDENTIFIED',
    className: 'finding-state-identified',
    help: 'Finding identificado sin remediación conocida.'
  };
};



export function NodeInspector({
  selectedNode,
  updateNode,
  deleteNode,
  fetchFindingVulnerabilities,
  selectedExploitationPath,
  renameProject,
  deleteProject
}) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRenameProjectModal, setShowRenameProjectModal] = useState(false);
  const [showDeleteProjectModal, setShowDeleteProjectModal] = useState(false);
  const [expandedFindingId, setExpandedFindingId] = useState(null);

  const findingsList = useMemo(() => {
    if (!selectedNode) return [];
    if (Array.isArray(selectedNode.properties?.findings) && selectedNode.properties.findings.length > 0) {
      return selectedNode.properties.findings;
    }
    const isFinding = selectedNode.primaryLabel === 'Finding' || selectedNode.labels?.includes('Finding');
    if (isFinding) {
      return [selectedNode];
    }
    return [];
  }, [selectedNode]);

  // Calcula el conjunto de IDs de findings que pertenecen a la ruta activa
  const pathFindingKeys = useMemo(() => {
    const keys = { ids: new Set(), cves: new Set() };
    if (!selectedExploitationPath?.steps) return keys;
    selectedExploitationPath.steps.forEach(step => {
      if (!step) return;
      if (step.finding_id) keys.ids.add(String(step.finding_id).trim());
      if (step.vulnerability) keys.cves.add(String(step.vulnerability).trim().toLowerCase());
      if (Array.isArray(step.finding_ids)) step.finding_ids.forEach(id => keys.ids.add(String(id).trim()));
      if (Array.isArray(step.findings)) {
        step.findings.forEach(f => {
          if (f.id) keys.ids.add(String(f.id).trim());
          if (f.cve_id) keys.cves.add(String(f.cve_id).trim().toLowerCase());
        });
      }
    });
    return keys;
  }, [selectedExploitationPath]);

  // Determina si un finding pertenece a la ruta activa
  const isInPath = useCallback((f) => {
    if (!selectedExploitationPath?.steps || selectedExploitationPath.steps.length === 0) return false;

    const rawId = String(f.id ?? '').trim();
    const propId = String(f.properties?.id ?? '').trim();
    const findingId = String(f.properties?.finding_id ?? '').trim();
    const fName = String(f.name || f.properties?.title || f.properties?.nombre || '').trim();
    const fKey = String(f.properties?.finding_key || '').trim().toLowerCase();
    const fCve = String(f.properties?.cve_id || f.properties?.cve || '').trim().toLowerCase();

    const nameMatch = fName.match(/#?(\d+)/);
    const nameNumId = nameMatch ? nameMatch[1] : '';

    const candidateIds = [rawId, propId, findingId, nameNumId].filter(Boolean);

    return selectedExploitationPath.steps.some(step => {
      if (!step) return false;

      const stepFId = String(step.finding_id ?? '').trim();
      const stepVuln = String(step.vulnerability ?? '').trim().toLowerCase();

      if (stepFId) {
        for (const cid of candidateIds) {
          if (cid === stepFId || cid.endsWith(':' + stepFId) || stepFId.endsWith(':' + cid)) {
            return true;
          }
        }
      }

      if (stepVuln) {
        if (fCve && (fCve === stepVuln || fCve.includes(stepVuln) || stepVuln.includes(fCve))) {
          return true;
        }
        if (fKey && fKey.includes(stepVuln)) {
          return true;
        }
        if (fName.toLowerCase().includes(stepVuln)) {
          return true;
        }
      }

      if (Array.isArray(step.finding_ids)) {
        for (const pid of step.finding_ids) {
          const pidStr = String(pid).trim();
          for (const cid of candidateIds) {
            if (cid === pidStr || cid.endsWith(':' + pidStr) || pidStr.endsWith(':' + cid)) {
              return true;
            }
          }
        }
      }

      return false;
    });
  }, [selectedExploitationPath]);

  const sortedFindings = useMemo(() => {
    if (findingsList.length === 0) return [];
    const inPath = [];
    const outPath = [];
    findingsList.forEach(f => {
      if (isInPath(f)) inPath.push(f);
      else outPath.push(f);
    });
    // Sort each group by risk_score DESC
    const byRisk = (a, b) => Number(b.properties?.risk_score || 0) - Number(a.properties?.risk_score || 0);
    return [...inPath.sort(byRisk), ...outPath.sort(byRisk)];
  }, [findingsList, isInPath]);

  const targetPathFindingId = useMemo(() => {
    if (!selectedExploitationPath?.steps || sortedFindings.length === 0) return null;
    const found = sortedFindings.find(f => isInPath(f));
    return found ? String(found.properties?.id ?? found.id) : null;
  }, [selectedExploitationPath, sortedFindings, isInPath]);

  useEffect(() => {
    setShowEditModal(false);
    setShowDeleteModal(false);

    if (targetPathFindingId) {
      setExpandedFindingId(targetPathFindingId);
    } else if (sortedFindings.length > 0) {
      const firstId = String(sortedFindings[0].properties?.id ?? sortedFindings[0].id);
      setExpandedFindingId(firstId);
    } else {
      setExpandedFindingId(null);
    }
  }, [selectedNode?.id, targetPathFindingId, sortedFindings]);

  if (!selectedNode) {
    return (
      <aside className="detail-panel">
        <p className="eyebrow">Propiedades del activo</p>
        <div className="detail-empty">
          ◌<br />
          SELECCIONA UN NODO<br />
          DEL GRAFO PARA VER<br />
          SUS PROPIEDADES
        </div>
      </aside>
    );
  }

  const categoryLabel = selectedNode.primaryLabel || selectedNode.labels?.[0] || 'Unknown';
  const nodeName = selectedNode.name || selectedNode.properties?.title || selectedNode.properties?.nombre || 'Sin Nombre';
  const isManageableAsset = ['Endpoint', 'Network', 'Hardware', 'Container', 'Software', 'SoftwareInstallation'].includes(categoryLabel);
  const canEdit = isManageableAsset && typeof updateNode === 'function';
  const canDelete = isManageableAsset && typeof deleteNode === 'function';
  const isProject = categoryLabel === 'Project';
  const canEditProject = isProject && typeof renameProject === 'function';
  const canDeleteProject = isProject && typeof deleteProject === 'function';
  const isFindingGroup = sortedFindings.length > 0;

  const toggleFinding = (id) => {
    const targetId = String(id);
    setExpandedFindingId(prev => (prev === targetId ? null : targetId));
  };

  return (
    <aside className="detail-panel">
      <p className="eyebrow">Propiedades del activo</p>
      <div className="inspector-padding">
        <span className="badge">{categoryLabel.toUpperCase()}</span>
        <h2 className="node-title">{nodeName}</h2>

        {/* ACCIONES DE GESTIÓN */}
        {(canDelete || canEdit || canEditProject || canDeleteProject) && (
          <div className="node-actions-group">
            {canEdit && (
              <button
                type="button"
                className="btn btn-secondary btn-node-action"
                onClick={() => setShowEditModal(true)}
              >
                ✏️ Editar Activo
              </button>
            )}

            {canEditProject && (
              <button
                type="button"
                className="btn btn-secondary btn-node-action"
                onClick={() => setShowRenameProjectModal(true)}
                title="Renombrar este proyecto"
              >
                ✏️ Renombrar
              </button>
            )}

            {canDelete && (
              <button
                type="button"
                className="btn btn-secondary btn-node-action btn-node-delete"
                onClick={() => setShowDeleteModal(true)}
              >
                🗑️ Eliminar
              </button>
            )}

            {canDeleteProject && (
              <button
                type="button"
                className="btn btn-secondary btn-node-action btn-node-delete"
                onClick={() => setShowDeleteProjectModal(true)}
                title="Eliminar este proyecto"
              >
                🗑️ Eliminar
              </button>
            )}
          </div>
        )}

        {/* VISTA DE ACORDEÓN DE HALLAZGOS */}
        {isFindingGroup ? (
          <div className="findings-accordion-list">
            {sortedFindings.map((finding, index) => {
              const props = finding.properties || {};
              const rawId = props.id ?? finding.id ?? index;
              const fId = String(rawId);
              const inPath = isInPath(finding);
              const propFindingId = String(props.finding_id || '').trim();
              const propId = String(props.id || '').trim();
              const fNameStr = String(finding.name || props.title || props.nombre || '').trim();
              const nameMatchStr = fNameStr.match(/#?(\d+)/);
              const numIdStr = nameMatchStr ? nameMatchStr[1] : '';
              const cIds = [fId, propId, propFindingId, numIdStr].filter(Boolean);

              // Intentar extraer la CVE directamente de las propiedades del hallazgo (cve_id, cve, finding_key, title, name)
              const directCve = (() => {
                if (props.cve_id) return String(props.cve_id).trim();
                if (props.cve) return String(props.cve).trim();
                if (finding.cve_id) return String(finding.cve_id).trim();
                if (finding.cve) return String(finding.cve).trim();

                const combinedStr = `${props.finding_key || ''} ${props.title || ''} ${finding.name || ''} ${fId}`;
                const m = combinedStr.match(/(CVE-\d{4}-\d+|GHSA-[a-z0-9-]+)/i);
                return m ? m[1].toUpperCase() : '';
              })();

              // Muestra la CVE correspondiente a la etapa de la ruta activa para este finding
              const pathCve = inPath
                ? (selectedExploitationPath?.steps?.find(s => {
                    if (!s) return false;
                    const sFId = String(s.finding_id || s.findingId || '').trim();
                    const sCve = String(s.vulnerability || s.cve_id || s.cve || '').trim().toUpperCase();

                    const matchesFId = sFId && cIds.some(cid => cid === sFId || cid.endsWith(':' + sFId) || sFId.endsWith(':' + cid));
                    const matchesCve = sCve && (directCve === sCve || fNameStr.toUpperCase().includes(sCve));
                    return matchesFId || matchesCve;
                  })?.vulnerability || '')
                : '';

              const cveId = directCve || pathCve || '';
              const titleName = props.title || finding.name || `Finding #${fId}`;
              const isExpanded = expandedFindingId === fId;
              const isPathTarget = inPath;
              const hasVulns = Boolean(
                props.has_vulnerabilities ||
                finding.hasVuln ||
                cveId
              );

              const riskPct = toPercent(props.risk_score) ?? 0;
              const badgeClass = getRiskBadgeClass(props.risk_score, props.risk_tier);
              const findingPatchState = getFindingPatchState(props);

              return (
                <div key={fId} className={`finding-accordion-card ${findingPatchState.className} ${isPathTarget ? 'is-path-target' : ''}`}>
                  <div
                    className={`finding-accordion-header ${isExpanded ? 'is-expanded' : ''}`}
                    onClick={() => toggleFinding(fId)}
                  >
                    <div className="finding-accordion-main">
                      <span className="finding-accordion-title">
                        {cveId ? (
                          <span className="cve-chip" style={{ marginRight: '6px', background: 'rgba(239,68,68,0.2)', color: '#f87171', border: '1px solid rgba(239,68,68,0.4)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                            {cveId}
                          </span>
                        ) : null}
                        {titleName}
                      </span>
                      <span
                        className={`finding-state-badge ${findingPatchState.className}`}
                        title={findingPatchState.help}
                      >
                        {findingPatchState.label}
                      </span>
                      {isPathTarget && (
                        <span className="path-target-badge" title="Vulnerabilidad de la ruta de ataque activa">
                          🎯 EN RUTA
                        </span>
                      )}
                    </div>

                    <div className="finding-accordion-meta">
                      <span className={`risk-badge ${badgeClass}`}>
                        {`Risk: ${riskPct}%`}
                      </span>
                      <span className={`finding-accordion-chevron ${isExpanded ? 'is-expanded' : ''}`}>
                        ▼
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="finding-accordion-body">
                      <div className="finding-gauges-row">
                        <RiskScoreGauge score={props.risk_score} tier={props.risk_tier} label="RISK" />
                        <RiskScoreGauge score={props.priority_score} tier={props.priority_tier} label="PRIORITY" />
                      </div>

                      <div className="props finding-props-container">
                        <div className="prop-row">
                          <div className="k">STATUS</div>
                          <div className="v">{props.status || 'OPEN'}</div>
                        </div>

                        <div className="prop-row">
                          <div className="k">PATCH STATE</div>
                          <div className="v">{findingPatchState.label}</div>
                        </div>

                        <div className="prop-row">
                          <div className="k">RISK TIER</div>
                          <div className="v">{props.risk_tier || 'UNKNOWN'}</div>
                        </div>

                        <div className="prop-row">
                          <div className="k">PRIORITY TIER</div>
                          <div className="v">{props.priority_tier || 'UNKNOWN'}</div>
                        </div>

                        <div className="prop-row">
                          <div className="k">IMPACT</div>
                          <div className="v">{props.impact_score ?? 'N/A'}</div>
                        </div>

                        <div className="prop-row">
                          <div className="k">LIKELIHOOD</div>
                          <div className="v">{props.likelihood ?? 'N/A'}</div>
                        </div>

                        <div className="prop-row">
                          <div className="k">EXPOSURE</div>
                          <div className="v">{props.exposure_factor ?? 'N/A'}</div>
                        </div>

                        <div className="prop-row">
                          <div className="k">REMEDIATION FACTOR</div>
                          <div className="v">{props.remediation_factor ?? 'N/A'}</div>
                        </div>

                        <div className="prop-row">
                          <div className="k">REMEDIATION KIND</div>
                          <div className="v">{props.remediation_kind || 'UNAVAILABLE'}</div>
                        </div>

                        <div className="prop-row">
                          <div className="k">PATCH AVAILABLE</div>
                          <div className="v">{props.patch_available ? 'Sí' : 'No'}</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn-ver-cves"
                        disabled={!hasVulns}
                        onClick={() => fetchFindingVulnerabilities?.(finding)}
                      >
                        {hasVulns ? 'Ver CVEs' : 'Sin CVEs asociados'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <>
            <RiskSummary node={selectedNode} />

            <div className="props">
              <div className="prop-row">
                <div className="k">ID Interno Neo4j</div>
                <div className="v">{selectedNode.id}</div>
              </div>
              {Object.entries(selectedNode.properties || {}).map(([k, v]) => {
                if (k === 'findings' || (typeof v === 'object' && v !== null)) {
                  return null;
                }
                let display;
                if (typeof v === 'boolean') {
                  display = <span className={`pill ${v ? 'true' : 'false'}`}>{v ? 'TRUE' : 'FALSE'}</span>;
                } else {
                  display = String(v);
                }
                return (
                  <div className="prop-row" key={k}>
                    <div className="k">{k.replace(/_/g, ' ')}</div>
                    <div className="v">{display}</div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {showEditModal && (
        <EditNodeModal
          node={selectedNode}
          onClose={() => setShowEditModal(false)}
          updateNode={updateNode}
        />
      )}

      {showDeleteModal && (
        <DeleteNodeModal
          node={selectedNode}
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onDelete={deleteNode}
        />
      )}

      <RenameProjectModal
        isOpen={showRenameProjectModal}
        onClose={() => setShowRenameProjectModal(false)}
        project={{
          id: selectedNode.properties?.id ?? selectedNode.id,
          name: selectedNode.name || selectedNode.properties?.nombre
        }}
        onRename={renameProject}
      />
      <DeleteProjectModal
        isOpen={showDeleteProjectModal}
        onClose={() => setShowDeleteProjectModal(false)}
        project={{
          id: selectedNode.properties?.id ?? selectedNode.id,
          name: selectedNode.name || selectedNode.properties?.nombre
        }}
        onDelete={deleteProject}
      />
    </aside>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
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
  const status = String(props.status || '').toUpperCase();
  const remediationKind = String(props.remediation_kind || '').toUpperCase();
  const remediationFactor = Number(props.remediation_factor ?? 1);
  const riskScore = Number(props.risk_score ?? 0);
  const hasAvailableRemediation = Boolean(
    props.patch_available ||
    props.fixed_version ||
    (remediationKind && remediationKind !== 'UNAVAILABLE')
  );

  if (status === 'PATCHED' || remediationFactor === 0 || riskScore === 0) {
    return {
      label: 'PATCHED',
      className: 'finding-state-patched',
      help: 'Finding corregido por un parche oficial. Riesgo efectivo 0.'
    };
  }

  if (status === 'MITIGATED' || (remediationFactor > 0 && remediationFactor < 1)) {
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

/**
 * Filtra y formatea únicamente los atributos visibles y configurables por el usuario
 * al crear o editar el activo, ocultando variables internas del motor de cálculo.
 */
const getVisibleAssetAttributes = (node) => {
  if (!node) return [];
  const props = node.properties || {};
  const cat = node.primaryLabel || node.labels?.[0] || 'Unknown';
  const fields = [];

  switch (cat) {
    case 'Endpoint':
      if (props.hostname || node.name) fields.push({ key: 'Hostname', value: props.hostname || node.name });
      if (props.tipo || props.type) fields.push({ key: 'Tipo de Equipo', value: props.tipo || props.type });
      if (props.status || props.estado) fields.push({ key: 'Estado', value: props.status || props.estado });
      if (props.environment || props.entorno) fields.push({ key: 'Entorno', value: props.environment || props.entorno });
      fields.push({ key: 'Expuesto a Internet', value: Boolean(props.internet_exposed) });
      if (props.confidentiality_req) fields.push({ key: 'Confidencialidad Req.', value: props.confidentiality_req });
      if (props.integrity_req) fields.push({ key: 'Integridad Req.', value: props.integrity_req });
      if (props.availability_req) fields.push({ key: 'Disponibilidad Req.', value: props.availability_req });

      // Formatear direcciones IP y VLANs
      const epsIps = Array.isArray(props.ips) ? props.ips : (props.ip ? [props.ip] : []);
      if (epsIps.length > 0) {
        const formatted = epsIps.map(ip => {
          if (typeof ip === 'object' && ip !== null) {
            return ip.vlan_id ? `${ip.ip || 'Sin IP'} (VLAN ${ip.vlan_id})` : ip.ip;
          }
          return String(ip);
        }).filter(Boolean).join(', ');
        if (formatted) fields.push({ key: 'Direcciones IP / VLAN', value: formatted });
      }
      break;

    case 'Container':
      if (props.name || node.name) fields.push({ key: 'Nombre Contenedor', value: props.name || node.name });
      if (props.state || props.status) fields.push({ key: 'Estado', value: props.state || props.status });
      if (props.image_id || props.image) fields.push({ key: 'Imagen Base', value: props.image_id || props.image });
      fields.push({ key: 'Expuesto a Internet', value: Boolean(props.internet_exposed) });
      fields.push({ key: 'Modo Privilegiado', value: Boolean(props.privileged) });

      const contIps = Array.isArray(props.ips) ? props.ips : (props.ip ? [props.ip] : []);
      if (contIps.length > 0) {
        const formatted = contIps.map(ip => {
          if (typeof ip === 'object' && ip !== null) {
            return ip.vlan_id ? `${ip.ip || 'Sin IP'} (VLAN ${ip.vlan_id})` : ip.ip;
          }
          return String(ip);
        }).filter(Boolean).join(', ');
        if (formatted) fields.push({ key: 'Direcciones IP / VLAN', value: formatted });
      }
      break;

    case 'Hardware':
      if (props.manufacturer || props.fabricante) fields.push({ key: 'Fabricante', value: props.manufacturer || props.fabricante });
      if (props.modelo || props.model) fields.push({ key: 'Modelo', value: props.modelo || props.model });
      if (props.tipo || props.type) fields.push({ key: 'Tipo / Arquitectura', value: props.tipo || props.type });
      if (props.serial_number) fields.push({ key: 'Número de Serie', value: props.serial_number });
      if (props.cpu) fields.push({ key: 'CPU Cores', value: props.cpu });
      if (props.ram_gb !== undefined || props.ram !== undefined) fields.push({ key: 'Memoria RAM', value: `${props.ram_gb ?? props.ram} GB` });
      if (props.storage_gb !== undefined || props.storage !== undefined) fields.push({ key: 'Almacenamiento', value: `${props.storage_gb ?? props.storage} GB` });
      break;

    case 'Software':
      if (props.name || node.name) fields.push({ key: 'Nombre', value: props.name || node.name });
      if (props.vendor) fields.push({ key: 'Fabricante (Vendor)', value: props.vendor });
      if (props.version) fields.push({ key: 'Versión', value: props.version });
      if (props.type) {
        const typeLabels = { a: 'Aplicación / Servicio (a)', o: 'Sistema Operativo (o)', h: 'Hardware / Firmware (h)' };
        fields.push({ key: 'Tipo', value: typeLabels[props.type] || props.type });
      }
      if (props.cpe) fields.push({ key: 'CPE 2.3', value: props.cpe });
      if (props.release_date) fields.push({ key: 'Fecha de Lanzamiento', value: String(props.release_date).split('T')[0] });
      if (props.url) fields.push({ key: 'Sitio Web / Referencia', value: props.url });
      break;

    case 'SoftwareInstallation':
      if (props.associated_endpoint) fields.push({ key: 'Endpoint Asociado', value: props.associated_endpoint });
      if (props.associated_software) fields.push({ key: 'Software Asociado', value: props.associated_software });
      if (props.install_path) fields.push({ key: 'Ruta de Instalación', value: props.install_path });
      if (props.status) fields.push({ key: 'Estado', value: props.status });
      if (props.criticality_level) fields.push({ key: 'Criticidad de Instalación', value: props.criticality_level });
      break;

    case 'Network':
      if (props.nombre || props.name || node.name) fields.push({ key: 'Nombre del Segmento', value: props.nombre || props.name || node.name });
      if (props.cidr) fields.push({ key: 'Rango CIDR', value: props.cidr });
      if (props.gateway) fields.push({ key: 'Gateway IP', value: props.gateway });
      if (props.vlan_id !== undefined && props.vlan_id !== null && props.vlan_id !== 0) fields.push({ key: 'VLAN ID', value: props.vlan_id });
      if (props.descripcion || props.description) fields.push({ key: 'Descripción', value: props.descripcion || props.description });
      break;

    case 'Project':
      if (props.nombre || props.name || node.name) fields.push({ key: 'Nombre del Proyecto', value: props.nombre || props.name || node.name });
      if (props.descripcion || props.description) fields.push({ key: 'Descripción', value: props.descripcion || props.description });
      if (props.type || props.tipo) fields.push({ key: 'Tipo de Proyecto', value: props.type || props.tipo });
      break;

    default: {
      // Lista de claves internas a omitir para cualquier otro tipo
      const internalKeys = [
        'id', 'name', 'nombre', 'title', 'findings', '_ensure_created', 'element_id',
        'technical_driver_installation_id', 'technical_driver_software_name', 'technical_driver_risk_score', 'technical_driver_cve_id',
        'priority_driver_installation_id', 'priority_driver_software_name', 'priority_driver_priority_score', 'priority_driver_cve_id',
        'technical_driver_type', 'technical_driver_asset_id', 'technical_driver_asset_name', 'technical_driver_finding_id',
        'priority_driver_type', 'priority_driver_asset_id', 'priority_driver_asset_name', 'priority_driver_finding_id',
        'driver_finding_id', 'driver_cve_id', 'driver_risk_score', 'risky_software_count', 'risky_endpoint_count', 'risky_asset_count',
        'risk_score', 'risk_tier', 'risk_computed_at', 'priority_score', 'priority_tier', 'priority_computed_at',
        'criticality_multiplier', 'remediation_factor', 'exposure_factor', 'impact_score', 'likelihood', 'urgency_boost', 'asset_criticality',
        'updated_at', 'vuln_scan_started_at', 'vuln_scan_completed_at', 'vuln_scan_cache_hit', 'vuln_scan_total_available',
        'vuln_scan_processed', 'vuln_scan_pages_fetched', 'vuln_scan_cpe'
      ];
      Object.entries(props).forEach(([k, v]) => {
        if (!internalKeys.includes(k) && typeof v !== 'object') {
          fields.push({ key: k.replace(/_/g, ' '), value: v });
        }
      });
      break;
    }
  }

  return fields;
};

export function NodeInspector({
  selectedNode,
  updateNode,
  deleteNode,
  fetchFindingVulnerabilities,
  selectedExploitationPath,
  renameProject,
  deleteProject,
  fetchEndpointPatchHistory
}) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRenameProjectModal, setShowRenameProjectModal] = useState(false);
  const [showDeleteProjectModal, setShowDeleteProjectModal] = useState(false);
  const [expandedFindingId, setExpandedFindingId] = useState(null);

  // Estados para el histórico de parches del Endpoint agrupado por software
  const [endpointHistory, setEndpointHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedSwGroup, setExpandedSwGroup] = useState(null);

  const categoryLabel = selectedNode?.primaryLabel || selectedNode?.labels?.[0] || 'Unknown';
  const isEndpoint = categoryLabel === 'Endpoint';

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

  const sortedFindings = useMemo(() => {
    if (findingsList.length === 0) return [];
    return [...findingsList].sort((a, b) => {
      const rA = Number(a.properties?.risk_score || 0);
      const rB = Number(b.properties?.risk_score || 0);
      return rB - rA;
    });
  }, [findingsList]);

  const targetPathFindingId = useMemo(() => {
    if (!selectedExploitationPath?.steps || sortedFindings.length === 0) return null;

    for (const step of selectedExploitationPath.steps) {
      if (!step) continue;
      const sFindingId = String(step.finding_id || '').trim();
      const sVuln = String(step.vulnerability || '').trim().toLowerCase();

      for (const f of sortedFindings) {
        const fNodeId = String(f.id || '').trim();
        const fPropId = String(f.properties?.id ?? '').trim();
        const fCveId = String(f.properties?.cve_id || f.properties?.cve || '').trim().toLowerCase();

        const isIdMatch = Boolean(
          sFindingId && (
            fNodeId === sFindingId ||
            fPropId === sFindingId ||
            fNodeId.endsWith(':' + sFindingId) ||
            sFindingId.endsWith(':' + fNodeId) ||
            sFindingId.endsWith(':' + fPropId)
          )
        );

        const isCveMatch = Boolean(sVuln && fCveId && (fCveId === sVuln || fCveId.includes(sVuln)));

        if (isIdMatch || isCveMatch) {
          return String(f.properties?.id ?? f.id);
        }
      }
    }

    return null;
  }, [selectedExploitationPath, sortedFindings]);

  useEffect(() => {
    setShowEditModal(false);
    setShowDeleteModal(false);
    setShowRenameProjectModal(false);
    setShowDeleteProjectModal(false);

    if (targetPathFindingId) {
      setExpandedFindingId(targetPathFindingId);
    } else if (sortedFindings.length > 0) {
      const firstId = String(sortedFindings[0].properties?.id ?? sortedFindings[0].id);
      setExpandedFindingId(firstId);
    } else {
      setExpandedFindingId(null);
    }
  }, [selectedNode?.id, targetPathFindingId, sortedFindings]);

  // Carga segura del histórico de parches (evita bucles infinitos y llamadas a funciones inexistentes)
  useEffect(() => {
    let isMounted = true;

    if (isEndpoint && selectedNode?.id) {
      const epId = selectedNode.properties?.id ?? selectedNode.id;
      setHistoryLoading(true);

      if (typeof fetchEndpointPatchHistory === 'function') {
        fetchEndpointPatchHistory(epId)
          .then(data => {
            if (isMounted) {
              setEndpointHistory(data || null);
              if (data?.software_groups?.length > 0) {
                setExpandedSwGroup(data.software_groups[0].installation_id);
              }
            }
          })
          .catch(err => {
            if (isMounted) {
              console.error('Error recuperando histórico de parches del endpoint:', err);
              setEndpointHistory(null);
            }
          })
          .finally(() => {
            if (isMounted) {
              setHistoryLoading(false);
            }
          });
      } else {
        setHistoryLoading(false);
        setEndpointHistory(null);
      }
    } else {
      setEndpointHistory(null);
      setHistoryLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [selectedNode?.id, isEndpoint, fetchEndpointPatchHistory]);

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

  const nodeName = selectedNode.name || selectedNode.properties?.title || selectedNode.properties?.nombre || 'Sin Nombre';
  const isManageableAsset = ['Endpoint', 'Network', 'Hardware', 'Container', 'Software', 'SoftwareInstallation'].includes(categoryLabel);
  const canEdit = isManageableAsset && typeof updateNode === 'function';
  const canDelete = isManageableAsset && typeof deleteNode === 'function';
  const isProject = categoryLabel === 'Project';
  const canEditProject = isProject && typeof renameProject === 'function';
  const canDeleteProject = isProject && typeof deleteProject === 'function';
  const isFindingGroup = sortedFindings.length > 0;
  const visibleAttributes = getVisibleAssetAttributes(selectedNode);

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

        {/* ACCIONES DE GESTIÓN (EDITAR / ELIMINAR / RENOMBRAR) */}
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

        {/* VISTA DE ACORDEÓN DE HALLAZGOS (FINDINGS) */}
        {isFindingGroup ? (
          <div className="findings-accordion-list">
            {sortedFindings.map((finding, index) => {
              const props = finding.properties || {};
              const rawId = props.id ?? finding.id ?? index;
              const fId = String(rawId);
              const titleName = props.title || finding.name || `Finding #${fId}`;
              const isExpanded = expandedFindingId === fId;
              const isPathTarget = targetPathFindingId === fId;
              const hasVulns = Boolean(props.has_vulnerabilities);

              const riskPct = toPercent(props.risk_score) ?? 0;
              const badgeClass = getRiskBadgeClass(props.risk_score, props.risk_tier);
              const findingPatchState = getFindingPatchState(props);

              return (
                <div
                  key={fId}
                  className={`finding-accordion-card ${findingPatchState.className} ${isPathTarget ? 'is-path-target' : ''}`}
                >
                  <div
                    className={`finding-accordion-header ${isExpanded ? 'is-expanded' : ''}`}
                    onClick={() => toggleFinding(fId)}
                  >
                    <div className="finding-accordion-main">
                      <span className="finding-accordion-title">
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
                          <div className="k">ESTADO PARCHE</div>
                          <div className="v">{findingPatchState.label}</div>
                        </div>
                        {props.status && (
                          <div className="prop-row">
                            <div className="k">ESTADO FINDING</div>
                            <div className="v">{props.status}</div>
                          </div>
                        )}
                        {props.first_seen && (
                          <div className="prop-row">
                            <div className="k">DETECTADO EL</div>
                            <div className="v">{new Date(props.first_seen).toLocaleDateString()}</div>
                          </div>
                        )}
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

            {/* SECCIÓN: HISTÓRICO DE PARCHES POR SOFTWARE (SOLO EN ENDPOINTS) */}
            {isEndpoint && (
              <div className="endpoint-patch-history-section">
                <div
                  className="eyebrow"
                  style={{
                    color: '#38bdf8',
                    marginTop: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>🛡️</span> HISTÓRICO DE PARCHES POR SOFTWARE
                </div>

                {historyLoading && (
                  <div className="detail-empty" style={{ margin: '10px 0', fontSize: '11px' }}>
                    Cargando histórico de remediaciones...
                  </div>
                )}

                {!historyLoading && (!endpointHistory?.software_groups || endpointHistory.software_groups.length === 0) && (
                  <div style={{ color: 'var(--muted)', fontSize: '12px', fontStyle: 'italic', padding: '8px 0' }}>
                    No hay software instalado con parches registrados en este equipo.
                  </div>
                )}

                {!historyLoading && endpointHistory?.software_groups?.map((group) => {
                  const isSwExpanded = expandedSwGroup === group.installation_id;
                  const patchesCount = group.applied_patches?.length || 0;
                  const resolvedCount = group.resolved_findings?.length || 0;

                  return (
                    <div key={group.installation_id} className="endpoint-sw-history-card">
                      <div
                        className="endpoint-sw-history-header"
                        onClick={() => setExpandedSwGroup(isSwExpanded ? null : group.installation_id)}
                      >
                        <div>
                          <strong style={{ color: 'var(--c100)', fontSize: '12.5px' }}>{group.software_name}</strong>
                          <span className="version-pill">v{group.current_version}</span>
                        </div>
                        <span className="patches-count-badge">
                          {resolvedCount > 0 ? `${resolvedCount} findings resueltos` : `${patchesCount} parches`} {isSwExpanded ? '▲' : '▼'}
                        </span>
                      </div>

                      {isSwExpanded && (
                        <div className="endpoint-sw-history-body">
                          {resolvedCount === 0 && patchesCount === 0 ? (
                            <div style={{ color: 'var(--muted)', fontSize: '11px', padding: '4px' }}>
                              Sin parches aplicados aún en esta instalación.
                            </div>
                          ) : (
                            (group.resolved_findings || []).map((f, fIdx) => (
                              <div key={fIdx} className="endpoint-applied-patch-row">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span className="patch-cve-badge">{f.cve_id}</span>
                                  <span className={`patch-level-tag ${String(f.remediation_level || 'OFFICIAL_FIX').toLowerCase()}`}>
                                    {f.remediation_level || 'OFFICIAL_FIX'}
                                  </span>
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--c200)', marginTop: '4px' }}>
                                  {f.patch_description || 'Finding solucionado mediante parche'}
                                </div>
                                {f.expected_version && (
                                  <div style={{ fontSize: '10px', color: '#4ade80', marginTop: '2px' }}>
                                    Versión objetivo: {f.expected_version}
                                  </div>
                                )}
                                <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '4px' }}>
                                  Aplicado por: <strong>{f.applied_by || 'operator'}</strong> · {f.applied_at ? new Date(f.applied_at).toLocaleDateString() : 'N/A'}
                                </div>
                                {f.notes && (
                                  <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px', fontStyle: 'italic' }}>
                                    {f.notes}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* TABLA DE ATRIBUTOS CONFIGURADOS DEL ACTIVO (SOLO ATRIBUTOS DE CREACIÓN) */}
            <div className="props" style={{ marginTop: '16px' }}>
              <div className="prop-row">
                <div className="k">ID</div>
                <div className="v">{selectedNode.properties?.id ?? selectedNode.id}</div>
              </div>

              {visibleAttributes.map(({ key, value }) => {
                let display;
                if (typeof value === 'boolean') {
                  display = <span className={`pill ${value ? 'true' : 'false'}`}>{value ? 'TRUE' : 'FALSE'}</span>;
                } else {
                  display = String(value);
                }
                return (
                  <div className="prop-row" key={key}>
                    <div className="k">{key}</div>
                    <div className="v" style={{ wordBreak: 'break-word' }}>{display}</div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* MODALES DE EDICIÓN Y BORRADO */}
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
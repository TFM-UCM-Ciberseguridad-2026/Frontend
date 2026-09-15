import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RiskSummary } from '../Risk/RiskSummary';
import { EditNodeModal } from './EditNodeModal';
import { DeleteNodeModal } from './DeleteNodeModal';
import { RiskScoreGauge } from '../Risk/RiskScoreGauge';
import { toPercent, displayTier, formatPercent } from '../Risk/riskFormat';
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

/**
 * Filtra y formatea únicamente los atributos visibles y configurables por el usuario
 * al crear o editar el activo, ocultando variables internas del motor de cálculo.
 */
const cleanVal = (val) => {
  if (val === undefined || val === null) return null;
  const str = String(val).trim();
  if (str === '' || str === '0' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined' || str.toLowerCase() === 'n/a' || str.toLowerCase() === 'none') {
    return null;
  }
  return str;
};

const getVisibleAssetAttributes = (node) => {
  if (!node) return [];
  const props = node.properties || {};
  const cat = node.primaryLabel || node.labels?.[0] || 'Unknown';
  const fields = [];

  switch (cat) {
    case 'Endpoint': {
      const h = cleanVal(props.hostname || node.name); if (h) fields.push({ key: 'Hostname', value: h });
      const t = cleanVal(props.tipo || props.type); if (t) fields.push({ key: 'Tipo de Equipo', value: t });
      const s = cleanVal(props.status || props.estado); if (s) fields.push({ key: 'Estado', value: s });
      const e = cleanVal(props.environment || props.entorno); if (e) fields.push({ key: 'Entorno', value: e });
      fields.push({ key: 'Expuesto a Internet', value: Boolean(props.internet_exposed) });
      const c = cleanVal(props.confidentiality_req); if (c) fields.push({ key: 'Confidencialidad Req.', value: c });
      const i = cleanVal(props.integrity_req); if (i) fields.push({ key: 'Integridad Req.', value: i });
      const a = cleanVal(props.availability_req); if (a) fields.push({ key: 'Disponibilidad Req.', value: a });

      const epsIps = Array.isArray(props.ips) ? props.ips : (props.ip ? [props.ip] : []);
      if (epsIps.length > 0) {
        const formatted = epsIps.map(ip => {
          if (typeof ip === 'object' && ip !== null) {
            const cleanIpStr = cleanVal(ip.ip);
            if (!cleanIpStr) return null;
            return ip.vlan_id ? `${cleanIpStr} (VLAN ${ip.vlan_id})` : cleanIpStr;
          }
          return cleanVal(ip);
        }).filter(Boolean).join(', ');
        if (formatted) fields.push({ key: 'Direcciones IP / VLAN', value: formatted });
      }
      break;
    }

    case 'Container': {
      const name = cleanVal(props.name || node.name); if (name) fields.push({ key: 'Nombre Contenedor', value: name });
      const st = cleanVal(props.state || props.status); if (st) fields.push({ key: 'Estado', value: st });
      const img = cleanVal(props.image_id || props.image); if (img) fields.push({ key: 'Imagen Base', value: img });
      fields.push({ key: 'Expuesto a Internet', value: Boolean(props.internet_exposed) });
      fields.push({ key: 'Modo Privilegiado', value: Boolean(props.privileged) });

      const contIps = Array.isArray(props.ips) ? props.ips : (props.ip ? [props.ip] : []);
      if (contIps.length > 0) {
        const formatted = contIps.map(ip => {
          if (typeof ip === 'object' && ip !== null) {
            const cleanIpStr = cleanVal(ip.ip);
            if (!cleanIpStr) return null;
            return ip.vlan_id ? `${cleanIpStr} (VLAN ${ip.vlan_id})` : cleanIpStr;
          }
          return cleanVal(ip);
        }).filter(Boolean).join(', ');
        if (formatted) fields.push({ key: 'Direcciones IP / VLAN', value: formatted });
      }
      break;
    }

    case 'Hardware': {
      const mfg = cleanVal(props.manufacturer || props.fabricante); if (mfg) fields.push({ key: 'Fabricante', value: mfg });
      const mod = cleanVal(props.model || props.modelo); if (mod) fields.push({ key: 'Modelo', value: mod });
      const arq = cleanVal(props.architecture || props.tipo || props.type || props.arquitectura); if (arq) fields.push({ key: 'Tipo / Arquitectura', value: arq });
      const sn = cleanVal(props.serial_number || props.numero_serie || props.serial); if (sn) fields.push({ key: 'Número de Serie', value: sn });

      const cpu = cleanVal(props.cpu ?? props.cpu_cores ?? props.cores);
      if (cpu && Number(cpu) > 0) fields.push({ key: 'Núcleos de CPU', value: String(cpu) });

      const ram = cleanVal(props.ram_gb ?? props.ram);
      if (ram && Number(ram) > 0) fields.push({ key: 'Memoria RAM', value: `${ram} GB` });

      const storage = cleanVal(props.storage_gb ?? props.storage ?? props.disk_gb ?? props.disk);
      if (storage && Number(storage) > 0) fields.push({ key: 'Almacenamiento', value: `${storage} GB` });
      break;
    }

    case 'Software': {
      const name = cleanVal(props.name || node.name); if (name) fields.push({ key: 'Nombre', value: name });
      const vendor = cleanVal(props.vendor); if (vendor) fields.push({ key: 'Fabricante (Vendor)', value: vendor });
      const ver = cleanVal(props.version); if (ver) fields.push({ key: 'Versión', value: ver });
      const type = cleanVal(props.type);
      if (type) {
        const typeLabels = { a: 'Aplicación / Servicio (a)', o: 'Sistema Operativo (o)', h: 'Hardware / Firmware (h)' };
        fields.push({ key: 'Tipo', value: typeLabels[type] || type });
      }
      const cpe = cleanVal(props.cpe); if (cpe) fields.push({ key: 'CPE 2.3', value: cpe });
      const rel = cleanVal(props.release_date); if (rel) fields.push({ key: 'Fecha de Lanzamiento', value: String(rel).split('T')[0] });
      const url = cleanVal(props.url); if (url) fields.push({ key: 'Sitio Web / Referencia', value: url });
      break;
    }

    case 'SoftwareInstallation': {
      const ep = cleanVal(props.associated_endpoint); if (ep) fields.push({ key: 'Endpoint Asociado', value: ep });
      const sw = cleanVal(props.associated_software); if (sw) fields.push({ key: 'Software Asociado', value: sw });
      const path = cleanVal(props.install_path); if (path) fields.push({ key: 'Ruta de Instalación', value: path });
      const st = cleanVal(props.status); if (st) fields.push({ key: 'Estado', value: st });
      const crit = cleanVal(props.criticality_level); if (crit) fields.push({ key: 'Criticidad de Instalación', value: crit });
      break;
    }

    case 'Network': {
      const name = cleanVal(props.nombre || props.name || node.name); if (name) fields.push({ key: 'Nombre del Segmento', value: name });
      const cidr = cleanVal(props.cidr); if (cidr) fields.push({ key: 'Rango CIDR', value: cidr });
      const gw = cleanVal(props.gateway); if (gw) fields.push({ key: 'Gateway IP', value: gw });
      const vlan = cleanVal(props.vlan_id); if (vlan && Number(vlan) > 0) fields.push({ key: 'VLAN ID', value: String(vlan) });
      const desc = cleanVal(props.descripcion || props.description); if (desc) fields.push({ key: 'Descripción', value: desc });
      break;
    }

    case 'Project': {
      const name = cleanVal(props.name || node.name); if (name) fields.push({ key: 'Nombre del Proyecto', value: name });
      const desc = cleanVal(props.descripcion || props.description); if (desc) fields.push({ key: 'Descripción', value: desc });
      const type = cleanVal(props.type || props.tipo); if (type) fields.push({ key: 'Tipo de Proyecto', value: type });
      break;
    }

    default: {
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
          const cv = cleanVal(v);
          if (cv) fields.push({ key: k.replace(/_/g, ' '), value: cv });
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
  fetchEndpointPatchHistory,
  nodes = []
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

  // Carga del histórico de parches cuando se selecciona un Endpoint
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
          SELECCIONA UN ELEMENTO<br />
          PARA VER SUS PROPIEDADES
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                Editar Activo
              </button>
            )}

            {canEditProject && (
              <button
                type="button"
                className="btn btn-secondary btn-node-action"
                onClick={() => setShowRenameProjectModal(true)}
                title="Renombrar este proyecto"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                Renombrar
              </button>
            )}

            {canDelete && (
              <button
                type="button"
                className="btn btn-secondary btn-node-action btn-node-delete"
                onClick={() => setShowDeleteModal(true)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Eliminar
              </button>
            )}

            {canDeleteProject && (
              <button
                type="button"
                className="btn btn-secondary btn-node-action btn-node-delete"
                onClick={() => setShowDeleteProjectModal(true)}
                title="Eliminar este proyecto"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Eliminar
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
              const inPath = isInPath(finding);
              const propFindingId = String(props.finding_id || '').trim();
              const propId = String(props.id || '').trim();
              const fNameStr = String(finding.name || props.title || props.nombre || '').trim();
              const nameMatchStr = fNameStr.match(/#?(\d+)/);
              const numIdStr = nameMatchStr ? nameMatchStr[1] : '';
              const cIds = [fId, propId, propFindingId, numIdStr].filter(Boolean);

              const directCve = (() => {
                if (props.cve_id) return String(props.cve_id).trim();
                if (props.cve) return String(props.cve).trim();
                if (finding.cve_id) return String(finding.cve_id).trim();
                if (finding.cve) return String(finding.cve).trim();

                const combinedStr = `${props.finding_key || ''} ${props.title || ''} ${finding.name || ''} ${fId}`;
                const m = combinedStr.match(/(CVE-\d{4}-\d+|GHSA-[a-z0-9-]+)/i);
                return m ? m[1].toUpperCase() : '';
              })();

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

              const riskPct = formatPercent(props.risk_score) ?? 0;
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
                          EN RUTA
                        </span>
                      )}
                    </div>

                    <div className="finding-accordion-meta">
                      <span className={`risk-badge ${badgeClass}`}>
                        {`Risk: ${riskPct}`}
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
                          <div className="k">ESTADO FINDING</div>
                          <div className="v">{props.status || 'OPEN'}</div>
                        </div>

                        <div className="prop-row">
                          <div className="k">ESTADO PARCHE</div>
                          <div className="v">{findingPatchState.label}</div>
                        </div>

                        <div className="prop-row">
                          <div className="k">RISK TIER</div>
                          <div className="v">{displayTier(props.risk_tier, props.risk_score)}</div>
                        </div>

                        <div className="prop-row">
                          <div className="k">PRIORITY TIER</div>
                          <div className="v">{displayTier(props.priority_tier, props.priority_score)}</div>
                        </div>

                        {props.first_seen && (
                          <div className="prop-row">
                            <div className="k">DETECTADO EL</div>
                            <div className="v">{new Date(props.first_seen).toLocaleDateString()}</div>
                          </div>
                        )}

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
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  HISTÓRICO DE PARCHES POR SOFTWARE
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

                  // Se combinan los hallazgos resueltos y los parches aplicados, ordenados de más reciente a más antiguo (applied_at descendente)
                  const rawList = (group.resolved_findings && group.resolved_findings.length > 0)
                    ? group.resolved_findings
                    : (group.applied_patches || []);

                  const sortedHistoryFindings = [...rawList].sort((a, b) => {
                    const timeA = new Date(a.applied_at || 0).getTime();
                    const timeB = new Date(b.applied_at || 0).getTime();
                    return timeB - timeA; // Más recientes arriba
                  });

                  const patchesCount = sortedHistoryFindings.length;

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
                          {patchesCount} {patchesCount === 1 ? 'finding resuelto' : 'findings resueltos'} {isSwExpanded ? '▲' : '▼'}
                        </span>
                      </div>

                      {isSwExpanded && (
                        <div className="endpoint-sw-history-body">
                          {sortedHistoryFindings.length === 0 ? (
                            <div style={{ color: 'var(--muted)', fontSize: '11px', padding: '4px' }}>
                              Sin parches aplicados aún en esta instalación.
                            </div>
                          ) : (
                            sortedHistoryFindings.map((f, fIdx) => (
                              <div key={fIdx} className="endpoint-applied-patch-row">
                                {/* 1. CVE y Badge de nivel de remediación */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span className="patch-cve-badge">{f.cve_id}</span>
                                  <span className={`patch-level-tag ${String(f.remediation_level || 'OFFICIAL_FIX').toLowerCase()}`}>
                                    {f.remediation_level || 'OFFICIAL_FIX'}
                                  </span>
                                </div>

                                {/* 2. Definición del parche CLICABLE (lleva a la URL oficial/referencia) */}
                                <div style={{ fontSize: '11px', marginTop: '4px' }}>
                                  {f.patch_url ? (
                                    <a
                                      href={f.patch_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        color: '#60a5fa',
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        fontWeight: '600'
                                      }}
                                      onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                                      onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                                      title={`Abrir referencia oficial: ${f.patch_url}`}
                                    >
                                      {f.patch_description || 'Parche oficial'}
                                      <svg
                                        width="11"
                                        height="11"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        style={{ flexShrink: 0 }}
                                      >
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                        <polyline points="15 3 21 3 21 9" />
                                        <line x1="10" y1="14" x2="21" y2="3" />
                                      </svg>
                                    </a>
                                  ) : (
                                    <span style={{ color: 'var(--c200)' }}>
                                      {f.patch_description || 'Parche oficial aplicado'}
                                    </span>
                                  )}
                                </div>

                                {/* 3. Versión objetivo */}
                                {(f.expected_version || f.verification?.expected_version) && (
                                  <div style={{ fontSize: '10px', color: '#4ade80', marginTop: '3px' }}>
                                    Versión objetivo: {f.expected_version || f.verification?.expected_version}
                                  </div>
                                )}

                                {/* 4. Operador y Fecha de aplicación */}
                                <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '4px' }}>
                                  Aplicado por: <strong>{f.applied_by || 'operator'}</strong> · {f.applied_at ? new Date(f.applied_at).toLocaleDateString() : 'N/A'} {f.applied_at ? new Date(f.applied_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                </div>

                                {/* 5. Notas técnicas limpias (se oculta el volcado de texto duplicado de la URL) */}
                                {(() => {
                                  if (!f.notes) return null;
                                  const cleanNotes = f.notes.trim();
                                  // Si la nota era el volcado automático anterior con 'Referencia:', se omite
                                  if (cleanNotes.includes('Referencia:') || cleanNotes.includes('Patch seleccionado:') || cleanNotes === 'Declarado desde Patch Queue') {
                                    return null;
                                  }
                                  return (
                                    <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px', fontStyle: 'italic' }}>
                                      {cleanNotes}
                                    </div>
                                  );
                                })()}
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

      {showEditModal && (
        <EditNodeModal
          node={selectedNode}
          allNodes={nodes}
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
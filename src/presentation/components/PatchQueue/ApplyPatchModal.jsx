import React, { useEffect, useState } from 'react';
import { formatPercent } from '../Risk/riskFormat';
import './ApplyPatchModal.css';

const percent = formatPercent;

const cvePattern = /CVE-\d{4}-\d{4,}/gi;

const REMEDIATION_LEVEL_HELP = {
  OFFICIAL_FIX: 'Parche oficial del proveedor. Actualiza la versión del software, cierra el finding y reduce el riesgo a 0.',
  TEMPORARY_FIX: 'Corrección temporal o hotfix. Reduce parcialmente el riesgo residual pero no cierra definitivamente la vulnerabilidad.',
  WORKAROUND: 'Mitigación operativa o configuración compensatoria.',
  UNAVAILABLE: 'No hay parche aplicable todavía. Se registra la decisión en auditoría, pero no reduce el riesgo.'
};

function parseVersionSegments(version) {
  return String(version || '')
    .split(/[.-]/)
    .map(segment => Number.parseInt(segment, 10))
    .filter(Number.isFinite);
}

function compareVersions(a, b) {
  const aSegments = parseVersionSegments(a);
  const bSegments = parseVersionSegments(b);
  const maxLength = Math.max(aSegments.length, bSegments.length);

  for (let index = 0; index < maxLength; index += 1) {
    const aValue = aSegments[index] || 0;
    const bValue = bSegments[index] || 0;
    if (aValue > bValue) return 1;
    if (aValue < bValue) return -1;
  }

  return 0;
}

function parseFixedVersionEntry(entry) {
  const raw = String(entry || '').trim();
  if (!raw) return null;

  const atIndex = raw.lastIndexOf('@');
  const packageName = atIndex >= 0 ? raw.slice(0, atIndex).trim() : '';
  const version = atIndex >= 0 ? raw.slice(atIndex + 1).trim() : raw;

  if (!version) return null;

  return {
    raw,
    packageName,
    version
  };
}

function getFixedVersionCandidates(fixedVersion, currentVersion) {
  const current = String(currentVersion || '').trim();
  if (!fixedVersion) return [];

  const entries = String(fixedVersion)
    .split(',')
    .map(parseFixedVersionEntry)
    .filter(Boolean);

  if (!current) {
    return entries;
  }

  return entries
    .filter(entry => compareVersions(entry.version, current) > 0)
    .sort((a, b) => compareVersions(a.version, b.version));
}

function descriptionMatchesCurrentCVE(description, cveId) {
  if (!description || !cveId) return true;
  const matches = description.match(cvePattern);
  if (!matches || matches.length === 0) return true;
  return matches.some(match => match.toUpperCase() === String(cveId).toUpperCase());
}

function getPatchActionType(fixedVersion, selectedPatch) {
  if (fixedVersion) return 'Actualización de versión';
  if (selectedPatch?.official === true) return 'Referencia oficial / advisory';
  if (selectedPatch?.reference_type === 'FIXED_VERSION') {
    return 'Evidencia de versión corregida (OSV)';
  }
  if (selectedPatch?.url) return 'Referencia de remediación';
  return 'Sin acción concreta disponible';
}

function inferRemediationLevelFromPatch(patch, item) {
  if (patch?.reference_type === 'MITIGATION') return 'WORKAROUND';
  if (patch?.fixed_version || item?.fixed_version) return 'OFFICIAL_FIX';
  if (patch?.official === true) return 'TEMPORARY_FIX';
  if (patch?.reference_type === 'FIXED_VERSION') return 'OFFICIAL_FIX';
  return 'UNAVAILABLE';
}

function getPatchLinkLabel(patch) {
  if (!patch?.url || !/^https?:\/\//i.test(patch.url)) {
    return '';
  }

  return patch.official === true
    ? 'Abrir referencia oficial'
    : 'Ver evidencia en OSV';
}

function getPatchSourceLabel(patch) {
  if (patch?.official === true) {
    return 'Fabricante / upstream';
  }

  return patch?.source || 'OSV';
}

function Field({ label, value }) {
  return (
    <div className="apply-patch-field">
      <span className="apply-patch-label">{label}</span>
      <span className="apply-patch-value">{value || 'N/A'}</span>
    </div>
  );
}

export function ApplyPatchModal({
  isOpen,
  item,
  patches = [],
  patchesLoading = false,
  patchesError = null,
  loading,
  error,
  onClose,
  onSubmit
}) {
  const [patchId, setPatchId] = useState('');
  const [selectedFixedVersion, setSelectedFixedVersion] = useState('');
  const [appliedBy, setAppliedBy] = useState('operator');
  const [notes, setNotes] = useState('Declarado desde Patch Queue');
  const [localError, setLocalError] = useState(null);

  useEffect(() => {
    if (!isOpen || !item) return;
    setPatchId('');
    setSelectedFixedVersion('');
    setAppliedBy('operator');
    setNotes('Declarado desde Patch Queue');
    setLocalError(null);
  }, [isOpen, item]);

  useEffect(() => {
    if (!isOpen || !item || patchId || patches.length === 0) return;
    setPatchId(String(patches[0].patch_id));
  }, [isOpen, item, patches, patchId]);

  useEffect(() => {
    if (!isOpen || !item || selectedFixedVersion) return;
    const candidates = getFixedVersionCandidates(
      item.fixed_version,
      item.software_version
    );
    if (candidates.length > 0) {
      setSelectedFixedVersion(candidates[0].raw);
    }
  }, [isOpen, item, selectedFixedVersion]);

  if (!isOpen || !item) return null;

  const hasPatchAvailable = Boolean(item.patch_available);
  const displayError = localError || error;
  const selectedPatch = patches.find(p => String(p.patch_id) === String(patchId)) || patches[0] || null;
  const fixedVersion = item.fixed_version || '';
  const fixedVersionCandidates = getFixedVersionCandidates(
    fixedVersion,
    item.software_version
  );
  const selectedCandidate =
    fixedVersionCandidates.find(candidate => candidate.raw === selectedFixedVersion) ||
    fixedVersionCandidates[0] ||
    null;

  const recommendedFixedVersion = selectedCandidate?.raw || '';
  const hasMultipleFixedVersionCandidates = fixedVersionCandidates.length > 1;
  const selectedRemediationLevel = inferRemediationLevelFromPatch(selectedPatch, item);
  const patchActionType = getPatchActionType(recommendedFixedVersion, selectedPatch);

  const patchRecommendation = (() => {
    if (hasMultipleFixedVersionCandidates) {
      return `Hay ${fixedVersionCandidates.length} versiones corregidas candidatas para ${item.software_name ||
        'este software'}. Selecciona la versión aplicable al paquete instalado antes de declarar el parche.`;
    }

    if (recommendedFixedVersion) {
      return `Actualizar ${item.software_name || 'el software'} desde ${item.software_version || 'la versión actual'} a ${recommendedFixedVersion}.`;
    }

    if (selectedPatch?.url) {
      const evidenceLabel = selectedPatch.official === true
        ? 'la referencia oficial'
        : 'la evidencia publicada en OSV';
      const temporaryOfficialNotice = selectedRemediationLevel === 'TEMPORARY_FIX' && selectedPatch.official === true
        ? ' La referencia es oficial, pero no incluye una versión normalizada; se aplicará como corrección temporal.'
        : '';
      return `${selectedRemediationLevel === 'WORKAROUND' ? 'Revisar' : 'Aplicar'} ${evidenceLabel} y aplicar la ${selectedRemediationLevel === 'WORKAROUND' ? 'mitigación' : 'corrección'} indicada para ${item.cve_id}.
        No hay fixed_version normalizada en el backend.${temporaryOfficialNotice}`;
    }

    return 'No hay recomendación accionable suficiente. Refresca patches o revisa el CVE manualmente antes de declarar el parche.';
  })();

  const submit = async (event) => {
    event.preventDefault();
    setLocalError(null);

    if (!(item.installation_id || item.container_id || item.asset_id) || !item.cve_id) {
      setLocalError('La fila no contiene un activo o cve_id');
      return;
    }

    if (!hasPatchAvailable) {
      setLocalError(
        'No hay patch registrado para este CVE. Usa Refresh patches primero antes de declarar una remediación.'
      );
      return;
    }

    if (!patchId) {
      setLocalError('Selecciona una referencia de patch antes de declarar la remediación.');
      return;
    }

    const numericPatchId = Number(patchId);
    if (!Number.isInteger(numericPatchId) || numericPatchId <= 0) {
      setLocalError('El patch seleccionado no es válido.');
      return;
    }

    const targetVersionPayload = selectedFixedVersion || recommendedFixedVersion || '';

    const payload = {
      cve_id: item.cve_id,
      patch_id: numericPatchId,
      remediation_level: selectedRemediationLevel,
      applied_by: appliedBy.trim() || 'operator',
      target_version: targetVersionPayload,
      notes: [
        notes.trim() || 'Declarado desde Patch Queue',
        targetVersionPayload ? `Versión corregida objetivo: ${targetVersionPayload}` : '',
        selectedPatch?.description ? `Patch seleccionado: ${selectedPatch.description}` : '',
        selectedPatch?.url ? `Referencia: ${selectedPatch.url}` : ''
      ].filter(Boolean).join('\n')
    };

    await onSubmit(payload);
  };

  return (
    <div className="apply-patch-modal-backdrop" role="presentation">
      <form className="apply-patch-modal" onSubmit={submit}>
        <div className="apply-patch-modal-header">
          <div>
            <p className="eyebrow">Blue Team Remediation</p>
            <h2>Aplicar patch</h2>
            <span className="apply-patch-cve">{item.cve_id}</span>
          </div>
          <button
            type="button"
            className="apply-patch-close"
            onClick={onClose}
            disabled={loading}
            aria-label="Cerrar modal"
          >
            ×
          </button>
        </div>

        <div className="apply-patch-modal-body">
          <section className="apply-patch-section">
            <h3>Contexto afectado</h3>
            <div className="apply-patch-context-grid">
              <Field label="Finding ID" value={item.finding_id} />
              <Field label="Endpoint" value={item.hostname} />
              <Field label="Endpoint ID" value={item.endpoint_id} />
              <Field label="Environment" value={item.environment} />
              <Field label="Software" value={item.software_name} />
              <Field label="Versión actual" value={item.software_version} />
              <Field label="Installation ID" value={item.installation_id} />
              <Field label="Activo de remediación" value={item.asset_type === 'CONTAINER' ? `Container: ${item.container_id || item.asset_id}` : `SoftwareInstallation: ${item.installation_id}`} />
              <Field label="Contexto" value={item.in_container ? `Container: ${item.container_name || 'N/A'}` : 'Host'} />
            </div>
          </section>

          <section className="apply-patch-section">
            <h3>Resumen y propuesta</h3>
            <div className="apply-patch-context-grid">
              <Field label="Remediación disponible" value={hasPatchAvailable ? 'Sí' : 'No'} />
              <Field label="Patch Priority" value={`${item.priority_tier || 'LOW'} · ${percent(item.priority_score)}`} />

              <Field
                label="Fixed versions candidatas"
                value={
                  fixedVersionCandidates.length > 1
                    ? `${fixedVersionCandidates.length} versiones disponibles`
                    : recommendedFixedVersion || 'pendiente'
                }
              />

              <Field label="Tipo de acción" value={patchActionType} />
            </div>

            {fixedVersion && fixedVersionCandidates.length === 0 && (
              <p className="apply-patch-help">
                Hay fixed_versions en backend, pero ninguna coincide con este software y una versión superior a {item.software_version || 'la actual'}.
              </p>
            )}

            {patchesLoading && (
              <p className="apply-patch-help">Cargando detalles de los parches registrados...</p>
            )}

            {patchesError && (
              <div className="apply-patch-error">⚠️ {patchesError}</div>
            )}

            {/* LISTA DE PROPUESTAS DE PATCH REGISTRADAS */}
            {patches.length > 0 && (
              <div className="apply-patch-proposals-list">
                {patches.map((patchItem) => {
                  const isSelected = String(patchItem.patch_id) === String(patchId);
                  const remediationLevel = inferRemediationLevelFromPatch(patchItem, item);
                  const patchLinkLabel = getPatchLinkLabel(patchItem);
                  const patchDesc = descriptionMatchesCurrentCVE(patchItem.description, item.cve_id)
                    ? patchItem.description
                    : patchItem.official === true
                      ? 'Referencia oficial / aviso de seguridad'
                      : 'Actualización recomendada según OSV';

                  return (
                    <div
                      key={patchItem.patch_id}
                      className={`apply-patch-recommendation ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => setPatchId(String(patchItem.patch_id))}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="apply-patch-proposal-header">
                        <span className="apply-patch-label">
                          Propuesta de patch #{patchItem.patch_id}
                        </span>
                        <span className="apply-patch-proposal-badges">
                          <span className="apply-patch-remediation-badge">
                            {remediationLevel}
                          </span>
                          {isSelected && (
                            <span className="apply-patch-selected-badge">
                              ✓ Seleccionado
                            </span>
                          )}
                        </span>
                      </div>

                      <strong>
                        {remediationLevel === 'OFFICIAL_FIX' && recommendedFixedVersion
                            ? `Actualizar ${item.software_name || 'software'} a versión ${recommendedFixedVersion}`
                            : remediationLevel === 'WORKAROUND' && recommendedFixedVersion
                              ? `Mitigación: actualizar ${item.software_name || 'software'} a ${recommendedFixedVersion} según OSV`
                              : remediationLevel === 'TEMPORARY_FIX'
                                ? `Aplicar corrección temporal para ${item.cve_id}`
                                : remediationLevel === 'UNAVAILABLE'
                                  ? `Sin remediación disponible para ${item.cve_id}`
                                  : patchItem.official === true
                                    ? `Corrección oficial para ${item.cve_id}`
                                    : `Evidencia de corrección para ${item.cve_id}`}
                      </strong>

                      {patchDesc && (
                        <small>{patchDesc}</small>
                      )}

                      <small>Fuente: {getPatchSourceLabel(patchItem)}</small>

                      {patchLinkLabel && (
                        <a
                          href={patchItem.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {patchLinkLabel} ({patchItem.url})
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="apply-patch-recommendation">
              <span className="apply-patch-label">Recomendación General</span>
              <strong>{patchRecommendation}</strong>
            </div>

            <p className="apply-patch-help">
              Al aplicar un <strong>{selectedRemediationLevel}</strong>, el sistema actualizará la versión instalada a la versión objetivo, cerrará los findings asociados y lanzará automáticamente un nuevo escaneo de vulnerabilidades y el recálculo de riesgo del endpoint.
              <br />
              {REMEDIATION_LEVEL_HELP[selectedRemediationLevel]}
            </p>
          </section>

          <section className="apply-patch-section">
            <h3>Declaración</h3>

            <label className="apply-patch-form-field">
              <span>Patch propuesto</span>
              <select
                className="apply-patch-input"
                value={patchId}
                onChange={(event) => setPatchId(event.target.value)}
                disabled={loading}
              >
                <option value="">Resolver automáticamente si hay una única referencia disponible</option>
                {patches.map(patch => {
                  const remediationLevel = inferRemediationLevelFromPatch(patch, item);
                  const patchDesc = descriptionMatchesCurrentCVE(patch.description, item.cve_id)
                    ? patch.description || (patch.official === true
                      ? 'Referencia oficial'
                      : 'Actualización recomendada según OSV')
                    : patch.official === true
                      ? 'Referencia oficial / advisory'
                      : 'Actualización recomendada según OSV';

                  const urlText = getPatchLinkLabel(patch) ? ` — ${patch.url}` : '';

                  return (
                    <option key={patch.patch_id} value={patch.patch_id}>
                      {`${remediationLevel} · ${patchDesc}${urlText}`}
                    </option>
                  );
                })}
              </select>
              <small>
                Selecciona la referencia o corrección que estás declarando como aplicada sobre esta instalación.
              </small>
            </label>

            {fixedVersionCandidates.length > 0 && (
              <label className="apply-patch-form-field">
                <span>Versión corregida a aplicar</span>
                <select
                  className="apply-patch-input"
                  value={selectedFixedVersion}
                  onChange={(event) => setSelectedFixedVersion(event.target.value)}
                  disabled={loading}
                >
                  {fixedVersionCandidates.map(candidate => (
                    <option key={candidate.raw} value={candidate.raw}>
                      {candidate.raw}
                    </option>
                  ))}
                </select>
                <small>
                  Solo se muestran versiones mayores que la versión actual y compatibles con el software.
                </small>
              </label>
            )}

            <label className="apply-patch-form-field">
              <span>Aplicado por</span>
              <input
                type="text"
                className="apply-patch-input"
                value={appliedBy}
                onChange={(event) => setAppliedBy(event.target.value)}
                disabled={loading}
              />
            </label>

            <label className="apply-patch-form-field">
              <span>Notas</span>
              <textarea
                className="apply-patch-input apply-patch-textarea"
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                disabled={loading}
              />
            </label>
          </section>

          {displayError && (
            <div className="apply-patch-error">⚠️ {displayError}</div>
          )}
        </div>

        <div className="apply-patch-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-accent"
            disabled={loading || !hasPatchAvailable}
          >
            {loading ? 'Aplicando...' : 'Declarar remediación'}
          </button>
        </div>
      </form>
    </div>
  );
}

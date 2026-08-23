import React, { useEffect, useState } from 'react';
import './ApplyPatchModal.css';

const percent = (value) => `${Math.round(Number(value || 0) * 100)}%`;

const cvePattern = /CVE-\d{4}-\d{4,}/gi;

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

function getFixedVersionCandidates(fixedVersion, currentVersion, softwareName) {
  const current = String(currentVersion || '').trim();
  if (!fixedVersion || !current) return [];

  const normalizedSoftwareName = String(softwareName || '').toLowerCase().trim();
  const entries = String(fixedVersion)
    .split(',')
    .map(parseFixedVersionEntry)
    .filter(Boolean);

  return entries
    .filter(entry => {
      const packageMatches = !normalizedSoftwareName ||
        entry.packageName.toLowerCase().includes(normalizedSoftwareName);
      return packageMatches && compareVersions(entry.version, current) > 0;
    })
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
  if (selectedPatch?.url) return 'Referencia oficial / advisory';
  return 'Sin acción concreta disponible';
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
      item.software_version,
      item.software_name
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
  const fixedVersionCandidates = getFixedVersionCandidates(fixedVersion, item.software_version, item.software_name);
  const selectedCandidate = fixedVersionCandidates.find(candidate => candidate.raw === selectedFixedVersion) || fixedVersionCandidates[0] || null;
  const recommendedFixedVersion = selectedCandidate?.raw || '';
  const patchActionType = getPatchActionType(recommendedFixedVersion, selectedPatch);

  const patchRecommendation = recommendedFixedVersion
    ? `Actualizar ${item.software_name || 'el software'} desde ${item.software_version || 'la versión actual'} a ${recommendedFixedVersion}.`
    : selectedPatch?.url
      ? `Revisar la referencia oficial y aplicar la corrección indicada por el proveedor para ${item.cve_id}. No hay fixed_version normalizada en el backend.`
      : 'No hay recomendación accionable suficiente. Refresca patches o revisa el CVE manualmente antes de declarar el parche.';

  const submit = async (event) => {
    event.preventDefault();
    setLocalError(null);

    if (!item.installation_id || !item.cve_id) {
      setLocalError('La fila no contiene installation_id o cve_id');
      return;
    }

    if (!hasPatchAvailable) {
      setLocalError('No hay patch registrado para este CVE. Usa Refresh patches primero.');
      return;
    }

    const payload = {
      cve_id: item.cve_id,
      remediation_level: 'OFFICIAL_FIX',
      applied_by: appliedBy.trim() || 'operator',
      notes: [
        notes.trim() || 'Declarado desde Patch Queue',
        recommendedFixedVersion ? `Versión corregida seleccionada: ${recommendedFixedVersion}` : ''
      ].filter(Boolean).join('\n')
    };

    const trimmedPatchId = patchId.trim();
    if (trimmedPatchId !== '') {
      const numericPatchId = Number(trimmedPatchId);
      if (!Number.isInteger(numericPatchId) || numericPatchId <= 0) {
        setLocalError('patch_id debe ser un entero positivo');
        return;
      }
      payload.patch_id = numericPatchId;
    }

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
              <Field label="Contexto" value={item.in_container ? `Container: ${item.container_name || 'N/A'}` : 'Host'} />
            </div>
          </section>

          <section className="apply-patch-section">
            <h3>Resumen y propuesta</h3>
            <div className="apply-patch-context-grid">
              <Field label="Patch oficial disponible" value={hasPatchAvailable ? 'Sí' : 'No'} />
              <Field label="Patch Priority" value={`${item.priority_tier || 'LOW'} · ${percent(item.priority_score)}`} />
              <Field label="Remediation level" value="OFFICIAL_FIX" />
              <Field label="Fixed version propuesta" value={recommendedFixedVersion || 'pendiente'} />
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

            {/* MOSTRAR TODAS LAS PROPUESTAS DE PATCH REGISTRADAS CON SU ID */}
            {patches.length > 0 && (
              <div className="apply-patch-proposals-list">
                {patches.map((patchItem) => {
                  const isSelected = String(patchItem.patch_id) === String(patchId);
                  const patchDesc = descriptionMatchesCurrentCVE(patchItem.description, item.cve_id)
                    ? patchItem.description
                    : 'Referencia oficial / aviso de seguridad';

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
                        {isSelected && (
                          <span className="apply-patch-selected-badge">
                            ✓ Seleccionado
                          </span>
                        )}
                      </div>

                      <strong>
                        {recommendedFixedVersion
                          ? `Actualizar ${item.software_name || 'software'} a versión ${recommendedFixedVersion}`
                          : `Referencia oficial para ${item.cve_id}`}
                      </strong>

                      {patchDesc && (
                        <small>{patchDesc}</small>
                      )}

                      {patchItem.url && (
                        <a
                          href={patchItem.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Abrir referencia oficial ({patchItem.url})
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
              OFFICIAL_FIX declara un parche oficial aplicado sobre esta instalación concreta. No aplica el patch al CVE global.
            </p>
          </section>

          <section className="apply-patch-section">
            <h3>Declaración</h3>

            <label className="apply-patch-form-field">
              <span>Patch ID</span>
              <select
                className="apply-patch-input"
                value={patchId}
                onChange={(event) => setPatchId(event.target.value)}
                disabled={loading}
              >
                <option value="">Resolver automáticamente si hay un único patch</option>
                {patches.map(patch => {
                  const patchDesc = descriptionMatchesCurrentCVE(patch.description, item.cve_id)
                    ? patch.description || 'referencia oficial'
                    : 'referencia oficial';
                  const urlText = patch.url ? ` — ${patch.url}` : '';
                  return (
                    <option key={patch.patch_id} value={patch.patch_id}>
                      {`Patch #${patch.patch_id} · ${patchDesc}${urlText}`}
                    </option>
                  );
                })}
              </select>
              <small>
                Puedes hacer clic en la tarjeta de propuesta de patch de arriba o seleccionarlo en este desplegable.
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
            {loading ? 'Aplicando...' : 'Aplicar official patch'}
          </button>
        </div>
      </form>
    </div>
  );
}
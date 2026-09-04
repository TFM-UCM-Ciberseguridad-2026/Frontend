import React, { useState, useEffect } from 'react';
import './ArchiveModal.css';

export function ExportModal({
  isOpen,
  onClose,
  projects = [],
  selectedProjectId,
  onExportProject,
  onExportMitre,
  onExportInventory,
  onExportWeeklyReport,
  onExportMonthlyReport
}) {
  const [exportProjectChecked, setExportProjectChecked] = useState(true);
  const [exportInventoryChecked, setExportInventoryChecked] = useState(true);
  const [exportMitreChecked, setExportMitreChecked] = useState(false);
  const [exportWeeklyChecked, setExportWeeklyChecked] = useState(false);
  const [exportMonthlyChecked, setExportMonthlyChecked] = useState(false);
  const [targetProjectId, setTargetProjectId] = useState(selectedProjectId || (projects[0]?.id ?? '1'));

  useEffect(() => {
    if (isOpen) {
      setTargetProjectId(selectedProjectId || (projects[0]?.id ?? '1'));
    }
  }, [isOpen, selectedProjectId, projects]);

  if (!isOpen) return null;

  const handleExport = () => {
    if (exportProjectChecked && onExportProject) {
      onExportProject(targetProjectId);
    }
    if (exportInventoryChecked && onExportInventory) {
      onExportInventory(targetProjectId);
    }
    if (exportMitreChecked && onExportMitre) {
      onExportMitre(targetProjectId);
    }
    if (exportWeeklyChecked && onExportWeeklyReport) {
      onExportWeeklyReport(targetProjectId);
    }
    if (exportMonthlyChecked && onExportMonthlyReport) {
      onExportMonthlyReport(targetProjectId);
    }
    onClose();
  };

  const selectedProject = projects.find(p => String(p.id) === String(targetProjectId));

  return (
    <div className="asset-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="asset-modal" style={{ maxWidth: '620px' }} onClick={e => e.stopPropagation()}>
        <div className="asset-modal-header">
          <div>
            <h2>EXPORTAR INFRAESTRUCTURA</h2>
            <div className="asset-modal-subtitle">
              Genera paquetes de datos, inventarios y reportes ejecutivos del proyecto
            </div>
          </div>
          <button className="asset-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="asset-modal-body">
          <div className="asset-form">
            {/* PROYECTO SELECCIONADO */}
            <div>
              <div className="asset-field-label">Proyecto Seleccionado para Exportar</div>
              <div
                className="asset-input"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontWeight: '600',
                  color: 'var(--c50)'
                }}
              >
                <span>{selectedProject?.name || 'Proyecto Desconocido'}</span>
                <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '11px', color: 'var(--muted)' }}>
                  ID: #{targetProjectId}
                </span>
              </div>
            </div>

            {/* OPCIONES DE EXPORTACIÓN */}
            <div>
              <div className="asset-field-label">Opciones de Exportación</div>
              <div className="archive-options-list">
                <label className={`archive-option-card ${exportProjectChecked ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={exportProjectChecked}
                    onChange={e => setExportProjectChecked(e.target.checked)}
                  />
                  <div className="archive-option-info">
                    <h4>Exportar Proyecto completo a JSON (Nativo)</h4>
                    <p>
                      Exporta la declaración completa de nodos y relaciones (endpoints, hardware, redes, software y hallazgos) para reimportarlo.
                    </p>
                  </div>
                </label>

                <label className={`archive-option-card ${exportInventoryChecked ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={exportInventoryChecked}
                    onChange={e => setExportInventoryChecked(e.target.checked)}
                  />
                  <div className="archive-option-info">
                    <h4>Exportar Inventario de Activos a Excel (.xlsx)</h4>
                    <p>
                      Genera un libro estructurado en pestañas (Categoría, ID, Nombre, Ubicación/IP, Severidad y Atributos).
                    </p>
                  </div>
                </label>

                <label className={`archive-option-card ${exportMitreChecked ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={exportMitreChecked}
                    onChange={e => setExportMitreChecked(e.target.checked)}
                  />
                  <div className="archive-option-info">
                    <h4>Exportar TTPs de MITRE a JSON (MITRE ATT&CK Navigator)</h4>
                    <p>
                      Genera una capa (*layer*) en formato JSON v4.5 compatible con MITRE ATT&CK Navigator.
                    </p>
                  </div>
                </label>

                <label className={`archive-option-card ${exportWeeklyChecked ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={exportWeeklyChecked}
                    onChange={e => setExportWeeklyChecked(e.target.checked)}
                  />
                  <div className="archive-option-info">
                    <h4>Informe Semanal de Vulnerabilidades a PowerPoint (.pptx)</h4>
                    <p>
                      Informe operativo: inventario, SLA, vencimientos próximos, cola de remediación y matriz ATT&CK según NIST SP 800-40 Rev. 4.
                    </p>
                  </div>
                </label>

                <label className={`archive-option-card ${exportMonthlyChecked ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={exportMonthlyChecked}
                    onChange={e => setExportMonthlyChecked(e.target.checked)}
                  />
                  <div className="archive-option-info">
                    <h4>Informe Mensual de Gobierno a PowerPoint (.pptx)</h4>
                    <p>
                      Informe de Comité: matriz de decisión, respuesta al riesgo, gobierno documental RACI y controles SP 800-53 Rev. 4.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* ACCIONES */}
            <div className="asset-form-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-accent asset-submit-btn"
                onClick={handleExport}
                disabled={!exportProjectChecked && !exportInventoryChecked && !exportMitreChecked && !exportWeeklyChecked && !exportMonthlyChecked}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Exportar Archivos
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
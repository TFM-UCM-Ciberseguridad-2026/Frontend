import React, { useState } from 'react';
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
  // Los dos informes PPTX se descargan por separado porque cubren cadencias distintas:
  // el semanal es operativo y el mensual es de gobierno.
  const [exportWeeklyChecked, setExportWeeklyChecked] = useState(false);
  const [exportMonthlyChecked, setExportMonthlyChecked] = useState(false);
  const [targetProjectId, setTargetProjectId] = useState(selectedProjectId || (projects[0]?.id ?? '1'));

  React.useEffect(() => {
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

  return (
    <div className="archive-modal-overlay" onClick={onClose}>
      <div className="archive-modal-container" onClick={e => e.stopPropagation()}>
        <div className="archive-modal-header">
          <h2>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Exportar Declaración de Infraestructura
          </h2>
          <button className="archive-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {projects && projects.length > 0 && (
          <div>
            <div className="archive-section-label">Proyecto Seleccionado para Exportar</div>
            <div className="archive-select" style={{ backgroundColor: '#1a1a1a', padding: '10px', borderRadius: '4px', border: '1px solid #333' }}>
              {projects.find(p => String(p.id) === String(targetProjectId))?.name || 'Proyecto Desconocido'}
            </div>
          </div>
        )}

        <div className="archive-section-label">Opciones de Exportación</div>
        <div className="archive-checkbox-group">
          <label className="archive-checkbox-card">
            <input
              type="checkbox"
              checked={exportProjectChecked}
              onChange={e => setExportProjectChecked(e.target.checked)}
            />
            <div className="archive-checkbox-info">
              <h4>Exportar Proyecto completo a JSON (Nativo)</h4>
              <p>Exporta la declaración completa de nodos y relaciones (endpoints, hardware, redes, software y hallazgos) para reimportarlo en este programa.</p>
            </div>
          </label>

          <label className="archive-checkbox-card">
            <input
              type="checkbox"
              checked={exportInventoryChecked}
              onChange={e => setExportInventoryChecked(e.target.checked)}
            />
            <div className="archive-checkbox-info">
              <h4>Exportar Inventario de Activos a Excel (.xlsx)</h4>
              <p>Genera un libro de Excel estructurado en pestañas y ordenado por columnas relevantes (Categoría, ID, Nombre, Ubicación/IP, Severidad y Atributos).</p>
            </div>
          </label>

          <label className="archive-checkbox-card">
            <input
              type="checkbox"
              checked={exportMitreChecked}
              onChange={e => setExportMitreChecked(e.target.checked)}
            />
            <div className="archive-checkbox-info">
              <h4>Exportar TTPs de MITRE a JSON (MITRE ATT&CK Navigator)</h4>
              <p>Genera una capa (*layer*) en formato JSON v4.5 compatible con la aplicación oficial MITRE ATT&CK Navigator para visualización de técnicas adversarias.</p>
            </div>
          </label>

          <label className="archive-checkbox-card">
            <input
              type="checkbox"
              checked={exportWeeklyChecked}
              onChange={e => setExportWeeklyChecked(e.target.checked)}
            />
            <div className="archive-checkbox-info">
              <h4>Informe Semanal de Vulnerabilidades a PowerPoint (.pptx)</h4>
              <p>Informe operativo para el equipo: situación de la semana, inventario y grupos de mantenimiento, cumplimiento de SLA, vencimientos próximos, cola de remediación, envejecimiento del backlog y matriz MITRE ATT&amp;CK. Estructurado según NIST SP 800-40 Rev. 4.</p>
            </div>
          </label>

          <label className="archive-checkbox-card">
            <input
              type="checkbox"
              checked={exportMonthlyChecked}
              onChange={e => setExportMonthlyChecked(e.target.checked)}
            />
            <div className="archive-checkbox-info">
              <h4>Informe Mensual de Gobierno a PowerPoint (.pptx)</h4>
              <p>Informe para el Comité de Seguridad: marco de referencia y alcance, situación del mes, matriz de decisión y respuesta al riesgo, concentración por táctica, gobierno documental con matriz RACI y trazabilidad de controles SP 800-53 Rev. 4.</p>
            </div>
          </label>
        </div>

        <div className="archive-modal-actions">
          <button className="archive-btn archive-btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="archive-btn archive-btn-primary"
            onClick={handleExport}
            disabled={!exportProjectChecked && !exportInventoryChecked && !exportMitreChecked && !exportWeeklyChecked && !exportMonthlyChecked}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Exportar Archivos
          </button>
        </div>
      </div>
    </div>
  );
}

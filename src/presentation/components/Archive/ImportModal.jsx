import React, { useState, useRef, useEffect } from 'react';
import './ArchiveModal.css';
import { MAX_IMPORT_MB, MAX_IMPORT_BYTES } from '../../../data/datasources/InfrastructureApiDataSource';
import { findProjectByName, projectNameFromExport } from '../../../domain/entities/projectName';

export function ImportModal({
  isOpen,
  onClose,
  projects = [],
  onImport
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);

  // Gestión de conflictos de proyectos existentes
  const [conflictState, setConflictState] = useState(null);
  const [renamingMode, setRenamingMode] = useState(false);
  const [newNameInput, setNewNameInput] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setFileContent(null);
      setErrorMsg(null);
      setImporting(false);
      setConflictState(null);
      setRenamingMode(false);
      setNewNameInput('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Se recalcula en cada render, es decir, con cada tecla del campo de renombrado.
  const renameTaken = renamingMode && Boolean(findProjectByName(projects, newNameInput));

  const handleFileSelect = (file) => {
    setErrorMsg(null);
    setConflictState(null);
    setRenamingMode(false);
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setErrorMsg('Por favor selecciona un archivo con extensión .json');
      return;
    }

    // Se avisa antes de leer el fichero: si lo rechazara el servidor, el usuario habría
    // esperado a que se subiera entero para recibir un 413.
    if (file.size > MAX_IMPORT_BYTES) {
      const tamMB = (file.size / (1024 * 1024)).toFixed(1);
      setErrorMsg(`El archivo ocupa ${tamMB} MB y el máximo admitido son ${MAX_IMPORT_MB} MB.`);
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const parsed = JSON.parse(text);

        const projName = projectNameFromExport(parsed);
        const existingByName = findProjectByName(projects, projName);

        setFileContent(text);

        if (existingByName) {
          const nameToUse = projName || existingByName.name;
          setConflictState({
            existingProject: existingByName,
            originalName: nameToUse
          });
          setNewNameInput(`${nameToUse} (Copia)`);
        }
      } catch (err) {
        setErrorMsg('El archivo seleccionado no es un JSON válido.');
        setSelectedFile(null);
        setFileContent(null);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleExecuteImport = async (options = {}) => {
    if (!fileContent || importing) return;
    setImporting(true);
    setErrorMsg(null);
    try {
      let finalOptions = { ...options };
      const parsed = JSON.parse(fileContent);
      const fileProjectName = projectNameFromExport(parsed);

      if (!conflictState && !finalOptions.renameTo && !finalOptions.overwrite) {
        const projId = parsed?.project?.id || parsed?.nodes?.find(n => n.labels?.includes('Project') || n.primaryLabel === 'Project')?.properties?.id;

        const existingById = (projects || []).find(p => projId !== undefined && projId !== null && String(p.id) === String(projId));
        if (existingById) {
          finalOptions.renameTo = fileProjectName || 'Proyecto Importado';
        }
      }

      // El nombre con el que va a quedar el proyecto se valida aquí, justo antes de
      // importar y sea cual sea el camino que ha traído hasta este punto. La comprobación al
      // elegir el fichero se hace una sola vez y no ve lo que se escribe después en el campo
      // de renombrado. Sobrescribir sustituye al proyecto existente, así que no aplica.
      if (!finalOptions.overwrite) {
        const targetName = finalOptions.renameTo || fileProjectName;
        if (findProjectByName(projects, targetName)) {
          setErrorMsg(`Ya existe un proyecto con el nombre "${targetName.trim()}". Por favor, elige un nombre único.`);
          return;
        }
      }

      await onImport(fileContent, finalOptions);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Error al importar la infraestructura.');
    } finally {
      setImporting(false);
    }
  };

  const handleOverwrite = () => {
    if (!conflictState) return;
    handleExecuteImport({
      overwrite: true,
      targetProjectId: conflictState.existingProject.id
    });
  };

  const handleRenameConfirm = () => {
    const trimmed = newNameInput.trim();
    if (!trimmed) {
      setErrorMsg('Por favor introduce un nombre válido para el proyecto.');
      return;
    }
    handleExecuteImport({
      renameTo: trimmed
    });
  };

  return (
    <div className="asset-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !importing) onClose(); }}>
      <div className="asset-modal" style={{ maxWidth: '560px' }} onClick={e => e.stopPropagation()}>
        <div className="asset-modal-header">
          <div>
            <h2>IMPORTAR PROYECTO</h2>
            <div className="asset-modal-subtitle">
              Carga una declaración de infraestructura completa en formato JSON
            </div>
          </div>
          <button className="asset-modal-close" onClick={onClose} disabled={importing}>✕</button>
        </div>

        <div className="asset-modal-body">
          <div className="asset-form">
            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={e => e.target.files && handleFileSelect(e.target.files[0])}
            />

            {/* DROPZONE HUD */}
            <div
              className={`archive-dropzone ${isDragging ? 'dragging' : ''}`}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="12" x2="12" y2="18" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              <p>Arrastra y suelta tu archivo <strong>JSON de infraestructura</strong> aquí</p>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>o haz clic para examinar tu equipo</span>

              {selectedFile && (
                <div className="archive-file-badge">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                    <polyline points="13 2 13 9 20 9" />
                  </svg>
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>

            {/* ALERTA DE CONFLICTO DE PROYECTO EXISTENTE */}
            {conflictState && !renamingMode && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px dashed rgba(239, 68, 68, 0.4)',
                borderRadius: '8px',
                padding: '12px 14px',
                color: '#fca5a5',
                fontSize: '13.5px',
                fontFamily: 'Rajdhani, sans-serif'
              }}>
                <div style={{ fontWeight: '700', fontSize: '0.95rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⚠️</span> Proyecto Ya Existente
                </div>
                <p style={{ margin: 0, lineHeight: 1.4 }}>
                  Ya existe un proyecto registrado con el nombre <strong>"{conflictState.originalName}"</strong>. Elige si prefieres renombrarlo o sobrescribir su contenido.
                </p>
              </div>
            )}

            {/* CAMPO PARA RENOMBRAR */}
            {renamingMode && (
              <div>
                <div className="asset-field-label" style={{ color: 'var(--c300)' }}>
                  Nuevo nombre para el proyecto importado:
                </div>
                <input
                  type="text"
                  className="asset-input"
                  value={newNameInput}
                  onChange={e => setNewNameInput(e.target.value)}
                  placeholder="Ej. Proyecto Auditoría Copia"
                  autoFocus
                />
                {renameTaken && (
                  <p className="asset-error-text">⚠️ Ya existe un proyecto con este nombre. Por favor, elige un nombre único.</p>
                )}
              </div>
            )}

            {errorMsg && (
              <p className="asset-error-text">⚠️ {errorMsg}</p>
            )}

            {/* ACCIONES */}
            <div className="asset-form-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={importing}>
                Cancelar
              </button>

              {conflictState && !renamingMode ? (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setRenamingMode(true)}
                    disabled={importing}
                    style={{ color: 'var(--c300)', borderColor: 'var(--c500)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                    Renombrar
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={handleOverwrite}
                    disabled={importing}
                    style={{
                      background: 'linear-gradient(135deg, #ef4444, #991b1b)',
                      color: '#ffffff',
                      border: 'none',
                      fontFamily: 'Orbitron, sans-serif',
                      fontSize: '11px',
                      letterSpacing: '1px',
                      boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    {importing ? 'Sobrescribiendo...' : 'Sobrescribir'}
                  </button>
                </>
              ) : renamingMode ? (
                <button
                  type="button"
                  className="btn btn-accent asset-submit-btn"
                  onClick={handleRenameConfirm}
                  disabled={!newNameInput.trim() || renameTaken || importing}
                >
                  {importing ? 'Importando...' : 'Confirmar e Importar'}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-accent asset-submit-btn"
                  onClick={() => handleExecuteImport({})}
                  disabled={!fileContent || importing}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  {importing ? 'Importando...' : 'Cargar Proyecto'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
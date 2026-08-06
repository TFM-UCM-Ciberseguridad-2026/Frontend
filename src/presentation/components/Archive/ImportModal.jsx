import React, { useState, useRef, useEffect } from 'react';
import './ArchiveModal.css';

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

  // Estado para gestión de conflictos de proyectos existentes
  const [conflictState, setConflictState] = useState(null);
  const [renamingMode, setRenamingMode] = useState(false);
  const [newNameInput, setNewNameInput] = useState('');

  const fileInputRef = useRef(null);

  // Limpiar estado al abrir o cerrar el modal
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

  const handleFileSelect = (file) => {
    setErrorMsg(null);
    setConflictState(null);
    setRenamingMode(false);
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setErrorMsg('Por favor selecciona un archivo con extensión .json');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const parsed = JSON.parse(text);

        const projName = parsed?.project?.name ||
          parsed?.nodes?.find(n => n.labels?.includes('Project') || n.primaryLabel === 'Project')?.properties?.nombre ||
          parsed?.nodes?.find(n => n.labels?.includes('Project') || n.primaryLabel === 'Project')?.properties?.name;

        const projId = parsed?.project?.id ||
          parsed?.nodes?.find(n => n.labels?.includes('Project') || n.primaryLabel === 'Project')?.properties?.id;

        // Solo mostrar modal de conflicto si el nombre coincide exactamente
        const existingByName = (projects || []).find(p => projName && p.name?.toLowerCase().trim() === projName.toLowerCase().trim());

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
      
      // Auto-resolver conflictos de ID silenciosos (cuando el nombre es distinto pero el ID choca)
      if (!conflictState && !finalOptions.renameTo && !finalOptions.overwrite) {
        const parsed = JSON.parse(fileContent);
        const projName = parsed?.project?.name || parsed?.nodes?.find(n => n.labels?.includes('Project') || n.primaryLabel === 'Project')?.properties?.nombre || parsed?.nodes?.find(n => n.labels?.includes('Project') || n.primaryLabel === 'Project')?.properties?.name || 'Proyecto Importado';
        const projId = parsed?.project?.id || parsed?.nodes?.find(n => n.labels?.includes('Project') || n.primaryLabel === 'Project')?.properties?.id;
        
        const existingById = (projects || []).find(p => projId !== undefined && projId !== null && String(p.id) === String(projId));
        if (existingById) {
          finalOptions.renameTo = projName;
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
    <div className="archive-modal-overlay" onClick={onClose}>
      <div className="archive-modal-container" onClick={e => e.stopPropagation()}>
        <div className="archive-modal-header">
          <h2>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Importar Proyecto de Infraestructura
          </h2>
          <button className="archive-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <input
          type="file"
          accept=".json"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={e => e.target.files && handleFileSelect(e.target.files[0])}
        />

        <div
          className={`archive-dropzone ${isDragging ? 'dragging' : ''}`}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="12" x2="12" y2="18" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
          <p>Arrastra y suelta tu archivo <strong>JSON de exportación</strong> aquí</p>
          <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>o haz clic para explorar en tu equipo</p>

          {selectedFile && (
            <div className="archive-file-badge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '8px',
            padding: '14px 16px',
            marginBottom: '16px',
            color: '#f87171'
          }}>
            <div style={{ fontWeight: '600', fontSize: '0.95rem', marginBottom: '6px', display: 'flex', opacity: 0.9, alignItems: 'center', gap: '8px' }}>
              <span>⚠️</span> Proyecto Ya Existente
            </div>
            <p style={{ fontSize: '0.85rem', color: '#cbd5e1', margin: 0, lineHeight: 1.4 }}>
              Ya existe un proyecto registrado con el nombre <strong>"{conflictState.originalName}"</strong>. ¿Qué deseas hacer?
            </p>
          </div>
        )}

        {/* INPUT PARA RENOMBRAR PROYECTO */}
        {renamingMode && (
          <div style={{
            background: 'rgba(59, 130, 246, 0.12)',
            border: '1px solid rgba(59, 130, 246, 0.5)',
            borderRadius: '8px',
            padding: '14px 16px',
            marginBottom: '16px'
          }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#93c5fd', fontWeight: '600', marginBottom: '8px' }}>
              Nuevo nombre para el proyecto a importar:
            </label>
            <input
              type="text"
              value={newNameInput}
              onChange={e => setNewNameInput(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid #3b82f6',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '0.9rem',
                outline: 'none'
              }}
              placeholder="Ej. Proyecto Auditoría Copia"
              autoFocus
            />
          </div>
        )}

        {errorMsg && (
          <div style={{ color: '#ff4a4a', fontSize: '0.85rem', marginBottom: '16px', fontWeight: '500' }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <div className="archive-modal-actions">
          <button className="archive-btn archive-btn-secondary" onClick={onClose} disabled={importing}>
            Cancelar
          </button>

          {conflictState && !renamingMode ? (
            <>
              <button
                className="archive-btn"
                onClick={() => setRenamingMode(true)}
                disabled={importing}
                style={{ background: '#3b82f6', color: '#ffffff', borderColor: '#2563eb' }}
              >
                ✏️ Renombrar
              </button>
              <button
                className="archive-btn"
                onClick={handleOverwrite}
                disabled={importing}
                style={{ background: '#ef4444', color: '#ffffff', borderColor: '#dc2626' }}
              >
                ⚠️ {importing ? 'Sobrescribiendo...' : 'Sobrescribir'}
              </button>
            </>
          ) : renamingMode ? (
            <button
              className="archive-btn archive-btn-primary"
              onClick={handleRenameConfirm}
              disabled={!newNameInput.trim() || importing}
            >
              {importing ? 'Importando...' : 'Confirmar e Importar'}
            </button>
          ) : (
            <button
              className="archive-btn archive-btn-primary"
              onClick={() => handleExecuteImport({})}
              disabled={!fileContent || importing}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
  );
}

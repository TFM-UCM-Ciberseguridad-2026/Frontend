import React, { useState, useRef } from 'react';
import './ArchiveModal.css';

export function ImportModal({
  isOpen,
  onClose,
  onImport
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileSelect = (file) => {
    setErrorMsg(null);
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
        JSON.parse(text); // Validar sintaxis JSON
        setFileContent(text);
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

  const handleExecuteImport = async () => {
    if (!fileContent || importing) return;
    setImporting(true);
    setErrorMsg(null);
    try {
      await onImport(fileContent);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Error al importar la infraestructura.');
    } finally {
      setImporting(false);
    }
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

        {errorMsg && (
          <div style={{ color: '#ff4a4a', fontSize: '0.85rem', marginBottom: '16px', fontWeight: '500' }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <div className="archive-modal-actions">
          <button className="archive-btn archive-btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="archive-btn archive-btn-primary"
            onClick={handleExecuteImport}
            disabled={!fileContent || importing}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {importing ? 'Importando...' : 'Cargar Proyecto'}
          </button>
        </div>
      </div>
    </div>
  );
}

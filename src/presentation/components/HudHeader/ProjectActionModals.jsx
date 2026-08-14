import React, { useState, useEffect } from 'react';
import '../Archive/ArchiveModal.css'; // Reusing archive modal styles for consistency

export function RenameProjectModal({ isOpen, onClose, project, onRename }) {
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (isOpen && project) {
      setNewName(project.name || '');
    }
  }, [isOpen, project]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newName.trim() && newName !== project.name) {
      onRename(project.id, newName.trim());
    }
    onClose();
  };

  return (
    <div className="archive-modal-overlay" onClick={onClose}>
      <div className="archive-modal-container" onClick={e => e.stopPropagation()}>
        <div className="archive-modal-header">
          <h2>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            Renombrar Proyecto
          </h2>
          <button className="archive-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="archive-section-label" style={{ marginTop: '20px' }}>Nuevo nombre para el proyecto</div>
          <input
            type="text"
            className="archive-select"
            style={{ width: '100%', padding: '12px', boxSizing: 'border-box' }}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Introduce el nuevo nombre..."
            autoFocus
          />

          <div className="archive-modal-actions" style={{ marginTop: '30px' }}>
            <button type="button" className="archive-btn archive-btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="archive-btn archive-btn-primary"
              disabled={!newName.trim() || newName === project?.name}
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function DeleteProjectModal({ isOpen, onClose, project, onDelete }) {
  if (!isOpen || !project) return null;

  return (
    <div className="archive-modal-overlay" onClick={onClose}>
      <div className="archive-modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
        <div className="archive-modal-header" style={{ borderBottomColor: '#6a1a1a' }}>
          <h2 style={{ color: '#ff4d4f' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Eliminar Proyecto
          </h2>
          <button className="archive-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={{ padding: '20px 0', color: '#ccc', lineHeight: '1.6' }}>
          <p>¿Estás completamente seguro de que deseas eliminar el proyecto <strong>{project.name}</strong>?</p>
          <p style={{ color: '#ff4d4f', fontSize: '13px', marginTop: '10px' }}>
            Esta acción eliminará en cascada toda la infraestructura (endpoints, redes, contenedores) y hallazgos asociados a este proyecto. <strong>Esta acción no se puede deshacer.</strong>
          </p>
        </div>

        <div className="archive-modal-actions">
          <button className="archive-btn archive-btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="archive-btn archive-btn-primary"
            style={{ backgroundColor: '#cc0000', borderColor: '#cc0000' }}
            onClick={() => {
              onDelete(project.id);
              onClose();
            }}
          >
            Eliminar Definitivamente
          </button>
        </div>
      </div>
    </div>
  );
}

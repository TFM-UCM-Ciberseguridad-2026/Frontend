import React, { useState, useEffect } from 'react';
import './ProjectActionModals.css';

export function RenameProjectModal({ isOpen, onClose, project, onRename }) {
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (isOpen && project) {
      setNewName(project.name || '');
    }
  }, [isOpen, project]);

  if (!isOpen || !project) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newName.trim() && newName.trim() !== project.name) {
      onRename(project.id, newName.trim());
    }
    onClose();
  };

  return (
    <div className="project-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="project-modal" onClick={(e) => e.stopPropagation()}>
        <div className="project-modal-header">
          <div>
            <h2 className="project-modal-title">RENOMBRAR PROYECTO</h2>
            <div className="project-modal-subtitle">
              Proyecto actual: <strong style={{ color: '#ffffff' }}>{project.name}</strong>
            </div>
          </div>
          <button className="project-modal-close" onClick={onClose} title="Cerrar">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="project-modal-body">
          <div>
            <label className="project-field-label">Nuevo nombre para el proyecto</label>
            <input
              type="text"
              className="project-input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Introduce el nuevo nombre..."
              autoFocus
              required
            />
          </div>

          <div className="project-modal-actions">
            <button type="button" className="project-btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="project-btn-save"
              disabled={!newName.trim() || newName.trim() === project.name}
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

  const handleDelete = () => {
    onDelete(project.id);
    onClose();
  };

  return (
    <div className="project-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="project-modal project-modal--danger" onClick={(e) => e.stopPropagation()}>
        <div className="project-modal-header">
          <div>
            <h2 className="project-modal-title project-modal-title--danger">
              ELIMINAR PROYECTO
            </h2>
            <div className="project-modal-subtitle">
              Confirma la baja del proyecto: <strong style={{ color: '#ffffff' }}>{project.name}</strong>
            </div>
          </div>
          <button className="project-modal-close" onClick={onClose} title="Cerrar">
            ✕
          </button>
        </div>

        <div className="project-modal-body">
          <div className="project-danger-alert">
            <span className="icon">⚠️</span>
            <div>
              <span>¿Eliminar el proyecto <strong>"{project.name}"</strong> de forma permanente?</span>
              <br />
              <span>
                Esta acción eliminará en cascada todos los endpoints, redes, contenedores, instalaciones y hallazgos asociados.
              </span>
            </div>
          </div>

          <div className="project-modal-actions">
            <button type="button" className="project-btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="button"
              className="project-btn-delete"
              onClick={handleDelete}
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
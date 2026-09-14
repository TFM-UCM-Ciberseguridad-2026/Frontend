import React, { useState, useEffect } from 'react';
import './ProjectActionModals.css';
import { findProjectByName } from '../../../domain/entities/projectName';

export function RenameProjectModal({ isOpen, onClose, project, onRename, projects = [] }) {
  const [newName, setNewName] = useState('');
  const [formError, setFormError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && project) {
      setNewName(project.name || '');
      setFormError(null);
    }
  }, [isOpen, project]);

  if (!isOpen || !project) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    const trimmed = newName.trim();
    if (!trimmed || trimmed === project?.name) return;

    if (findProjectByName(projects, trimmed, project?.id ?? '')) {
      setFormError('Ya existe un proyecto con este nombre. Por favor, elige un nombre único.');
      return;
    }

    setLoading(true);
    try {
      if (onRename) {
        await onRename(project.id, trimmed);
      }
      onClose();
    } catch (err) {
      setFormError(err.message || 'Error al renombrar el proyecto');
    } finally {
      setLoading(false);
    }
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
              onChange={(e) => {
                setNewName(e.target.value);
                setFormError(null);
              }}
              placeholder="Introduce el nuevo nombre..."
              autoFocus
              required
            />
          </div>

          {formError && (
            <div style={{ color: '#ff4a4a', fontSize: '0.85rem', marginTop: '0.5rem', fontFamily: 'Rajdhani, sans-serif' }}>
              ⚠️ {formError}
            </div>
          )}

          <div className="project-modal-actions">
            <button type="button" className="project-btn-cancel" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button
              type="submit"
              className="project-btn-save"
              disabled={loading || !newName.trim() || newName.trim() === project?.name}
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
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
import React, { useState } from 'react';
import { RenameProjectModal, DeleteProjectModal } from './ProjectActionModals';

export function HudHeader({ 
  activeNav, 
  setActiveNav, 
  fetchTopAPTs, 
  fetchExploitationPaths, 
  projects, 
  selectedProjectId, 
  setSelectedProjectId, 
  onOpenExport, 
  onOpenImport, 
  renameProject, 
  deleteProject 
}) {
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  return (
    <header className="hud-header">
      <nav className="hud-nav">
        {projects && projects.length > 0 && (
          <div className="project-selector" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span className="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M3 7h18M3 12h18M3 17h18" />
                </svg>
              </span>
              <select
                value={selectedProjectId || ''}
                onChange={(e) => setSelectedProjectId(e.target.value)}
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            
            <button 
              className="hud-action-icon" 
              onClick={() => setShowRenameModal(true)} 
              title="Renombrar Proyecto"
              style={{ background: '#2c2c35', border: '1px solid #444', color: '#fff', cursor: 'pointer', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </button>
            <button 
              className="hud-action-icon" 
              onClick={() => setShowDeleteModal(true)} 
              title="Eliminar Proyecto"
              style={{ background: '#352c2c', border: '1px solid #5a2c2c', color: '#ff6b6b', cursor: 'pointer', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        )}

        <button
          className={`nav-btn ${activeNav === 'grafo' ? 'active' : ''}`}
          onClick={() => setActiveNav('grafo')}
        >
          <span className="ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="6" cy="6" r="2.4" />
              <circle cx="18" cy="6" r="2.4" />
              <circle cx="12" cy="18" r="2.4" />
              <path d="M8 7.2 10.5 15.5M16 7.2 13.5 15.5M8.4 6h7.2" />
            </svg>
          </span>
          Grafo de Activos
        </button>

        <button
          className={`nav-btn ${activeNav === 'inventario' ? 'active' : ''}`}
          onClick={() => setActiveNav('inventario')}
        >
          <span className="ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="4" y="4" width="16" height="16" rx="1.5" />
              <path d="M4 10h16M10 10v10" />
            </svg>
          </span>
          Inventario
        </button>

        <button
          className={`nav-btn ${activeNav === 'patch-queue' ? 'active' : ''}`}
          onClick={() => setActiveNav('patch-queue')}
        >
          <span className="ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4" />
              <path d="M15 5l4 4" />
            </svg>
          </span>
          Patch Queue
        </button>

        <button
          className={`nav-btn ${activeNav === 'redes' ? 'active' : ''}`}
          onClick={() => setActiveNav('redes')}
        >
          <span className="ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="8.5" />
              <path d="M3.5 12h17M12 3.5c2.6 2.4 2.6 14.6 0 17M12 3.5c-2.6 2.4-2.6 14.6 0 17" />
            </svg>
          </span>
          Redes
        </button>

        <button 
          className={`nav-btn ${activeNav === 'ttps' ? 'active' : ''}`}
          onClick={() => setActiveNav('ttps')}
        >
          <span className="ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </span>
          Matriz TTPs
        </button>

        <button 
          className={`nav-btn ${activeNav === 'gobierno' ? 'active' : ''}`}
          onClick={() => setActiveNav('gobierno')}
        >
          <span className="ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </span>
          Gobierno
        </button>

        <button
          className="nav-btn"
          onClick={fetchTopAPTs}
        >
          <span className="ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 3.5 4.5 6.5v5.4c0 4.6 3.1 7.7 7.5 8.6 4.4-.9 7.5-4 7.5-8.6V6.5L12 3.5Z" />
              <path d="M9.5 12.2l1.8 1.8 3.4-3.6" />
            </svg>
          </span>
          Threat Actors
        </button>
        {fetchExploitationPaths && (
          <button
            className="nav-btn"
            onClick={fetchExploitationPaths}
          >
            <span className="ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </span>
            Rutas de Ataque
          </button>
        )}
        
        {/* BOTÓN ARCHIVE CON DESPLEGABLE */}
        <div className="archive-dropdown-container">
          <button
            className={`nav-btn ${archiveOpen ? 'active' : ''}`}
            onClick={() => setArchiveOpen(!archiveOpen)}
          >
            <span className="ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </span>
            Archive
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: '4px' }}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {archiveOpen && (
            <div className="archive-dropdown-menu" onMouseLeave={() => setArchiveOpen(false)}>
              <button
                className="archive-dropdown-item"
                onClick={() => { setArchiveOpen(false); onOpenImport && onOpenImport(); }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Importar
              </button>
              <button
                className="archive-dropdown-item"
                onClick={() => { setArchiveOpen(false); onOpenExport && onOpenExport(); }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Exportar
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* MODALES DE GESTIÓN DE PROYECTO */}
      <RenameProjectModal
        isOpen={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        project={projects?.find(p => String(p.id) === String(selectedProjectId))}
        onRename={renameProject}
      />
      <DeleteProjectModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        project={projects?.find(p => String(p.id) === String(selectedProjectId))}
        onDelete={deleteProject}
      />
    </header>
  );
}
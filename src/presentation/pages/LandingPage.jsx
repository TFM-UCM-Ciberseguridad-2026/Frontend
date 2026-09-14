import React, { useState, useEffect } from 'react';
import './LandingPage.css';
import { ImportModal } from '../components/Archive/ImportModal';
import { RenameProjectModal, DeleteProjectModal } from '../components/HudHeader/ProjectActionModals';
import { findProjectByName } from '../../domain/entities/projectName';

const REPO_URL = 'https://github.com/TFM-UCM-Ciberseguridad-2026/Orquestador';

export function LandingPage({
  setShowDashboard,
  projects = [],
  selectedProjectId,
  setSelectedProjectId,
  createProject,
  importProject,
  fetchInfrastructure,
  renameProject,
  deleteProject,
  logoSrc = null
}) {
  const [activeModal, setActiveModal] = useState(null); // 'projects', 'create', 'import'
  const [actionProject, setActionProject] = useState(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Formulario crear proyecto
  const [cName, setCName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState(null);

  useEffect(() => {
    if (typeof fetchInfrastructure === 'function') {
      fetchInfrastructure(true);
    }
  }, []);

  const openProjectsModal = () => {
    setActiveModal('projects');
  };

  const handleSelectProject = (projId) => {
    if (setSelectedProjectId) {
      setSelectedProjectId(String(projId));
    }
    setActiveModal(null);
    setShowDashboard(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = cName.trim();
    if (!trimmedName) return;

    if (findProjectByName(projects, trimmedName)) {
      setCreateError('Ya existe un proyecto con este nombre. Por favor, elige un nombre único.');
      return;
    }

    setCreateLoading(true);
    setCreateError(null);

    try {
      if (createProject) {
        await createProject({ name: trimmedName });
      }
      setCName('');
      setActiveModal(null);
      await fetchInfrastructure?.(true);
      setShowDashboard(true);
    } catch (err) {
      console.error(err);
      setCreateError(err.message || 'Error al crear el proyecto');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="hud-landing-wrapper">
      <div className="hud-grid-overlay"></div>

      {/* ---------- CONTENIDO PRINCIPAL CENTRADO ---------- */}
      <main className="hud-home">
        <section className="hud-hero">
          <div className="hud-emblem" title="Orquestador">
            {logoSrc ? (
              <img src={logoSrc} alt="Logo" className="hud-emblem-img" />
            ) : (
              <div className="hud-emblem-core" />
            )}
          </div>
          <p className="eyebrow">Panel principal</p>
          <h2>Bienvenido a tu Orquestador</h2>

          <div className="hud-stats-row">
            <div className="hud-stat-chip mono"><i></i> {projects.length} PROYECTOS ACTIVOS</div>
          </div>
        </section>

        <section className="hud-actions-grid">
          {/* VER PROYECTOS */}
          <article className="hud-action-card">
            <div className="ic-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <h3>Ver proyectos</h3>
            <p>Consulta todos los proyectos existentes.</p>
            <button className="hud-btn hud-btn-outline" onClick={openProjectsModal}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Ver proyectos
            </button>
          </article>

          {/* CREAR PROYECTO */}
          <article className="hud-action-card">
            <div className="ic-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
            <h3>Crear proyecto</h3>
            <p>Define un nombre para arrancar un proyecto nuevo desde cero.</p>
            <button className="hud-btn hud-btn-primary" onClick={() => setActiveModal('create')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Crear proyecto
            </button>
          </article>

          {/* IMPORTAR PROYECTO */}
          <article className="hud-action-card">
            <div className="ic-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 3v12M7 10l5 5 5-5" />
                <path d="M4 21h16" />
              </svg>
            </div>
            <h3>Importar proyecto</h3>
            <p>Sube un archivo JSON previamente exportado desde la aplicación para reutilizarlo.</p>
            <button className="hud-btn hud-btn-outline" onClick={() => setActiveModal('import')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3v12M7 10l5 5 5-5" />
                <path d="M4 21h16" />
              </svg>
              Importar proyecto
            </button>
          </article>
        </section>
      </main>

      {/* ---------- BOTÓN GITHUB ESQUINA INFERIOR DERECHA (OPEN SOURCE) ---------- */}
      <a
        href={REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="hud-github-corner"
        title="Abrir repositorio en GitHub"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
        </svg>
        <span>GitHub</span>
      </a>

      {/* ---------- MODAL: VER PROYECTOS ---------- */}
      {activeModal === 'projects' && (
        <div className="hud-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="hud-modal" onClick={e => e.stopPropagation()}>
            <div className="hud-modal-head">
              <div>
                <p className="eyebrow">Consultar</p>
                <h3>Tus proyectos</h3>
              </div>
              <button className="hud-modal-close" onClick={() => setActiveModal(null)}>✕</button>
            </div>

            <div className="hud-proj-list">
              {projects.length === 0 ? (
                <div className="hud-empty-note">
                  ◌<br />AÚN NO HAY PROYECTOS REGISTRADOS<br />CREA O IMPORTA UNO PARA EMPEZAR
                </div>
              ) : (
                projects.map(p => (
                  <div key={p.id} className="hud-proj-item">
                    <div className="info">
                      <div className="name">{p.name}</div>
                      <div className={`meta ${String(p.id) === String(selectedProjectId) ? 'active-dot' : ''}`}>
                        ID: #{p.id}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        className="hud-action-icon"
                        onClick={() => {
                          setActionProject(p);
                          setShowRenameModal(true);
                        }}
                        title="Renombrar Proyecto"
                        style={{ background: '#2c2c35', border: '1px solid #444', color: '#fff', cursor: 'pointer', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                      </button>
                      <button
                        className="hud-action-icon"
                        onClick={() => {
                          setActionProject(p);
                          setShowDeleteModal(true);
                        }}
                        title="Eliminar Proyecto"
                        style={{ background: '#352c2c', border: '1px solid #5a2c2c', color: '#ff6b6b', cursor: 'pointer', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                      <button
                        className="hud-btn-mini"
                        onClick={() => handleSelectProject(p.id)}
                      >
                        Abrir proyecto
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------- MODAL: CREAR PROYECTO ---------- */}
      {activeModal === 'create' && (
        <div className="hud-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="hud-modal" onClick={e => e.stopPropagation()}>
            <div className="hud-modal-head">
              <div>
                <p className="eyebrow">Nuevo</p>
                <h3>Crear proyecto</h3>
              </div>
              <button className="hud-modal-close" onClick={() => setActiveModal(null)}>✕</button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <label className="hud-field-label">Nombre del proyecto</label>
              <input
                type="text"
                className="hud-input"
                placeholder="Ej. Migración Core"
                value={cName}
                onChange={e => setCName(e.target.value)}
                required
                autoFocus
              />

              {createError && (
                <div style={{ color: '#ff4a4a', fontSize: '0.85rem', marginTop: '10px' }}>
                  ⚠️ {createError}
                </div>
              )}

              <div className="hud-modal-actions">
                <button type="button" className="hud-btn hud-btn-outline" onClick={() => setActiveModal(null)}>
                  Cancelar
                </button>
                <button type="submit" className="hud-btn hud-btn-primary" disabled={createLoading}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  {createLoading ? 'Creando...' : 'Crear proyecto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------- MODAL: IMPORTAR PROYECTO (ImportModal) ---------- */}
      <ImportModal
        isOpen={activeModal === 'import'}
        onClose={() => setActiveModal(null)}
        projects={projects}
        onImport={async (fileContent, options) => {
          if (importProject) {
            await importProject(fileContent, options);
            setShowDashboard(true);
          }
        }}
      />
      {/* MODALES DE ACCIÓN SOBRE PROYECTO (Reutilizados del Header) */}
      <RenameProjectModal
        isOpen={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        project={actionProject}
        projects={projects}
        onRename={async (id, newName) => {
          if (renameProject) {
            await renameProject(id, newName);
          }
        }}
      />

      <DeleteProjectModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        project={actionProject}
        onDelete={async (id) => {
          if (deleteProject) {
            await deleteProject(id);
          }
        }}
      />

    </div>
  );
}

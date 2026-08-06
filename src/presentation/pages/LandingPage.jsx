import React, { useState, useEffect } from 'react';
import './LandingPage.css';
import { ImportModal } from '../components/Archive/ImportModal';

const REPO_URL = 'https://github.com/TFM-UCM-Ciberseguridad-2026/Orquestador';

export function LandingPage({
  setShowDashboard,
  clicks = 0,
  setClicks,
  projects = [],
  selectedProjectId,
  setSelectedProjectId,
  createProject,
  importProject,
  fetchInfrastructure
}) {
  const [activeModal, setActiveModal] = useState(null); // 'projects', 'create', 'import'

  // Formulario crear proyecto
  const [cName, setCName] = useState('');
  const [cType, setCType] = useState('Infraestructura');
  const [cDesc, setCDesc] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState(null);

  const bumpInteraction = () => {
    if (typeof setClicks === 'function') {
      setClicks(prev => prev + 1);
    }
  };

  useEffect(() => {
    if (typeof fetchInfrastructure === 'function') {
      fetchInfrastructure(true);
    }
  }, []);

  const openProjectsModal = () => {
    bumpInteraction();
    setActiveModal('projects');
  };

  const handleSelectProject = (projId) => {
    bumpInteraction();
    if (setSelectedProjectId) {
      setSelectedProjectId(String(projId));
    }
    setActiveModal(null);
    setShowDashboard(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!cName.trim()) return;
    bumpInteraction();
    setCreateLoading(true);
    setCreateError(null);

    try {
      if (createProject) {
        await createProject({ nombre: cName.trim(), description: cDesc.trim(), type: cType });
      }
      setCName('');
      setCDesc('');
      setCType('Infraestructura');
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

  const openRepo = () => {
    bumpInteraction();
    window.open(REPO_URL, '_blank', 'noopener');
  };

  return (
    <div className="hud-landing-wrapper">
      <div className="hud-grid-overlay"></div>

      {/* ---------- CONTENIDO PRINCIPAL CENTRADO ---------- */}
      <main className="hud-home">
        <section className="hud-hero">
          <div className="hud-emblem"></div>
          <p className="eyebrow">Panel principal</p>
          <h2>Bienvenido a tu Orquestador</h2>
          <p>Todo está configurado y funcionando perfectamente. Elige un proyecto existente o crea uno nuevo para empezar a construir tu infraestructura.</p>

          <div className="hud-stats-row">
            <div className="hud-stat-chip mono"><i></i> {projects.length} PROYECTOS ACTIVOS</div>
            <div className="hud-stat-chip light">INTERACCIONES: <b>{clicks}</b></div>
            <div className="hud-stat-chip mono"><i></i> BACKEND: <span style={{ color: 'var(--c300)' }}>CONECTADO</span></div>
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
            <p>Consulta todos los proyectos existentes en el orquestador, su estado y su actividad reciente.</p>
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
            <p>Define un nombre, un tipo y una descripción para arrancar un proyecto nuevo desde cero.</p>
            <button className="hud-btn hud-btn-primary" onClick={() => { bumpInteraction(); setActiveModal('create'); }}>
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
            <p>Sube un archivo de configuración o un export existente para reutilizarlo en el orquestador.</p>
            <button className="hud-btn hud-btn-outline" onClick={() => { bumpInteraction(); setActiveModal('import'); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3v12M7 10l5 5 5-5" />
                <path d="M4 21h16" />
              </svg>
              Importar proyecto
            </button>
          </article>

          {/* ABRIR REPOSITORIO */}
          <article className="hud-action-card">
            <div className="ic-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M9 19c-4.5 1.4-4.5-2.4-6-3m12 5v-3.3c0-.9.3-1.5.7-1.8-2.4-.3-5-1.2-5-5.3 0-1.2.4-2.1 1.1-2.9-.1-.3-.5-1.5.1-3 0 0 .9-.3 3 1.1a10.2 10.2 0 0 1 5.4 0c2.1-1.4 3-1.1 3-1.1.6 1.5.2 2.7.1 3 .7.8 1.1 1.7 1.1 2.9 0 4.1-2.6 5-5 5.3.4.3.7.9.7 1.9V19" />
              </svg>
            </div>
            <h3>Abrir repositorio</h3>
            <p>Ve directamente al código fuente del proyecto en GitHub para revisar commits o issues.</p>
            <button className="hud-btn hud-btn-outline" onClick={openRepo}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 17 17 7M8 7h9v9" />
              </svg>
              Ver repositorio
            </button>
          </article>
        </section>
      </main>

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
                    <button
                      className="hud-btn-mini"
                      onClick={() => handleSelectProject(p.id)}
                    >
                      Abrir proyecto
                    </button>
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

              <label className="hud-field-label">Tipo</label>
              <select className="hud-select" value={cType} onChange={e => setCType(e.target.value)}>
                <option value="Infraestructura">Infraestructura</option>
                <option value="Red">Red</option>
                <option value="Auditoría de seguridad">Auditoría de seguridad</option>
                <option value="Threat Intelligence">Threat Intelligence</option>
              </select>

              <label className="hud-field-label">Descripción (opcional)</label>
              <textarea
                className="hud-textarea"
                placeholder="Breve resumen del objetivo del proyecto..."
                value={cDesc}
                onChange={e => setCDesc(e.target.value)}
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
    </div>
  );
}

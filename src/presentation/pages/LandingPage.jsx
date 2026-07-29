import React, { useState } from 'react';
import '../components/AddAssets/AddAssetsButton.css';


export function LandingPage({ setShowDashboard, clicks, setClicks, createProject, fetchInfrastructure }) {

  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectForm, setProjectForm] = useState({ nombre: '', description: '' });
  const [projectLoading, setProjectLoading] = useState(false);
  const [projectError, setProjectError] = useState(null);

  const updateProjectField = (field, value) => {
    setProjectForm(prev => ({ ...prev, [field]: value }));
  };

  const submitProject = async (e) => {
    e.preventDefault();
    if (!createProject) return;

    setProjectLoading(true);
    setProjectError(null);

    try {
      await createProject(projectForm);
      setProjectForm({ nombre: '', description: '' });
      setShowProjectForm(false);
      await fetchInfrastructure?.(true);
      setShowDashboard(true);
    } catch (err) {
      console.error(err);
      setProjectError(err.message);
    } finally {
      setProjectLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw', position: 'relative', overflow: 'hidden' }}>
      <div className="grid-overlay"></div>

      <div className="container">
        <div className="logo-container">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
          </svg>
        </div>

        <h1 className="landing-title">Orquestador</h1>

        <div className="status-badge">
          <div className="status-dot"></div>
          Sistema En Línea
        </div>

        <p className="landing-desc">
          Bienvenido al panel principal de tu Orquestador. Todo está configurado y funcionando perfectamente.
          Este entorno React está listo para que construyas la interfaz de administración.
        </p>

        <div className="button-group">
          <button className="btn btn-accent" onClick={() => setShowDashboard(true)}>
            🔍 Ver Infraestructura
          </button>
          <button className="btn btn-primary" onClick={() => setShowProjectForm(prev => !prev)}>
            🧭 Crear Proyecto
          </button>
          <button className="btn btn-primary" onClick={() => setClicks(clicks + 1)}>
            Interacciones: {clicks}
          </button>
          <button className="btn btn-secondary" onClick={() => window.open('https://github.com/TFM-UCM-Ciberseguridad-2026/Orquestador', '_blank')}>
            Ver Repositorio
          </button>
        </div>

        {showProjectForm && (
          <form className="landing-project-form" onSubmit={submitProject}>
            <div>
              <div className="asset-field-label">Nombre del proyecto</div>
              <input
                type="text"
                className="asset-input"
                placeholder="Infraestructura producción"
                value={projectForm.nombre}
                onChange={(e) => updateProjectField('nombre', e.target.value)}
                required
              />
            </div>

            <div>
              <div className="asset-field-label">Descripción</div>
              <textarea
                className="asset-input asset-textarea"
                placeholder="Contexto del proyecto o auditoría..."
                rows={3}
                value={projectForm.description}
                onChange={(e) => updateProjectField('description', e.target.value)}
              />
            </div>

            {projectError && <p className="asset-error-text">⚠️ {projectError}</p>}

            <button type="submit" className="btn btn-accent" disabled={projectLoading}>
              {projectLoading ? 'Creando...' : 'Crear y abrir dashboard'}
            </button>
          </form>
        )}


        <div className="footer">
          Desplegado automáticamente mediante GitHub Actions • React + Vite
        </div>
      </div>
    </div>
  );
}

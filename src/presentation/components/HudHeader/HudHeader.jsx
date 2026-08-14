import React, { useState } from 'react';

export function HudHeader({ activeNav, setActiveNav, fetchTopAPTs, fetchExploitationPaths, setShowDashboard, projects, selectedProjectId, setSelectedProjectId, selectedProjectNode, onOpenExport, onOpenImport }) {
  const [archiveOpen, setArchiveOpen] = useState(false);

  return (
    <header className="hud-header">
      <div className="brand" style={{ cursor: 'pointer' }} onClick={() => setShowDashboard(false)}>
        <div className="emblem"></div>
        <div>
          <h1 className="hud-title">Orquestador de Infraestructura</h1>
          <small>GRAFO DE ACTIVOS · VISTA HUD</small>
        </div>
      </div>

      <nav className="hud-nav">
        {projects && projects.length > 1 && (
          <div className="project-selector">
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
        )}

        {selectedProjectNode?.properties?.risk_tier && (
          <div className="status-pill">
            Risk {selectedProjectNode.properties.risk_tier} · {Math.round(Number(selectedProjectNode.properties.risk_score || 0) * 100)}%
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
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Exportar
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
import React, { useState, useRef } from 'react';
import { useTTPSocket } from '../hooks/useTTPSocket';
import { TACTICS, normalizeTacticKey, normalizeTacticKeys } from '../../domain/mitre/tactics';
import './TtpsPage.css';
import TTPDashboard from '../components/TTPDashboard/TTPDashboard.jsx';

// Reexportados por compatibilidad con quien ya los importaba desde esta página.
export { TACTICS, normalizeTacticKey };

export function TtpsPage({ fetchTTPMatrix, selectedProjectId, showToast, fetchInfrastructure, graphData }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTtpId, setSelectedTtpId] = useState(null);
  const [modalTtp, setModalTtp] = useState(null);
  const [viewMode, setViewMode] = useState('matrix');
  const [isModalClosed, setIsModalClosed] = useState(false);
  const [totalMitreTTPs, setTotalMitreTTPs] = useState(0);
  const cellRefs = useRef({});

  const nodes = graphData?.nodes || [];
  const vulNodes = nodes.filter(n => n.labels?.includes('Vulnerability') || n.primaryLabel === 'Vulnerability');

  const [syncStatus, setSyncStatus] = useState({
    processing: false,
    total_cves: 0,
    processed_cves: 0,
    current_cve: '',
    logs: []
  });

  const logsEndRef = useRef(null);

  React.useEffect(() => {
    fetch('/api/infrastructure/mitre-ttp-count')
      .then(res => res.json())
      .then(data => {
        if (data && data.count) {
          setTotalMitreTTPs(data.count);
        }
      })
      .catch(err => console.error("Error fetching MITRE TTP count:", err));
  }, []);

  // Notificaciones en tiempo real del worker de TTPs.
  // El hook se conecta al WebSocket filtrando por el proyecto activo:
  //   - onSyncStatus: actualiza el estado completo al conectar/reconectar
  //   - onEvent: recibe cada CVE_MAPPED en tiempo real sin polling
  // El servidor (WSHub) garantiza que project_id=X no recibe eventos de project_id=Y.
  useTTPSocket({
    projectId: selectedProjectId,
    onSyncStatus: (data) => {
      if (data) setSyncStatus(data);
    },
    onEvent: (event) => {
      // Actualizar logs y estado de procesamiento en tiempo real
      setSyncStatus(prev => ({
        ...prev,
        processing: true,
        current_cve: event.cve_id,
        logs: [...(prev.logs || []), event.log].slice(-200), // cap a 200 líneas
      }));
      // Recargar el grafo en background para que aparezcan las nuevas relaciones
      if (fetchInfrastructure) fetchInfrastructure();
    },
  });

  React.useEffect(() => {
    if (!syncStatus.processing) {
      setIsModalClosed(false);
    }
  }, [syncStatus.processing]);

  React.useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [syncStatus.logs]);

  const [finalTtps, setFinalTtps] = useState([]);

  React.useEffect(() => {
    const pid = selectedProjectId || 0;
    
    // 1. Si viene como prop la usamos, si no, hacemos el fetch directo a la API
    const matrixPromise = fetchTTPMatrix 
      ? fetchTTPMatrix(pid) 
      : fetch(`/api/infrastructure/ttps?project_id=${pid}`).then(r => r.json());

    matrixPromise
      .then(res => {
        console.log(">>> RESPUESTA TTP MATRIX RECIBIDA:", res);
        const data = Array.isArray(res) ? res : (res?.data || res?.ttps || []);
        
        if (Array.isArray(data)) {
          const processed = data.map(ttp => {
            const rawTactic = ttp.tactic || ttp.Tactic || '';
            return {
              id: ttp.id || ttp.ID || '',
              name: ttp.name || ttp.Name || '',
              desc: ttp.desc || ttp.Desc || '',
              cves: ttp.cves || ttp.CVEs || [],
              // Una técnica pertenece a TODAS sus tácticas, no solo a la primera
              // que casaba: T1078 es Defense Evasion, Persistence, Privilege
              // Escalation e Initial Access a la vez, y así se pinta en la matriz.
              tactics: normalizeTacticKeys(rawTactic),
              remed: ['Implementar filtrado y monitorización de seguridad.']
            };
          }).filter(t => t.id !== '');

          console.log(">>> TTPS TOTALES CARGADAS EN MATRIZ:", processed.length);
          setFinalTtps(processed);
        }
      })
      .catch(err => {
        console.error("Error al cargar TTP Matrix:", err);
        if (showToast) showToast(`Error al cargar TTPs: ${err.message}`, 'error');
      });
  }, [fetchTTPMatrix, selectedProjectId, showToast]);

  // Filtrar TTPs por búsqueda
  const filteredTtps = finalTtps.filter(t => 
    t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );


  const handleSelectTtp = (id) => {
    if (selectedTtpId === id) {
      // Si ya está seleccionada, abrir modal
      const ttp = finalTtps.find(t => t.id === id);
      if (ttp) setModalTtp(ttp);
    } else {
      setSelectedTtpId(id);
      // Scroll automático suave hacia la primera celda de la técnica en la matriz.
      // Las referencias se indexan por táctica porque una misma técnica ocupa
      // ahora una celda en cada una de sus columnas.
      const ttp = finalTtps.find(t => t.id === id);
      const primeraTactica = ttp?.tactics?.[0];
      const celda = primeraTactica ? cellRefs.current[`${primeraTactica}:${id}`] : null;
      if (celda) {
        celda.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  };

  const handleOpenModalForTtp = (ttp) => {
    setSelectedTtpId(ttp.id);
    setModalTtp(ttp);
  };

  const handleMarkMitigated = () => {
    if (showToast) {
      showToast(`TTP ${modalTtp?.id} marcada como mitigada correctamente.`, 'success');
    }
    setModalTtp(null);
  };

  const handleMapTTPs = () => {
    setIsModalClosed(false);
    
    // Enviar project_id para que el sweep sea acotado al proyecto activo.
    // El hub WS entregará los eventos SOLO a los clientes de este proyecto.
    const pid = Number(selectedProjectId) || 0;
    fetch('/api/infrastructure/map-ttps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: pid }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.enqueued > 0) {
          // Si realmente se encolaron tareas, activamos el modal
          setSyncStatus(prev => ({
            ...prev,
            processing: true,
            current_cve: 'Iniciando análisis...',
            logs: ['Conectando con el motor de IA en segundo plano...']
          }));
          if (showToast) showToast(`Mapeo de ${data.enqueued} vulnerabilidades iniciado`, 'success');
        } else {
          // Si no hay tareas, avisamos y no bloqueamos la UI
          if (showToast) showToast('Todas las vulnerabilidades ya han sido mapeadas en este proyecto.', 'info');
        }
      })
      .catch(err => {
        console.error("Error starting TTP mapping:", err);
        if (showToast) showToast('Error al iniciar el mapeo de TTPs', 'error');
      });
  };

  return (
    <main className="ttps">
      <section className="page-head">
        <div className="head-info">
          <p className="eyebrow">Inteligencia de amenazas</p>
          <h2>Tácticas, Técnicas y Procedimientos (TTPs)</h2>
        </div>
        <p style={{ maxWidth: '450px', fontSize: '13.5px', textAlign: 'right', margin: 0, opacity: 0.9 }}>
          Selecciona una TTP en el listado para localizarla en la matriz MITRE ATT&CK. Vuelve a hacer clic sobre la misma TTP para abrir su ficha completa con descripción, CVE asociada y remediaciones recomendadas.
        </p>
      </section>

      {/* TABS DE VISTA */}
      <div className="view-tabs" style={{ display: 'flex', gap: '20px', marginBottom: '30px', paddingLeft: '20px', paddingRight: '20px' }}>
        <button 
          className={`nav-btn ${viewMode === 'matrix' ? 'active' : ''}`} 
          onClick={() => setViewMode('matrix')}
        >
          <span className="ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
              <path d="M3.5 9h17M8 9v11" />
            </svg>
          </span>
          Matriz MITRE
        </button>
        <button 
          className={`nav-btn ${viewMode === 'dashboard' ? 'active' : ''}`} 
          onClick={() => setViewMode('dashboard')}
        >
          <span className="ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M18 20V10M12 20V4M6 20v-6" />
            </svg>
          </span>
          Dashboard
        </button>
      </div>

      {/* BOTÓN FLOTANTE PARA REABRIR MODAL (SI ESTÁ CERRADO PERO PROCESANDO) */}
      {syncStatus.processing && isModalClosed && (
        <button 
          onClick={() => setIsModalClosed(false)} 
          className="btn btn-outline" 
          style={{ 
            position: 'fixed', 
            bottom: '30px', 
            right: '30px', 
            zIndex: 9000, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            padding: '12px 20px', 
            fontSize: '13px', 
            background: 'var(--panel-1)',
            borderColor: 'var(--c400)', 
            color: 'var(--c50)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5), 0 0 15px rgba(122, 115, 255, 0.3)',
            borderRadius: '12px'
          }}
        >
          <div className="glow-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', borderTopColor: 'var(--c50)' }}></div>
          Ver proceso de IA
        </button>
      )}

      {syncStatus.processing && !isModalClosed && (
        <div className="ttp-modal-backdrop" onClick={() => setIsModalClosed(true)} style={{ zIndex: 9999 }}>
          <div className="ttp-modal" onClick={(e) => e.stopPropagation()} style={{ width: '90%', maxWidth: '800px', padding: '24px' }}>
            <div className="modal-head" style={{ marginBottom: '20px' }}>
              <div>
                <p className="eyebrow">Progreso de Inteligencia Artificial</p>
                <h3>Procesando TTPs en segundo plano</h3>
              </div>
              <button className="modal-close" onClick={() => setIsModalClosed(true)}>
                ✕
              </button>
            </div>

            <div className="loading-card" style={{ background: 'transparent', border: 'none', padding: 0 }}>
              <div className="spinner-container" style={{ marginBottom: '20px' }}>
                <div className="glow-spinner"></div>
                <span className="spinner-text">Procesando TTPs de vulnerabilidades en segundo plano...</span>
              </div>
              
              <div className="progress-container">
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill-indeterminate"></div>
                </div>
                {syncStatus.current_cve && (
                  <div className="current-cve-status">
                    Mapeando CVE: <strong className="cve-highlight">{syncStatus.current_cve}</strong>
                  </div>
                )}
              </div>

              <div className="logs-container">
                <h4>Consola de Inferencia (Logs de Ollama)</h4>
                <div className="logs-terminal" style={{ maxHeight: '300px' }}>
                  {syncStatus.logs.map((logLine, idx) => (
                    <div key={idx} className="log-line">{logLine}</div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'dashboard' && (
        <div style={{ padding: '0 20px' }}>
          <TTPDashboard projectId={selectedProjectId} finalTtps={finalTtps} />
        </div>
      )}

      {viewMode === 'matrix' && (
      <section className="workspace">
        {/* MATRIZ + FOOTER (ARRIBA) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
            {/* MATRIZ MITRE ATT&CK */}
            <div className="matrix-panel">
              <h3>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
                  <path d="M3.5 9h17M8 9v11" />
                </svg>
                Matriz MITRE ATT&CK
              </h3>
              <p className="matrix-sub">
                {TACTICS.length} TÁCTICAS · DESPLAZA HORIZONTALMENTE PARA VER LA MATRIZ COMPLETA
              </p>

              <div className="matrix-scroll">
                <div className="matrix">
                  {TACTICS.map((tac) => {
                    const ttpsInTactic = finalTtps.filter((t) => t.tactics.includes(tac.key));
                    return (
                      <div key={tac.key} className="tactic-col">
                        <div className="tactic-head">
                          <div>{tac.label}</div>
                          <small style={{ fontSize: '8px', opacity: 0.7 }}>{tac.id}</small>
                        </div>

                        {ttpsInTactic.map((ttp) => {
                          const isSelected = ttp.id === selectedTtpId;
                          return (
                            <div
                              key={ttp.id}
                              ref={(el) => (cellRefs.current[`${tac.key}:${ttp.id}`] = el)}
                              className={`cell ${isSelected ? 'selected' : ''}`}
                              onClick={() => handleSelectTtp(ttp.id)}
                            >
                              <span className="cid">{ttp.id}</span>
                              <span className="cname">{ttp.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* FOOTER ESTADÍSTICAS (FUERA DEL PANEL) */}
            <div className="matrix-stats-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', padding: '16px 20px', background: 'rgba(56, 19, 255, 0.05)', borderRadius: '12px', border: '1px solid var(--c700)', position: 'relative' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: 'rgba(51, 224, 138, 0.1)', border: '1px solid var(--ok)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ok)', fontSize: '18px', fontFamily: 'Orbitron, sans-serif', fontWeight: 'bold' }}>
                     {finalTtps.length}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                     <span style={{ fontSize: '10px', color: 'var(--c400)', textTransform: 'uppercase', letterSpacing: '1.5px', fontFamily: '"Share Tech Mono", monospace' }}>Detectadas</span>
                     <span style={{ fontSize: '14px', color: 'var(--c50)', fontWeight: '600' }}>TTPs en Entorno</span>
                  </div>
               </div>
               
               <div style={{ width: '1px', height: '34px', background: 'var(--c700)' }}></div>
               
               <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: 'rgba(122, 115, 255, 0.1)', border: '1px solid var(--c500)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c300)', fontSize: '18px', fontFamily: 'Orbitron, sans-serif', fontWeight: 'bold' }}>
                     {totalMitreTTPs}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                     <span style={{ fontSize: '10px', color: 'var(--c400)', textTransform: 'uppercase', letterSpacing: '1.5px', fontFamily: '"Share Tech Mono", monospace' }}>Catálogo</span>
                     <span style={{ fontSize: '14px', color: 'var(--c50)', fontWeight: '600' }}>TTPs MITRE</span>
                  </div>
               </div>

               {syncStatus.processing ? (
                 <button onClick={() => setIsModalClosed(false)} className="btn btn-outline" style={{ position: 'absolute', right: '20px', display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 16px', fontSize: '12px', border: '1px solid var(--c500)', color: 'var(--c50)' }}>
                    <div className="glow-spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', borderTopColor: 'var(--c50)' }}></div>
                    Ver progreso de IA
                 </button>
               ) : (
                 <button onClick={handleMapTTPs} className="btn btn-primary" style={{ position: 'absolute', right: '20px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '12px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}>
                       <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                    Calcular TTPs (IA)
                 </button>
               )}
            </div>
          </div>

        {/* LISTADO DE TTPs (DEBAJO DE LA MATRIZ) */}
        <div className="list-panel">
            <h3>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 6h16M4 12h16M4 18h10" />
              </svg>
              Listado de TTPs
            </h3>
            <div className="search-wrap">
              <input
                type="text"
                id="ttpSearch"
                placeholder="Buscar por ID o nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="ttp-list">
              {filteredTtps.map((ttp) => {
                const etiquetas = TACTICS.filter(t => ttp.tactics.includes(t.key));
                const isSelected = selectedTtpId === ttp.id;
                
                return (
                  <div 
                    key={ttp.id} 
                    className={`ttp-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectTtp(ttp.id)}
                    onDoubleClick={() => handleOpenModalForTtp(ttp)}
                  >
                    <div className="row1">
                      <span className="tid">{ttp.id}</span>
                      <span className="tactic-tag">{etiquetas.map(t => t.label).join(' · ')}</span>
                    </div>
                    <div className="tname">{ttp.name}</div>
                    <div className="hint">Clic de nuevo para abrir detalle ➔</div>
                  </div>
                );
              })}
              {filteredTtps.length === 0 && (
                <div className="empty-list">No se encontraron TTPs.</div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* MODAL DETALLE DE TTP */}
      {modalTtp && (
        <div className="ttp-modal-backdrop" onClick={() => setModalTtp(null)}>
          <div className="ttp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <p className="eyebrow">{modalTtp.id}</p>
                <h3>{modalTtp.name}</h3>
              </div>
              <button className="modal-close" onClick={() => setModalTtp(null)}>
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {TACTICS.filter((t) => modalTtp.tactics.includes(t.key)).map((t) => (
                <span className="tactic-badge" key={t.key}>
                  <i></i>{' '}
                  {t.label}
                </span>
              ))}
            </div>

            <div className="sec">
              <p className="sec-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5M12 16h.01" />
                </svg>
                Descripción
              </p>
              <p>{modalTtp.desc}</p>
            </div>

            {modalTtp.cves && modalTtp.cves.length > 0 && (
              <div className="sec">
                <p className="sec-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 2 3.5 6v6c0 5 3.6 8.5 8.5 10 4.9-1.5 8.5-5 8.5-10V6L12 2Z" />
                    <path d="M9.5 12.3l1.8 1.8 3.4-3.8" />
                  </svg>
                  CVEs asociadas ({modalTtp.cves.length})
                </p>
                <div className="cves-container" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {modalTtp.cves.map((cve, idx) => (
                    <div className="cve-box" key={idx}>
                      <div className="cve-top">
                        <span className="cve-id">{cve.id}</span>
                        <span className="cve-score">CVSS {cve.cvss}</span>
                      </div>
                      <p>{cve.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {modalTtp.remed && modalTtp.remed.length > 0 && (
              <div className="sec">
                <p className="sec-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M9 12.5 11 15l4.5-5" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                  Remediaciones recomendadas
                </p>
                <ul className="remed-list">
                  {modalTtp.remed.map((r, idx) => (
                    <li key={idx}>
                      <span className="chk">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      </span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="modal-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setModalTtp(null)} style={{ height: 'auto', padding: '8px 16px', fontSize: '11px' }}>
                Cerrar
              </button>
              <button type="button" className="btn btn-primary" onClick={handleMarkMitigated} style={{ height: 'auto', padding: '8px 16px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px', flexShrink: 0 }}>
                  <path d="M9 12.5 11 15l4.5-5" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
                Marcar como mitigada
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

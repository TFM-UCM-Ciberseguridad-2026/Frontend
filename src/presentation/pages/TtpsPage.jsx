import React, { useState, useRef } from 'react';
import './TtpsPage.css';

export const TACTICS = [
  { key: 'reco', id: 'TA0043', label: 'Reconnaissance' },
  { key: 'resdev', id: 'TA0042', label: 'Resource Development' },
  { key: 'ia', id: 'TA0001', label: 'Initial Access' },
  { key: 'exec', id: 'TA0002', label: 'Execution' },
  { key: 'pers', id: 'TA0003', label: 'Persistence' },
  { key: 'pe', id: 'TA0004', label: 'Privilege Escalation' },
  { key: 'de', id: 'TA0005', label: 'Defense Evasion' },
  { key: 'ca', id: 'TA0006', label: 'Credential Access' },
  { key: 'disc', id: 'TA0007', label: 'Discovery' },
  { key: 'lm', id: 'TA0008', label: 'Lateral Movement' },
  { key: 'coll', id: 'TA0009', label: 'Collection' },
  { key: 'c2', id: 'TA0011', label: 'Command & Control' },
  { key: 'exfil', id: 'TA0010', label: 'Exfiltration' },
  { key: 'impact', id: 'TA0040', label: 'Impact' },
];

export const normalizeTacticKey = (tacticStr = '') => {
  if (!tacticStr) return 'de';
  const str = String(tacticStr).toLowerCase();
  
  if (['reco', 'resdev', 'ia', 'exec', 'pers', 'pe', 'de', 'ca', 'disc', 'lm', 'coll', 'c2', 'exfil', 'impact'].includes(str)) {
    return str;
  }
  
  if (str.includes('recon') || str === 'ta0043') return 'reco';
  if (str.includes('resource') || str === 'ta0042') return 'resdev';
  if (str.includes('initial') || (str.includes('access') && !str.includes('cred')) || str === 'ta0001') return 'ia';
  if (str.includes('execution') || str === 'exec' || str === 'ta0002') return 'exec';
  if (str.includes('persist') || str === 'ta0003') return 'pers';
  if (str.includes('privilege') || str.includes('escalat') || str === 'ta0004') return 'pe';
  if (str.includes('defense') || str.includes('evasion') || str.includes('stealth') || str === 'ta0005') return 'de';
  if (str.includes('credential') || str === 'ta0006') return 'ca';
  if (str.includes('discovery') || str === 'ta0007') return 'disc';
  if (str.includes('lateral') || str.includes('movement') || str === 'ta0008') return 'lm';
  if (str.includes('collection') || str === 'ta0009') return 'coll';
  if (str.includes('command') || str.includes('control') || str === 'c2' || str === 'ta0011') return 'c2';
  if (str.includes('exfil') || str === 'ta0010') return 'exfil';
  if (str.includes('impact') || str === 'ta0040') return 'impact';

  return 'de';
};

const INFERRED_TTP_INFO = {
  'T1499': { name: 'Endpoint Denial of Service', tactic: 'impact' },
  'T1499.001': { name: 'OS Exhaustion Flood', tactic: 'impact' },
  'T1499.002': { name: 'Service Exhaustion Flood', tactic: 'impact' },
  'T1499.003': { name: 'Application Exhaustion Flood', tactic: 'impact' },
  'T1499.004': { name: 'Application Fault', tactic: 'impact' },
  'T1564': { name: 'Hide Artifacts', tactic: 'de' },
  'T1564.009': { name: 'Resource Fork', tactic: 'de' },
  'T1027': { name: 'Obfuscated Files or Information', tactic: 'de' },
  'T1027.006': { name: 'HTML Smuggling', tactic: 'de' },
  'T1027.009': { name: 'Embedded Payloads', tactic: 'de' },
  'T1574': { name: 'Hijack Execution Flow', tactic: 'pe' },
  'T1574.005': { name: 'Executable Installer File Permissions Weakness', tactic: 'pe' },
  'T1574.006': { name: 'Dynamic Link Library Search Order Hijacking', tactic: 'pe' },
  'T1574.007': { name: 'Path Interception by PATH Environment Variable', tactic: 'pe' },
  'T1574.010': { name: 'Services File Permissions Weakness', tactic: 'pe' },
  'T1547': { name: 'Boot or Logon Autostart Execution', tactic: 'pers' },
  'T1547.009': { name: 'Shortcut Modification', tactic: 'pers' },
  'T1562.003': { name: 'Impair Defenses: Impair Command History Logging', tactic: 'de' },
  'T1553.002': { name: 'Subvert Trust Controls: Code Signing', tactic: 'de' },
  'T1036.001': { name: 'Masquerading: Invalid Code Signature', tactic: 'de' },
  'T1539': { name: 'Steal Web Session Cookie', tactic: 'ca' },
  'T1543': { name: 'Create or Modify System Process', tactic: 'pers' },
  'T1553.004': { name: 'Install Root Certificate', tactic: 'de' }
};

export function TtpsPage({ graphData, showToast, fetchInfrastructure }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTtpId, setSelectedTtpId] = useState(null);
  const [modalTtp, setModalTtp] = useState(null);
  const [totalMitreTTPs, setTotalMitreTTPs] = useState(0);
  const cellRefs = useRef({});

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

  React.useEffect(() => {
    let intervalId = null;

    const checkStatus = () => {
      fetch('/api/infrastructure/ttp-sync-status')
        .then(res => res.json())
        .then(data => {
          if (data) {
            setSyncStatus(data);
            if (data.processing) {
              if (!intervalId) {
                intervalId = setInterval(checkStatus, 1500);
              }
            } else {
              if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
                if (fetchInfrastructure) {
                  fetchInfrastructure();
                }
              }
            }
          }
        })
        .catch(err => console.error("Error fetching TTP sync status:", err));
    };

    checkStatus();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [fetchInfrastructure]);

  React.useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [syncStatus.logs]);

  // Leemos los atributos de las CVEs para extraer las TTPs
  const vulNodes = (graphData?.nodes || []).filter(n => n.labels?.includes('Vulnerability') || n.primaryLabel === 'Vulnerability');
  
  const extractedTtpsMap = {};
  
  vulNodes.forEach(vul => {
    const props = vul.properties || {};
    
    let ttps = [];
    if (typeof props.ttps === 'string') {
      try {
        const parsed = JSON.parse(props.ttps);
        if (Array.isArray(parsed)) {
          ttps = parsed;
        } else {
          ttps = props.ttps.split(',').map(t => t.trim()).filter(Boolean);
        }
      } catch {
        ttps = props.ttps.split(',').map(t => t.trim()).filter(Boolean);
      }
    } else if (Array.isArray(props.ttps)) {
      ttps = props.ttps;
    }
    
    ttps.forEach(ttpItem => {
      const isObj = typeof ttpItem === 'object' && ttpItem !== null;
      const ttpId = isObj ? (ttpItem.ttp_id || ttpItem.id) : ttpItem;
      if (!ttpId) return;

      const ttpNameBackend = isObj ? ttpItem.name : null;
      const ttpTacticBackend = isObj ? ttpItem.tactic : null;
      const ttpDescBackend = isObj ? (ttpItem.description || ttpItem.desc) : null;

      if (!extractedTtpsMap[ttpId]) {
        const fallbackInfo = INFERRED_TTP_INFO[ttpId] || {};

        const name = (ttpNameBackend && ttpNameBackend.trim()) || 
                     fallbackInfo.name || 
                     `TTP ${ttpId}`;

        const rawTactic = ttpTacticBackend || 
                          fallbackInfo.tactic || 
                          'de';

        const tactic = normalizeTacticKey(rawTactic);

        const desc = ttpDescBackend || 
                     `Extraída dinámicamente de ${props.cve_id || props.id || vul.id}`;

        extractedTtpsMap[ttpId] = {
          id: ttpId,
          name: name,
          tactic: tactic,
          desc: desc,
          cves: [{
            id: props.cve_id || props.id || vul.id,
            cvss: props.cvss_score || 'N/A',
            desc: props.description || ''
          }],
          remed: ['Implementar filtrado y monitorización de seguridad.']
        };
      } else {
        const currentCveId = props.cve_id || props.id || vul.id;
        if (currentCveId) {
          const exists = extractedTtpsMap[ttpId].cves.some(c => c.id === currentCveId);
          if (!exists) {
            extractedTtpsMap[ttpId].cves.push({
              id: currentCveId,
              cvss: props.cvss_score || 'N/A',
              desc: props.description || ''
            });
          }
        }
      }
    });
  });

  const finalTtps = Object.values(extractedTtpsMap);

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
      // Scroll automático suave hacia la celda en la matriz
      if (cellRefs.current[id]) {
        cellRefs.current[id].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
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
    fetch('/api/infrastructure/map-ttps', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (showToast) {
          showToast(data.message || 'Mapeo de TTPs iniciado en segundo plano', 'success');
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

      {syncStatus.processing ? (
        <section className="workspace-loading">
          <div className="loading-card">
            <div className="spinner-container">
              <div className="glow-spinner"></div>
              <span className="spinner-text">Procesando TTPs de vulnerabilidades en segundo plano...</span>
            </div>
            
            <div className="progress-container">
              <div className="progress-labels">
                <span>Progreso de Inferencia</span>
                <span>{syncStatus.processed_cves} / {syncStatus.total_cves} CVEs</span>
              </div>
              <div className="progress-bar-bg">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${syncStatus.total_cves > 0 ? (syncStatus.processed_cves / syncStatus.total_cves) * 100 : 0}%` }}
                ></div>
              </div>
              {syncStatus.current_cve && (
                <div className="current-cve-status">
                  Mapeando CVE: <strong className="cve-highlight">{syncStatus.current_cve}</strong>
                </div>
              )}
            </div>

            <div className="logs-container">
              <h4>Consola de Inferencia (Logs de Ollama)</h4>
              <div className="logs-terminal">
                {syncStatus.logs.map((logLine, idx) => (
                  <div key={idx} className="log-line">{logLine}</div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="workspace">
          {/* LISTADO DE TTPs (IZQUIERDA) */}
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
                const tacticObj = TACTICS.find(t => t.key === ttp.tactic);
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
                      <span className="tactic-tag">{tacticObj ? tacticObj.label : ttp.tactic}</span>
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

          {/* COLUMNA DERECHA (MATRIZ + FOOTER) */}
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
                    const ttpsInTactic = finalTtps.filter((t) => t.tactic === tac.key);
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
                              ref={(el) => (cellRefs.current[ttp.id] = el)}
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

               <button onClick={handleMapTTPs} className="btn btn-primary" style={{ position: 'absolute', right: '20px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '12px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}>
                     <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                  Calcular TTPs (IA)
               </button>
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

            <span className="tactic-badge">
              <i></i>{' '}
              {TACTICS.find((t) => t.key === modalTtp.tactic)?.label || modalTtp.tactic}
            </span>

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

import React, { useState, useRef } from 'react';
import { TACTICS, normalizeTacticKey, normalizeTacticKeys } from '../../domain/mitre/tactics';
import { NIVEL_ES } from '../../domain/remediacion/metricas';
import './TtpsPage.css';
import TTPDashboard from '../components/TTPDashboard/TTPDashboard.jsx';

// Reexportados por compatibilidad con quien ya los importaba desde esta página.
export { TACTICS, normalizeTacticKey };

/** Dominio de una URL de parche, que es lo único que cabe en la ficha. */
function dominioDe(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function TtpsPage({
  fetchTTPMatrix, selectedProjectId, showToast, graphData,
  projectPatchesByCVE, projectPatchesLoading, fetchProjectPatches,
  fetchAppliedPatchHistory, onOpenPatchInQueue,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTtpId, setSelectedTtpId] = useState(null);
  const [modalTtp, setModalTtp] = useState(null);
  const [viewMode, setViewMode] = useState('matrix');
  const [totalMitreTTPs, setTotalMitreTTPs] = useState(0);
  const cellRefs = useRef({});

  const nodes = graphData?.nodes || [];
  const vulNodes = nodes.filter(n => n.labels?.includes('Vulnerability') || n.primaryLabel === 'Vulnerability');

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
              // El backend marca resuelta la técnica cuyas CVE están TODAS cerradas.
              // Una mitigada o una sin hallazgo la mantienen activa.
              resolved: ttp.resolved === true,
              openCves: Number(ttp.open_cves ?? 0),
              totalCves: Number(ttp.total_cves ?? (ttp.cves || []).length),
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

  // Los parches del proyecto se piden una vez y alimentan la ficha de cada técnica.
  React.useEffect(() => {
    if (selectedProjectId) fetchProjectPatches?.(selectedProjectId);
  }, [selectedProjectId, fetchProjectPatches]);

  // Filtrar por búsqueda y empujar las técnicas resueltas al final. La API no devuelve
  // ningún orden garantizado, así que esta es la única ordenación de la pantalla: al ser
  // estable, dentro de cada grupo se respeta el orden en el que llegaron.
  const filteredTtps = React.useMemo(() => {
    const q = searchQuery.toLowerCase();
    return finalTtps
      .filter(t => t.id.toLowerCase().includes(q) || t.name.toLowerCase().includes(q))
      .sort((a, b) => Number(a.resolved) - Number(b.resolved));
  }, [finalTtps, searchQuery]);

  const ttpsActivas = React.useMemo(() => finalTtps.filter(t => !t.resolved), [finalTtps]);
  const ttpsResueltas = React.useMemo(() => finalTtps.filter(t => t.resolved), [finalTtps]);

  // Índice CVE -> instalaciones donde tiene hallazgo, para poder pedir el histórico de
  // parches aplicados de una CVE ya cerrada. Sale del grafo que la página ya tiene.
  const instalacionesPorCVE = React.useMemo(() => {
    const nodos = graphData?.nodes || [];
    const relaciones = graphData?.relationships || [];
    const porId = new Map(nodos.map(n => [n.id, n]));
    const esFinding = n => n?.labels?.includes('Finding') || n?.primaryLabel === 'Finding';

    // finding -> CVE y soporte -> finding, que son las dos aristas que hacen falta.
    const cvePorFinding = new Map();
    const soportePorFinding = new Map();
    // Mapeo bidireccional ContainerImage -> Container
    const containerPorImagenId = new Map();

    for (const r of relaciones) {
      if (r.type === 'OF_VULNERABILITY') {
        const targetNode = porId.get(r.target);
        const cve = targetNode?.properties?.cve_id || targetNode?.properties?.id;
        if (cve) cvePorFinding.set(r.source, cve);
      } else if (r.type === 'HAS_FINDING') {
        soportePorFinding.set(r.target, porId.get(r.source));
      } else if (r.type === 'USES_IMAGE') {
        const source = porId.get(r.source);
        const target = porId.get(r.target);
        if (source && target) {
          const isSourceContainer = source.labels?.includes('Container') || source.primaryLabel === 'Container';
          const isTargetContainer = target.labels?.includes('Container') || target.primaryLabel === 'Container';
          if (isSourceContainer && target.properties?.id) {
            containerPorImagenId.set(target.properties.id, source.properties?.id);
          } else if (isTargetContainer && source.properties?.id) {
            containerPorImagenId.set(source.properties.id, target.properties?.id);
          }
        }
      }
    }

    const indice = new Map();
    for (const n of nodos) {
      if (!esFinding(n)) continue;

      // Soporte para nodos agrupados en displayGraphData (FindingsGroup)
      if (Array.isArray(n.properties?.findings)) {
        for (const f of n.properties.findings) {
          let cve = f.properties?.cve_id || f.properties?.driver_cve_id || f.cve_id;
          if (!cve && typeof f.properties?.finding_key === 'string' && f.properties.finding_key.includes('|')) {
            const parts = f.properties.finding_key.split('|');
            const lastPart = parts[parts.length - 1];
            if (lastPart.startsWith('CVE-')) cve = lastPart;
          }
          if (!cve) continue;

          const ownerType = n.properties?.owner_type;
          const esContenedor = ownerType === 'Container' || ownerType === 'ContainerImage' || Boolean(n.properties?.container_id) || Boolean(f.properties?.container_id);
          const tipo = esContenedor ? 'CONTAINER' : 'SOFTWARE_INSTALLATION';
          let id = null;
          if (esContenedor) {
            id =
              n.properties?.container_id ||
              f.properties?.container_id ||
              (ownerType === 'Container' ? n.properties?.owner_id : null) ||
              (n.properties?.container_image_id ? containerPorImagenId.get(n.properties.container_image_id) : null) ||
              (typeof f.properties?.finding_key === 'string' ? f.properties.finding_key.split('|')[0] : null) ||
              n.properties?.owner_id;
          } else {
            id =
              n.properties?.software_installation_id ||
              f.properties?.installation_id ||
              (typeof f.properties?.finding_key === 'string' ? f.properties.finding_key.split('|')[0] : null) ||
              n.properties?.owner_id;
          }

          if (!id) continue;
          if (!indice.has(cve)) indice.set(cve, []);
          if (!indice.get(cve).some(a => a.id === id && a.tipo === tipo)) {
            indice.get(cve).push({ id, tipo });
          }
        }
        continue;
      }

      // Obtener CVE
      let cve = cvePorFinding.get(n.id) || n.properties?.cve_id || n.properties?.driver_cve_id;
      if (!cve && typeof n.properties?.finding_key === 'string' && n.properties.finding_key.includes('|')) {
        const parts = n.properties.finding_key.split('|');
        const lastPart = parts[parts.length - 1];
        if (lastPart.startsWith('CVE-')) cve = lastPart;
      }
      if (!cve) continue;

      const soporte = soportePorFinding.get(n.id);

      // Determinar si es un hallazgo de contenedor (directo o vía imagen de contenedor)
      const esImagenContenedor =
        n.properties?.context_type === 'CONTAINER_IMAGE' ||
        soporte?.labels?.includes('ContainerImage') ||
        soporte?.primaryLabel === 'ContainerImage';

      const esContenedorDirecto =
        soporte?.labels?.includes('Container') ||
        soporte?.primaryLabel === 'Container';

      const esContenedor = Boolean(n.properties?.container_id) || esImagenContenedor || esContenedorDirecto;

      let id = null;
      let tipo = 'SOFTWARE_INSTALLATION';

      if (esContenedor) {
        tipo = 'CONTAINER';
        // Prioridad de resolución de id del contenedor:
        // 1. container_id en las propiedades del finding
        // 2. si el soporte es el propio contenedor, su id
        // 3. resolución por relación USES_IMAGE hacia el contenedor anfitrión
        // 4. container_id en el soporte
        // 5. primer segmento de finding_key ("container_id|image_id|cve_id")
        id =
          n.properties?.container_id ||
          (esContenedorDirecto ? soporte?.properties?.id : null) ||
          (soporte?.properties?.id ? containerPorImagenId.get(soporte.properties.id) : null) ||
          soporte?.properties?.container_id ||
          (esImagenContenedor && typeof n.properties?.finding_key === 'string'
            ? n.properties.finding_key.split('|')[0]
            : null) ||
          soporte?.properties?.id;
      } else {
        tipo = 'SOFTWARE_INSTALLATION';
        id =
          soporte?.properties?.id ||
          soporte?.properties?.installation_id ||
          n.properties?.installation_id ||
          (typeof n.properties?.finding_key === 'string' ? n.properties.finding_key.split('|')[0] : null);
      }

      if (!id) continue;

      if (!indice.has(cve)) indice.set(cve, []);
      if (!indice.get(cve).some(a => a.id === id && a.tipo === tipo)) {
        indice.get(cve).push({ id, tipo });
      }
    }
    return indice;
  }, [graphData]);


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

  // Estados de parcheo de una CVE, tal y como los publica la matriz.
  const CVE_ESTADO = {
    OPEN: { etiqueta: 'Sin parchear', clase: 'estado-open' },
    MITIGATED: { etiqueta: 'Mitigada', clase: 'estado-mitigada' },
    PATCHED: { etiqueta: 'Parcheada', clase: 'estado-parcheada' },
    UNKNOWN: { etiqueta: 'Sin hallazgo', clase: 'estado-desconocido' },
  };
  const estadoDeCVE = (cve) => CVE_ESTADO[cve?.status] || CVE_ESTADO.UNKNOWN;
  const estaCerrada = (cve) => cve?.status === 'PATCHED';

  // Histórico de parches aplicados, por CVE ya cerrada. La cola de parcheo no sirve para
  // estas: excluye los hallazgos cerrados, así que llevar allí dejaría una tabla vacía.
  const [historialPorCVE, setHistorialPorCVE] = useState({});

  const verHistorialDeCVE = async (cveID) => {
    if (historialPorCVE[cveID]) {
      // Si ya está abierto, cerrarlo; si estaba cerrado y con datos, abrirlo;
      // si estaba cerrado pero con 0 filas (posible carga previa vacía o incompleta), reintentar consulta.
      if (!historialPorCVE[cveID].abierto && (historialPorCVE[cveID].filas?.length || 0) > 0) {
        setHistorialPorCVE(prev => ({ ...prev, [cveID]: { ...prev[cveID], abierto: true } }));
        return;
      } else if (historialPorCVE[cveID].abierto) {
        setHistorialPorCVE(prev => ({ ...prev, [cveID]: { ...prev[cveID], abierto: false } }));
        return;
      }
    }

    let activos = instalacionesPorCVE.get(cveID) || [];
    if (activos.length === 0) {
      // Fallback de seguridad: buscar en todos los contenedores e instalaciones del grafo
      const candidatos = [];
      const nodos = graphData?.nodes || [];
      for (const n of nodos) {
        if (n.labels?.includes('Container') || n.primaryLabel === 'Container') {
          if (n.properties?.id) candidatos.push({ id: n.properties.id, tipo: 'CONTAINER' });
        } else if (n.labels?.includes('SoftwareInstallation') || n.primaryLabel === 'SoftwareInstallation') {
          const id = n.properties?.id || n.properties?.installation_id;
          if (id) candidatos.push({ id, tipo: 'SOFTWARE_INSTALLATION' });
        }
      }
      const seenCand = new Set();
      activos = candidatos.filter(c => {
        const k = `${c.tipo}:${c.id}`;
        if (seenCand.has(k)) return false;
        seenCand.add(k);
        return true;
      });
    }

    if (activos.length === 0) {
      setHistorialPorCVE(prev => ({ ...prev, [cveID]: { abierto: true, cargando: false, filas: [] } }));
      return;
    }

    setHistorialPorCVE(prev => ({ ...prev, [cveID]: { abierto: true, cargando: true, filas: [] } }));

    const porActivo = await Promise.all(
      activos.map(a => Promise.resolve(fetchAppliedPatchHistory?.(a.id, a.tipo)).catch(() => []))
    );
    // El endpoint devuelve el histórico del activo entero: aquí solo interesa esta CVE.
    const filasBrutas = porActivo.flat().filter(Boolean).filter(x => !x.cve_id || x.cve_id === cveID);
    const seen = new Set();
    const filas = [];
    for (const f of filasBrutas) {
      const key = `${f.patch_id || ''}|${f.applied_at || ''}|${f.asset_id || f.installation_id || f.container_id || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        filas.push(f);
      }
    }

    setHistorialPorCVE(prev => ({ ...prev, [cveID]: { abierto: true, cargando: false, filas } }));
  };

  // Un parche de una CVE todavía abierta se puede abrir en la cola; uno de una CVE
  // cerrada no, porque la cola solo lista lo pendiente.
  const abrirParche = (cve) => {
    if (estaCerrada(cve)) {
      verHistorialDeCVE(cve.id);
      return;
    }
    const activos = instalacionesPorCVE.get(cve.id) || [];
    onOpenPatchInQueue?.({
      cve_id: cve.id,
      asset_id: activos.length === 1 ? activos[0].id : undefined,
    });
    setModalTtp(null);
  };

  return (
    <main className="ttps">
      <section className="page-head">
        <div className="head-info">
          <p className="eyebrow">Inteligencia de amenazas</p>
          <h2>Tácticas, Técnicas y Procedimientos (TTPs)</h2>
        </div>
        <p style={{ maxWidth: '450px', fontSize: '13.5px', textAlign: 'right', margin: 0, opacity: 0.9 }}>
          Selecciona una TTP en el listado para localizarla en la matriz MITRE ATT&CK. Vuelve a hacer clic sobre la misma TTP para abrir su ficha completa con descripción, CVE asociadas y los parches publicados para cada una.
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
                    // Dentro de cada columna, las resueltas al fondo. El orden que llega
                    // de la API no está garantizado, y `sort` es estable, así que esto no
                    // altera el orden relativo dentro de cada grupo.
                    const ttpsInTactic = finalTtps
                      .filter((t) => t.tactics.includes(tac.key))
                      .sort((x, y) => Number(x.resolved) - Number(y.resolved));
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
                              className={`cell ${isSelected ? 'selected' : ''} ${ttp.resolved ? 'cell--resuelta' : ''}`}
                              onClick={() => handleSelectTtp(ttp.id)}
                              title={ttp.resolved ? 'Todas sus CVE están cerradas' : undefined}
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
                     <span style={{ fontSize: '14px', color: 'var(--c50)', fontWeight: '600' }}>
                        {ttpsResueltas.length > 0
                          ? `${ttpsActivas.length} activas · ${ttpsResueltas.length} resueltas`
                          : 'TTPs en Entorno'}
                     </span>
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
              {filteredTtps.map((ttp, idx) => {
                const etiquetas = TACTICS.filter(t => ttp.tactics.includes(t.key));
                const isSelected = selectedTtpId === ttp.id;
                // Las resueltas van al final: el separador marca dónde empiezan.
                const abreResueltas = ttp.resolved && !filteredTtps[idx - 1]?.resolved;
                const primeraTactica = etiquetas[0]?.label || '';
                const extraTacticas = etiquetas.length > 1 ? etiquetas.length - 1 : 0;
                const todasTacticasTexto = etiquetas.map(t => t.label).join(' · ');

                return (
                  <React.Fragment key={ttp.id}>
                  {abreResueltas && (
                    <div className="ttp-list-separador">
                      TTPs resueltas ({filteredTtps.filter(t => t.resolved).length})
                    </div>
                  )}
                  <div 
                    className={`ttp-item ${isSelected ? 'selected' : ''} ${ttp.resolved ? 'ttp-item--resuelta' : ''}`}
                    onClick={() => handleSelectTtp(ttp.id)}
                    onDoubleClick={() => handleOpenModalForTtp(ttp)}
                  >
                    <div className="row1">
                      <span className="tid">{ttp.id}</span>
                      {etiquetas.length > 0 && (
                        <span className="tactic-tag" title={todasTacticasTexto}>
                          <span className="tactic-tag-label">{primeraTactica}</span>
                          {extraTacticas > 0 && (
                            <span className="tactic-tag-count">+{extraTacticas}</span>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="tname">{ttp.name}</div>
                    <div className="hint">
                      {ttp.resolved ? 'Resuelta · todas sus CVE cerradas' : 'Clic de nuevo para abrir detalle ➔'}
                    </div>
                  </div>
                  </React.Fragment>
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

            <div className="sec">
              <p className="sec-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4" />
                  <path d="M15 5l4 4" />
                </svg>
                Parches
              </p>

              {modalTtp.resolved && (
                <p className="patch-banner-resuelta">
                  Todas las CVE de esta técnica están cerradas. La técnica se mantiene en la matriz,
                  marcada como resuelta, para poder auditarla.
                </p>
              )}

              {(!modalTtp.cves || modalTtp.cves.length === 0) ? (
                <p className="patch-vacio">Esta técnica no tiene CVE asociadas en este proyecto.</p>
              ) : projectPatchesLoading ? (
                <p className="patch-vacio">Cargando parches del proyecto…</p>
              ) : (
                <div className="patch-list">
                  {modalTtp.cves.map((cve, idx) => {
                    const parches = projectPatchesByCVE?.get?.(cve.id) || [];
                    const estado = estadoDeCVE(cve);
                    const historial = historialPorCVE[cve.id];

                    return (
                      <div className="patch-cve-group" key={cve.id || idx}>
                        <div className="patch-cve-head">
                          <span className="patch-cve-id">{cve.id}</span>
                          <span className={`patch-cve-estado ${estado.clase}`}>{estado.etiqueta}</span>
                          {cve.findings_total > 0 && (
                            <span className="patch-cve-activos">
                              {cve.findings_open} de {cve.findings_total} {cve.findings_total === 1 ? "hallazgo abierto" : "hallazgos abiertos"}
                            </span>
                          )}
                        </div>

                        {parches.length === 0 ? (
                          <p className="patch-sin-parche">
                            Sin parche publicado: solo admite mitigación compensatoria o aceptación formal.
                          </p>
                        ) : (
                          <ul className="patch-items">
                            {parches.map(parche => (
                              <li key={parche.patch_id}>
                                <button
                                  type="button"
                                  className="patch-item"
                                  onClick={() => abrirParche(cve)}
                                  title={estaCerrada(cve)
                                    ? "Ver el histórico de aplicación de este parche"
                                    : "Abrir en la cola de parcheo"}
                                >
                                  <span className="patch-item-desc">
                                    {parche.description || `Parche #${parche.patch_id}`}
                                  </span>
                                  {parche.url && (
                                    <span className="patch-item-url">{dominioDe(parche.url)}</span>
                                  )}
                                  <span className="patch-item-accion">
                                    {estaCerrada(cve) ? "Ver histórico ➔" : "Ver en la cola ➔"}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}

                        {historial?.abierto && (
                          <div className="patch-historial">
                            {historial.cargando ? (
                              <span className="patch-vacio">Cargando histórico…</span>
                            ) : historial.filas.length === 0 ? (
                              <span className="patch-vacio">
                                No consta ninguna declaración de parche para esta CVE.
                              </span>
                            ) : (
                              historial.filas.map((h, i) => (
                                <div className="patch-historial-fila" key={i}>
                                  <span>{NIVEL_ES[h.remediation_level] || h.remediation_level || "Aplicado"}</span>
                                  <span>{h.applied_at ? new Date(h.applied_at).toLocaleDateString("es-ES") : "—"}</span>
                                  <span>{h.applied_by || "—"}</span>
                                  <span title={h.verification?.reason || undefined}>
                                    {h.verification?.verified
                                      ? "Verificado"
                                      : h.verification?.conclusive ? "No coincide" : "No concluyente"}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="modal-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setModalTtp(null)} style={{ height: 'auto', padding: '8px 16px', fontSize: '11px' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

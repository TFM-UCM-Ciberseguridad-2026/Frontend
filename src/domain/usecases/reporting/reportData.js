/**
 * reportData — recolección y normalización de los datos de los informes PPTX.
 *
 * Los dos informes, semanal y mensual, se alimentan del mismo conjunto: cambia qué láminas
 * se componen con él, no de dónde sale. Centralizarlo aquí evita que las cifras del semanal
 * y las del mensual puedan discrepar por leerse de sitios distintos.
 *
 * Ninguna fuente es obligatoria: si un endpoint falla, su bloque queda vacío y la lámina
 * correspondiente lo dice, en lugar de tumbar la generación entera del informe.
 */

const DIA_MS = 24 * 60 * 60 * 1000;

const TACTICAS = [
  { id: 'TA0043', k: 'reco', n: 'Reconnaissance' },
  { id: 'TA0042', k: 'resdev', n: 'Resource Development' },
  { id: 'TA0001', k: 'ia', n: 'Initial Access' },
  { id: 'TA0002', k: 'exec', n: 'Execution' },
  { id: 'TA0003', k: 'pers', n: 'Persistence' },
  { id: 'TA0004', k: 'pe', n: 'Privilege Escalation' },
  { id: 'TA0005', k: 'de', n: 'Defense Evasion' },
  { id: 'TA0006', k: 'ca', n: 'Credential Access' },
  { id: 'TA0007', k: 'disc', n: 'Discovery' },
  { id: 'TA0008', k: 'lm', n: 'Lateral Movement' },
  { id: 'TA0009', k: 'coll', n: 'Collection' },
  { id: 'TA0011', k: 'c2', n: 'Command and Control' },
  { id: 'TA0010', k: 'exfil', n: 'Exfiltration' },
  { id: 'TA0040', k: 'impact', n: 'Impact' },
];

/** Normaliza la táctica al mismo esquema que usa TtpsPage, para no tener dos criterios. */
function normalizarTactica(raw = '') {
  const s = String(raw).toLowerCase();
  if (s.includes('recon')) return 'reco';
  if (s.includes('resource')) return 'resdev';
  if (s.includes('initial')) return 'ia';
  if (s.includes('execution')) return 'exec';
  if (s.includes('persist')) return 'pers';
  if (s.includes('privilege') || s.includes('escalat')) return 'pe';
  if (s.includes('defense') || s.includes('evasion') || s.includes('stealth')) return 'de';
  if (s.includes('credential')) return 'ca';
  if (s.includes('discovery')) return 'disc';
  if (s.includes('lateral') || s.includes('movement')) return 'lm';
  if (s.includes('collection')) return 'coll';
  if (s.includes('command') || s.includes('control')) return 'c2';
  if (s.includes('exfil')) return 'exfil';
  if (s.includes('impact')) return 'impact';
  return 'de';
}

/** Mismo corte que domain.ScoreToSeverity en el backend. */
export function severidadDeScore(score) {
  const n = Number(score) || 0;
  if (n >= 9.0) return 'Critical';
  if (n >= 7.0) return 'High';
  if (n >= 4.0) return 'Medium';
  if (n > 0.0) return 'Low';
  return 'None';
}

function esLabel(nodo, label) {
  return nodo?.labels?.includes(label) || nodo?.primaryLabel === label;
}

function contarPorLabel(nodos, label) {
  return nodos.filter(n => esLabel(n, label)).length;
}

/** Convierte a milisegundos un valor que puede venir como epoch, ISO o Date. */
function aMillis(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v > 1e12 ? v : v * 1000;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? null : t;
}

async function pedirJSON(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn(`[reporte] no se pudo leer ${url}:`, e);
    return null;
  }
}

/**
 * Reúne todo lo necesario para cualquiera de los dos informes.
 *
 * @param {object} repositorio  InfrastructureRepository, para el grafo del proyecto.
 * @param {number|string} projectId
 * @param {number} ventanaDias  Días del periodo cubierto: 7 en el semanal, 30 en el mensual.
 *                              Determina qué cuenta como alta o cierre "del periodo".
 */
export async function recopilarDatos(repositorio, projectId, ventanaDias) {
  const grafo = await repositorio.exportProject(projectId);
  if (!grafo || !grafo.nodes) {
    throw new Error('El backend devolvió un grafo vacío o con formato inválido.');
  }
  const nodos = grafo.nodes;

  const [statsTTP, matrizCruda, aptsCrudos, slaConfig, slaBreaches, cola] = await Promise.all([
    pedirJSON(`/api/infrastructure/ttp-stats?project_id=${projectId}`),
    pedirJSON(`/api/infrastructure/ttps?project_id=${projectId}`),
    pedirJSON(`/api/infrastructure/top-apts?project_id=${projectId}`),
    pedirJSON(`/api/governance/sla?project_id=${projectId}`),
    pedirJSON(`/api/governance/sla/breaches?project_id=${projectId}`),
    pedirJSON(`/api/patch-queue?project_id=${projectId}&limit=200`),
  ]);

  const ahora = Date.now();
  const desde = ahora - ventanaDias * DIA_MS;

  // ── Inventario ────────────────────────────────────────────────────────
  const endpoints = nodos.filter(n => esLabel(n, 'Endpoint'));
  const porCategoria = { Server: 0, Workstation: 0, sinClasificar: 0 };
  endpoints.forEach(e => {
    const cat = e.properties?.category;
    if (cat === 'Server' || cat === 'Workstation') porCategoria[cat] += 1;
    else porCategoria.sinClasificar += 1;
  });

  const inventario = {
    endpoints: endpoints.length,
    servidores: porCategoria.Server,
    puestos: porCategoria.Workstation,
    sinClasificar: porCategoria.sinClasificar,
    contenedores: contarPorLabel(nodos, 'Container'),
    imagenes: contarPorLabel(nodos, 'ContainerImage'),
    instalaciones: contarPorLabel(nodos, 'SoftwareInstallation'),
    software: contarPorLabel(nodos, 'Software'),
    redes: contarPorLabel(nodos, 'Network'),
    hardware: contarPorLabel(nodos, 'Hardware'),
  };
  inventario.coberturaClasificacion = inventario.endpoints > 0
    ? Math.round(((inventario.servidores + inventario.puestos) / inventario.endpoints) * 100)
    : 0;

  // ── Vulnerabilidades ──────────────────────────────────────────────────
  const vulnNodos = nodos.filter(n => esLabel(n, 'Vulnerability'));
  const vulns = { total: 0, Critical: 0, High: 0, Medium: 0, Low: 0 };
  let conKEV = 0, conExploit = 0, conEPSS = 0;
  vulnNodos.forEach(n => {
    const p = n.properties || {};
    const sev = (p.severity && ['Critical', 'High', 'Medium', 'Low'].includes(p.severity))
      ? p.severity
      : severidadDeScore(p.base_score ?? p.cvss_score);
    if (sev !== 'None') { vulns[sev] += 1; vulns.total += 1; }
    if (p.kev === true) conKEV += 1;
    if (p.exploit === true) conExploit += 1;
    if (Number(p.epss_score) > 0) conEPSS += 1;
  });

  const enriquecimiento = {
    total: vulnNodos.length,
    kev: conKEV,
    exploit: conExploit,
    epss: conEPSS,
    parches: contarPorLabel(nodos, 'Patch'),
  };

  // ── Hallazgos, deltas del periodo y envejecimiento ────────────────────
  const findingNodos = nodos.filter(n => esLabel(n, 'Finding'));
  const CERRADOS = ['RESOLVED', 'FIXED', 'PATCHED', 'CLOSED'];

  let abiertos = 0, cerrados = 0, nuevosPeriodo = 0, cerradosPeriodo = 0;
  const aging = { '0 — 7 días': 0, '8 — 30 días': 0, '31 — 90 días': 0, '> 90 días': 0 };
  let sinFecha = 0;

  findingNodos.forEach(n => {
    const p = n.properties || {};
    const estado = String(p.status || 'OPEN').toUpperCase();
    const esCerrado = CERRADOS.includes(estado);
    if (esCerrado) cerrados += 1; else abiertos += 1;

    const first = aMillis(p.first_seen);
    const resolved = aMillis(p.resolved_at);

    if (first !== null && first >= desde) nuevosPeriodo += 1;
    if (esCerrado && resolved !== null && resolved >= desde) cerradosPeriodo += 1;

    if (!esCerrado) {
      if (first === null) { sinFecha += 1; return; }
      const dias = Math.floor((ahora - first) / DIA_MS);
      if (dias < 8) aging['0 — 7 días'] += 1;
      else if (dias < 31) aging['8 — 30 días'] += 1;
      else if (dias < 91) aging['31 — 90 días'] += 1;
      else aging['> 90 días'] += 1;
    }
  });

  const findings = {
    total: findingNodos.length,
    abiertos,
    cerrados,
    nuevosPeriodo,
    cerradosPeriodo,
    neto: nuevosPeriodo - cerradosPeriodo,
    sinFechaDeteccion: sinFecha,
  };

  // ── SLA: configuración vigente y cumplimiento por grupo ───────────────
  const sla = { Server: {}, Workstation: {} };
  (Array.isArray(slaConfig) ? slaConfig : []).forEach(c => {
    if (sla[c.category]) sla[c.category][c.severity] = c.days;
  });

  const breaches = Array.isArray(slaBreaches) ? slaBreaches : [];
  const cumplimiento = {};
  ['Server', 'Workstation'].forEach(cat => {
    const filas = breaches.filter(b => b.category === cat && b.sla_days > 0);
    const incumplidos = filas.filter(b => b.days_remaining < 0).length;
    const porVencer = filas.filter(b => b.days_remaining >= 0 && b.days_remaining <= b.sla_days * 0.2).length;
    const enPlazo = filas.length - incumplidos;
    cumplimiento[cat] = {
      total: filas.length,
      enPlazo,
      porVencer,
      incumplidos,
      pct: filas.length === 0 ? 100 : Math.round((enPlazo / filas.length) * 1000) / 10,
    };
  });
  const sinSLA = breaches.filter(b => !b.category || !b.sla_days).length;

  // Vencimientos próximos: solo tiene sentido en el semanal, pero se calcula siempre.
  const vencenPronto = breaches
    .filter(b => b.sla_days > 0 && b.days_remaining >= 0 && b.days_remaining <= 7)
    .sort((a, b) => a.days_remaining - b.days_remaining);

  // ── Hallazgos abiertos por grupo de mantenimiento y severidad ─────────
  const porGrupo = {
    Server: { Critical: 0, High: 0, Medium: 0, Low: 0, total: 0 },
    Workstation: { Critical: 0, High: 0, Medium: 0, Low: 0, total: 0 },
    sinClasificar: { Critical: 0, High: 0, Medium: 0, Low: 0, total: 0 },
  };
  breaches.forEach(b => {
    const clave = b.category === 'Server' || b.category === 'Workstation' ? b.category : 'sinClasificar';
    const sev = b.severity;
    if (porGrupo[clave][sev] === undefined) return;
    porGrupo[clave][sev] += 1;
    porGrupo[clave].total += 1;
  });

  // ── Cola de remediación ───────────────────────────────────────────────
  const colaItems = (cola?.queue || []).slice(0, 15).map(i => ({
    cve: i.cve_id,
    cvss: Number(i.risk_score || 0),
    prio: Number(i.priority_score || 0),
    tier: i.priority_tier || 'LOW',
    sw: i.software_name || '—',
    version: i.software_version || '—',
    fix: i.fixed_version || '',
    host: i.hostname || '—',
    parche: Boolean(i.patch_available),
  }));

  // ── Inteligencia de amenazas ──────────────────────────────────────────
  const matrizArr = Array.isArray(matrizCruda) ? matrizCruda : (matrizCruda?.data || matrizCruda?.ttps || []);
  const porTactica = {};
  TACTICAS.forEach(t => { porTactica[t.k] = { ...t, tec: 0, cves: 0, top: [] }; });

  matrizArr.forEach(t => {
    const id = t.id || t.ID || '';
    if (!id) return;
    const k = normalizarTactica(t.tactic || t.Tactic || '');
    const cves = (t.cves || t.CVEs || []).length;
    const b = porTactica[k];
    if (!b) return;
    b.tec += 1;
    b.cves += cves;
    b.top.push({ id, name: t.name || t.Name || '', n: cves });
  });
  Object.values(porTactica).forEach(b => {
    b.top.sort((x, y) => y.n - x.n);
    b.top = b.top.slice(0, 3);
  });

  const ttp = {
    totalCves: statsTTP?.total_cves ?? 0,
    mapeadas: statsTTP?.mapped_cves ?? 0,
    sinMapear: statsTTP?.unmapped_cves ?? 0,
    capec: statsTTP?.capec_static ?? 0,
    llm: statsTTP?.llm_enriched ?? 0,
    tecnicasDistintas: matrizArr.length,
    top: (statsTTP?.top_ttps || []).slice(0, 8).map(t => ({
      id: t.id, name: t.name, tactic: t.tactic, n: t.count,
    })),
    tacticas: TACTICAS.map(t => porTactica[t.k]),
  };

  const apts = (Array.isArray(aptsCrudos) ? aptsCrudos : []).slice(0, 10).map(a => ({
    id: a.actor_id,
    nombre: a.actor_name,
    n: a.matched_ttp_count,
    totalInfra: a.total_infra_ttps,
    pct: a.coverage_percent,
    tecnicas: (a.matched_ttp_names || []).slice(0, 5),
  }));

  // ── Proyecto ──────────────────────────────────────────────────────────
  const projNodo = nodos.find(n => esLabel(n, 'Project'));
  const proyecto = {
    nombre: projNodo?.properties?.nombre || projNodo?.properties?.name || 'Proyecto',
    riskTier: projNodo?.properties?.risk_tier || '—',
    riskScore: Number(projNodo?.properties?.risk_score || 0),
    endpointsEnRiesgo: Number(projNodo?.properties?.risky_endpoint_count || 0),
    driverHost: projNodo?.properties?.technical_driver_endpoint_hostname || '',
    driverCVE: projNodo?.properties?.technical_driver_cve_id || '',
    driverSoftware: projNodo?.properties?.technical_driver_software_name || '',
  };

  return {
    proyecto, inventario, vulns, enriquecimiento, findings, aging,
    sla, cumplimiento, sinSLA, vencenPronto, porGrupo,
    cola: colaItems, colaTotal: cola?.count ?? colaItems.length,
    ttp, apts,
    ventanaDias, generadoEn: new Date(ahora),
    // Marcas de disponibilidad, para que las láminas puedan decir "sin dato" con criterio.
    disponible: {
      ttpStats: Boolean(statsTTP),
      matriz: matrizArr.length > 0,
      apts: apts.length > 0,
      sla: Array.isArray(slaConfig) && slaConfig.length > 0,
      breaches: breaches.length > 0,
      cola: Boolean(cola),
    },
  };
}

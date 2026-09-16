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

import { TACTICS, normalizeTacticKeys } from '../../mitre/tactics';
import { indexarGrafo } from '../../excel/grafo';
import { metricasDeRemediacion } from '../../remediacion/metricas';
import { GRUPOS_SLA } from './reportKit.js';

const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Filas máximas de las tablas de la cola. Diez es lo que cabe en una lámina con la nota
 * de lectura debajo; con más, la nota se montaba sobre las últimas filas.
 */
export const FILAS_COLA = 10;

// Catálogo y traducción de tácticas: una sola fuente compartida con la matriz de
// la interfaz. Antes había aquí una copia propia que ya había divergido de la de
// TtpsPage (la de aquí no reconocía los identificadores TAxxxx, por ejemplo).
const TACTICAS = TACTICS.map(t => ({ id: t.id, k: t.key, n: t.label }));

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
/**
 * Recolector crudo compartido: el grafo del proyecto y las respuestas de los
 * endpoints que lo complementan, sin agregar ni recortar nada.
 *
 * Lo consumen los dos informes PPTX —a través de recopilarDatos, que agrega— y el
 * informe técnico en Excel, que necesita las filas enteras. Tener un solo
 * recolector es lo que impide que dos entregables del mismo proyecto acaben dando
 * cifras distintas por leer de sitios distintos.
 *
 * @param {object} opciones
 *   limiteCola   cuántos elementos de la cola de parcheo pedir (el PPTX enseña 15,
 *                el Excel los quiere todos).
 *   incluirRutas si pedir también las rutas de explotación, que solo usa el Excel.
 */
export async function recopilarCrudos(repositorio, projectId, opciones = {}) {
  const { limiteCola = 200, incluirRutas = false } = opciones;

  const grafo = await repositorio.exportProject(projectId);
  if (!grafo || !grafo.nodes) {
    throw new Error('El backend devolvió un grafo vacío o con formato inválido.');
  }

  const [statsTTP, matrizCruda, aptsCrudos, slaConfig, slaBreaches, cola, rutas] = await Promise.all([
    pedirJSON(`/api/infrastructure/ttp-stats?project_id=${projectId}`),
    pedirJSON(`/api/infrastructure/ttps?project_id=${projectId}`),
    pedirJSON(`/api/infrastructure/top-apts?project_id=${projectId}`),
    pedirJSON(`/api/governance/sla?project_id=${projectId}`),
    pedirJSON(`/api/governance/sla/breaches?project_id=${projectId}`),
    pedirJSON(`/api/patch-queue?project_id=${projectId}&limit=${limiteCola}`),
    incluirRutas
      ? pedirJSON(`/api/infrastructure/exploitation-paths?project_id=${projectId}`)
      : Promise.resolve(null),
  ]);

  return {
    grafo,
    statsTTP,
    matriz: Array.isArray(matrizCruda) ? matrizCruda : (matrizCruda?.data || matrizCruda?.ttps || []),
    apts: Array.isArray(aptsCrudos) ? aptsCrudos : [],
    slaConfig: Array.isArray(slaConfig) ? slaConfig : [],
    breaches: Array.isArray(slaBreaches) ? slaBreaches : [],
    cola: cola || { queue: [], total: 0 },
    rutas: Array.isArray(rutas) ? rutas : [],
  };
}

export async function recopilarDatos(repositorio, projectId, ventanaDias) {
  // Además de la cola completa, dos lecturas filtradas: host y contenedores se remedian de
  // forma distinta y el informe los presenta en láminas separadas. Pedirlas ya filtradas
  // garantiza que la cabecera de cada una esté completa aunque la cola general supere el
  // límite de elementos que devuelve el endpoint.
  const [crudos, colaHostCruda, colaContCruda] = await Promise.all([
    recopilarCrudos(repositorio, projectId),
    pedirJSON(`/api/patch-queue?project_id=${projectId}&limit=${FILAS_COLA}&in_container=FALSE`),
    pedirJSON(`/api/patch-queue?project_id=${projectId}&limit=${FILAS_COLA}&in_container=TRUE`),
  ]);

  const grafo = crudos.grafo;
  const nodos = grafo.nodes;
  const statsTTP = crudos.statsTTP;
  const matrizCruda = crudos.matriz;
  const aptsCrudos = crudos.apts;
  const slaConfig = crudos.slaConfig;
  const slaBreaches = crudos.breaches;
  const cola = crudos.cola;

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
  // Solo se computan como vulnerabilidades del alcance aquellas asociadas a los
  // hallazgos del proyecto. Si en el export viajan nodos :Vulnerability colgados
  // de parches globales pero sin Finding en los activos locales, pertenecen al
  // catálogo de parcheo y no a la superficie de ataque del parque.
  const findingNodos = nodos.filter(n => esLabel(n, 'Finding'));
  const findingIds = new Set(findingNodos.map(n => n.id));
  const cveIdsDelAlcance = new Set();
  findingNodos.forEach(f => {
    const key = f.properties?.finding_key || f.properties?.unique_ref || '';
    const m = /(CVE-\d{4}-\d+)/i.exec(String(key));
    if (m) cveIdsDelAlcance.add(m[1].toUpperCase());
  });

  const vulnIdsDelAlcance = new Set();
  (grafo.relationships || []).forEach(r => {
    if ((r.type === 'OF_VULNERABILITY' || r.type === 'HAS_VULNERABILITY') && findingIds.has(r.source)) {
      vulnIdsDelAlcance.add(r.target);
    }
  });

  const vulnNodos = nodos.filter(n => {
    if (!esLabel(n, 'Vulnerability')) return false;
    if (vulnIdsDelAlcance.has(n.id)) return true;
    const cve = n.properties?.cve_id;
    return cve && cveIdsDelAlcance.has(cve.toUpperCase());
  });
  const vulns = { total: 0, Critical: 0, High: 0, Medium: 0, Low: 0 };
  let conKEV = 0, conExploit = 0, conEPSS = 0;
  // Se cuenta por cve_id y no por nodo: si el grafo arrastra dos nodos de la misma CVE,
  // contarlos por separado inflaba las "CVE únicas" por encima de los propios hallazgos.
  const cvesVistas = new Set();
  vulnNodos.forEach(n => {
    const p = n.properties || {};
    const clave = String(p.cve_id || n.id).toUpperCase();
    if (cvesVistas.has(clave)) return;
    cvesVistas.add(clave);
    const sev = (p.severity && ['Critical', 'High', 'Medium', 'Low'].includes(p.severity))
      ? p.severity
      : severidadDeScore(p.base_score ?? p.cvss_score);
    if (sev !== 'None') { vulns[sev] += 1; vulns.total += 1; }
    if (p.kev === true) conKEV += 1;
    if (p.exploit === true) conExploit += 1;
    if (Number(p.epss_score) > 0) conEPSS += 1;
  });

  const enriquecimiento = {
    total: cvesVistas.size,
    kev: conKEV,
    exploit: conExploit,
    epss: conEPSS,
    parches: contarPorLabel(nodos, 'Patch'),
  };

  // ── Hallazgos, deltas del periodo y envejecimiento ────────────────────
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
  // Tres acuerdos: servidores, puestos de trabajo y contenedores.
  const sla = {};
  GRUPOS_SLA.forEach(cat => { sla[cat] = {}; });
  (Array.isArray(slaConfig) ? slaConfig : []).forEach(c => {
    if (sla[c.category]) sla[c.category][c.severity] = c.days;
  });

  const breaches = Array.isArray(slaBreaches) ? slaBreaches : [];

  // Cada fila del endpoint es una CVE en un activo concreto y agrupa sus `finding_count`
  // hallazgos —más de uno solo si la CVE afecta a varios paquetes del mismo activo—. El
  // resto del informe cuenta hallazgos, así que se pondera por esa cifra: contar filas daba
  // CVE por activo, y no cuadraba con los hallazgos de las láminas contiguas.
  const peso = b => Number(b.finding_count) || 1;
  const sumar = filas => filas.reduce((a, b) => a + peso(b), 0);

  const cumplimiento = {};
  GRUPOS_SLA.forEach(cat => {
    const filas = breaches.filter(b => b.category === cat && b.sla_days > 0);
    const total = sumar(filas);
    const incumplidos = sumar(filas.filter(b => b.days_remaining < 0));
    const porVencer = sumar(filas.filter(b => b.days_remaining >= 0 && b.days_remaining <= b.sla_days * 0.2));
    const enPlazo = total - incumplidos;
    cumplimiento[cat] = {
      total,
      enPlazo,
      porVencer,
      incumplidos,
      pct: total === 0 ? 100 : Math.round((enPlazo / total) * 1000) / 10,
    };
  });
  const incumplidos = GRUPOS_SLA.reduce((a, cat) => a + cumplimiento[cat].incumplidos, 0);
  const sinSLA = sumar(breaches.filter(b => !b.category || !b.sla_days));

  // Vencimientos próximos: solo tiene sentido en el semanal, pero se calcula siempre.
  const vencenPronto = breaches
    .filter(b => b.sla_days > 0 && b.days_remaining >= 0 && b.days_remaining <= 7)
    .sort((a, b) => a.days_remaining - b.days_remaining);

  // ── Hallazgos abiertos por grupo de mantenimiento y severidad ─────────
  // Del mismo conjunto salen las CVE únicas abiertas: así el anillo y las barras del
  // panorama describen los mismos hallazgos y solo cambia la unidad de cuenta.
  const porGrupo = {};
  [...GRUPOS_SLA, 'sinClasificar'].forEach(k => {
    porGrupo[k] = { Critical: 0, High: 0, Medium: 0, Low: 0, total: 0 };
  });
  const severidadPorCVE = new Map();
  breaches.forEach(b => {
    const clave = GRUPOS_SLA.includes(b.category) ? b.category : 'sinClasificar';
    const sev = b.severity;
    if (porGrupo[clave][sev] === undefined) return;
    const n = peso(b);
    porGrupo[clave][sev] += n;
    porGrupo[clave].total += n;
    if (b.cve_id) severidadPorCVE.set(String(b.cve_id).toUpperCase(), sev);
  });
  const abiertas = { total: severidadPorCVE.size, Critical: 0, High: 0, Medium: 0, Low: 0 };
  severidadPorCVE.forEach(sev => { abiertas[sev] += 1; });
  abiertas.hallazgos = Object.values(porGrupo).reduce((a, g) => a + g.total, 0);

  // ── Cola de remediación ───────────────────────────────────────────────
  const aFila = i => ({
    cve: i.cve_id,
    cvss: Number(i.risk_score || 0),
    prio: Number(i.priority_score || 0),
    tier: i.priority_tier || 'LOW',
    sw: i.software_name || '—',
    version: i.software_version || '—',
    fix: i.fixed_version || '',
    host: i.hostname || '—',
    parche: Boolean(i.patch_available),
    contenedor: i.container_name || '—',
    // Hallazgo de la propia imagen (capa base) frente a software empaquetado dentro de ella.
    imagen: i.asset_type === 'CONTAINER' || Boolean(i.image_id),
  });

  // Si la lectura filtrada falla se reparte la cola general, que puede venir recortada.
  const deCola = (filtrada, enContenedor) => {
    if (filtrada) {
      const items = (filtrada.queue || []).slice(0, FILAS_COLA);
      return { items: items.map(aFila), total: filtrada.total ?? items.length };
    }
    const items = (cola?.queue || []).filter(i => Boolean(i.in_container) === enContenedor);
    return { items: items.slice(0, FILAS_COLA).map(aFila), total: items.length };
  };
  const colaHost = deCola(colaHostCruda, false);
  const colaCont = deCola(colaContCruda, true);

  // ── Parcheo y tiempo de remediación ───────────────────────────────────
  // El cálculo es el mismo que publica el informe técnico en Excel: recorre el grafo
  // entero, no la muestra de la cola, porque el MTTR se mide sobre hallazgos cerrados
  // y esos ya no están en la cola de parcheo.
  const remediacion = metricasDeRemediacion(indexarGrafo(grafo), {
    slaConfig, ahora, ventanaDias,
  });

  // ── Inteligencia de amenazas ──────────────────────────────────────────
  const matrizArr = Array.isArray(matrizCruda) ? matrizCruda : (matrizCruda?.data || matrizCruda?.ttps || []);
  const porTactica = {};
  TACTICAS.forEach(t => { porTactica[t.k] = { ...t, tec: 0, cves: 0, top: [] }; });

  matrizArr.forEach(t => {
    const id = t.id || t.ID || '';
    if (!id) return;
    const cves = (t.cves || t.CVEs || []).length;
    // Una técnica cuenta en TODAS sus tácticas, igual que en la matriz oficial de
    // MITRE. La suma de `tec` por táctica es por tanto mayor que el número de
    // técnicas distintas, que se publica aparte como `tecnicasDistintas`.
    normalizeTacticKeys(t.tactic || t.Tactic || '').forEach(k => {
      const b = porTactica[k];
      if (!b) return;
      b.tec += 1;
      b.cves += cves;
      b.top.push({ id, name: t.name || t.Name || '', n: cves });
    });
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
    capecPendiente: statsTTP?.capec_pending_cves ?? 0,
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
    nombre: projNodo?.properties?.name || 'Proyecto',
    riskTier: projNodo?.properties?.risk_tier || '—',
    riskScore: Number(projNodo?.properties?.risk_score || 0),
    endpointsEnRiesgo: Number(projNodo?.properties?.risky_endpoint_count || 0),
    driverHost: projNodo?.properties?.technical_driver_endpoint_hostname || '',
    driverCVE: projNodo?.properties?.technical_driver_cve_id || '',
    driverSoftware: projNodo?.properties?.technical_driver_software_name || '',
  };

  return {
    proyecto, inventario, vulns, abiertas, enriquecimiento, findings, aging,
    sla, cumplimiento, incumplidos, sinSLA, vencenPronto, porGrupo,
    vencenProntoHallazgos: sumar(vencenPronto),
    // Las filas son CVE-en-un-activo, así que contarlas no da CVE distintas: la misma CVE
    // en dos contenedores son dos filas y un solo boletín que leer.
    vencenProntoCVEs: new Set(vencenPronto.map(b => String(b.cve_id || '').toUpperCase())).size,
    // El endpoint devuelve `total`, no `count`: con la clave equivocada el informe
    // enseñaba como total de la cola las filas que él mismo recorta.
    cola: colaHost.items, colaTotal: colaHost.total,
    colaContenedores: colaCont.items, colaContenedoresTotal: colaCont.total,
    remediacion,
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
      // El MTTR necesita hallazgos ya cerrados: en un proyecto recién inventariado no
      // hay ninguno y la lámina tiene que decirlo en vez de enseñar un cero.
      mttr: remediacion.mttr.n > 0,
      parchesAplicados: remediacion.aplicados.total > 0,
    },
  };
}

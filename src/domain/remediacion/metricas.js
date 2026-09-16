/**
 * Métricas de parcheo y de tiempo de remediación (MTTR).
 *
 * Vive fuera de los dos entregables porque los dos las publican: las láminas de los
 * informes PPTX y las hojas del informe técnico en Excel. Si cada uno las calculara por
 * su cuenta acabarían dando un MTTR distinto del mismo proyecto, que es justo lo que el
 * recolector común de `reportData` evita para el resto de las cifras.
 *
 * De dónde sale cada cosa:
 *   · El reloj de remediación son las marcas del propio hallazgo: `first_seen` cuando se
 *     detectó y `resolved_at` cuando se cerró. No hay una fecha de "parche aplicado" por
 *     hallazgo que se pueda usar en su lugar — la declaración vive en la arista, y un
 *     hallazgo puede cerrarse sin que nadie declare parche (por ejemplo si el software
 *     desaparece del inventario).
 *   · Las declaraciones de parche son las aristas (:Patch)-[:APPLIED_TO]->(activo), con
 *     todo el detalle en las propiedades de la arista: nivel, fecha, quién y el resultado
 *     de la verificación automática contra la versión instalada.
 *   · La disponibilidad de parche es (:Patch)-[:FIXES]->(:Vulnerability): dice que el
 *     parche existe, no que se haya aplicado. Distinguir las dos cosas es el sentido de
 *     esta métrica — un backlog sin parche disponible no es lo mismo que uno sin parchear.
 */

import { aFecha, aNumero, severidadDeScore } from '../excel/formato';
// indexarGrafo y sus ayudantes son genéricos sobre el grafo del export, aunque vivan
// bajo excel/: los usa igual quien compone el PPTX.
import { contextoDeHallazgo, cveDeHallazgo, vulnerabilidadesPorCVE } from '../excel/grafo';

const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Estados que cuentan como hallazgo cerrado, con el mismo criterio que el resto del
 * informe. SUPERSEDED se deja fuera a propósito y se cuenta aparte: ese cierre lo produce
 * el reemplazo de la imagen de un contenedor, no un trabajo de remediación, y mezclarlo
 * abarataría el MTTR con cierres que nadie ha ejecutado.
 */
export const ESTADOS_CERRADOS = ['RESOLVED', 'FIXED', 'PATCHED', 'CLOSED'];

/** Niveles de remediación de CVSS 3.1, tal y como los escribe el backend en la arista. */
export const NIVEL_ES = {
  OFFICIAL_FIX: 'Parche oficial',
  TEMPORARY_FIX: 'Corrección temporal',
  WORKAROUND: 'Solución alternativa',
  UNAVAILABLE: 'Sin remediación',
};

export const SEVERIDADES = ['Critical', 'High', 'Medium', 'Low'];

/** Solo el parche oficial cierra el hallazgo; el resto son mitigaciones con riesgo residual. */
export function remediaPorCompleto(nivel) {
  return String(nivel || '').toUpperCase() === 'OFFICIAL_FIX';
}

function estadoDe(nodo) {
  return String(nodo?.properties?.status || 'OPEN').toUpperCase();
}

/**
 * Estadísticos de una lista de días. La mediana acompaña siempre a la media porque un
 * único hallazgo cerrado con mucho retraso desplaza la media varios días y haría leer
 * como sistémico lo que es un caso suelto.
 */
export function resumenDeDias(dias) {
  const xs = dias.filter(n => Number.isFinite(n)).sort((a, b) => a - b);
  if (xs.length === 0) {
    return { n: 0, media: null, mediana: null, p90: null, min: null, max: null };
  }
  const suma = xs.reduce((a, b) => a + b, 0);
  const mediana = xs.length % 2 === 1
    ? xs[(xs.length - 1) / 2]
    : (xs[xs.length / 2 - 1] + xs[xs.length / 2]) / 2;
  const p90 = xs[Math.min(xs.length - 1, Math.ceil(xs.length * 0.9) - 1)];
  return {
    n: xs.length,
    media: Math.round((suma / xs.length) * 10) / 10,
    mediana: Math.round(mediana * 10) / 10,
    p90,
    min: xs[0],
    max: xs[xs.length - 1],
  };
}

/** Días transcurridos entre dos marcas, con un decimal y nunca negativo. */
function diasEntre(desde, hasta) {
  if (!desde || !hasta) return null;
  const d = (hasta.getTime() - desde.getTime()) / DIA_MS;
  if (!Number.isFinite(d)) return null;
  return Math.round(Math.max(d, 0) * 10) / 10;
}

/**
 * Grupo de SLA del hallazgo. Lo que vive dentro de un contenedor —la imagen o el software
 * empaquetado en ella— se mide contra el acuerdo de contenedores sea cual sea el host, igual
 * que hace el backend al calcular los incumplimientos.
 */
function categoriaDe(ctx) {
  if (ctx.contenedor || ctx.imagen) return 'Container';
  const c = ctx.endpoint?.properties?.category;
  return c === 'Server' || c === 'Workstation' ? c : '';
}

/** Índice (categoría|severidad) -> días de SLA acordados. */
function indiceSLA(slaConfig) {
  const m = new Map();
  for (const c of slaConfig || []) {
    if (!c?.category || !c?.severity) continue;
    m.set(`${c.category}|${c.severity}`, aNumero(c.days));
  }
  return m;
}

/**
 * Lee las declaraciones de parche del grafo.
 *
 * El detalle vive en las propiedades de la arista APPLIED_TO, que `indexarGrafo` no
 * conserva —solo guarda a qué nodo lleva cada tipo de relación—, así que se recorre la
 * lista cruda de relaciones.
 */
export function declaracionesDeParche(idx, { ahora = Date.now(), ventanaDias = 30 } = {}) {
  const desde = ahora - ventanaDias * DIA_MS;

  return (idx.relaciones || [])
    .filter(r => r.type === 'APPLIED_TO')
    .map(r => {
      const p = r.properties || {};
      const parche = idx.porId.get(r.source);
      const activo = idx.porId.get(r.target);
      const nivel = String(p.remediation_level || '').toUpperCase();
      const aplicado = aFecha(p.applied_at);

      // El endpoint anfitrión no está en la arista: se sube por el grafo desde el activo
      // parcheado, que puede ser una instalación del host o de dentro de un contenedor.
      let contenedor = null;
      let endpoint = null;
      if (activo) {
        const padre = idx.unoDesde(activo, 'HAS_INSTALLATION');
        if (padre && padre.labels?.includes('Container')) {
          contenedor = padre;
          endpoint = idx.unoDesde(padre, 'HOSTS') || idx.unoDesde(padre, 'HAS_ENDPOINT');
        } else if (padre) {
          endpoint = padre;
        } else if (activo.labels?.includes('Container')) {
          contenedor = activo;
          endpoint = idx.unoDesde(activo, 'HOSTS') || idx.unoDesde(activo, 'HAS_ENDPOINT');
        }
      }
      const software = activo ? idx.uno(activo, 'INSTANCE_OF') : null;

      return {
        cve: p.cve_id || null,
        parcheID: parche?.properties?.id ?? null,
        parcheURL: parche?.properties?.url || null,
        nivel,
        nivelES: NIVEL_ES[nivel] || nivel || null,
        oficial: remediaPorCompleto(nivel),
        factor: aNumero(p.remediation_factor),
        aplicadoEn: aplicado,
        enPeriodo: Boolean(aplicado && aplicado.getTime() >= desde),
        aplicadoPor: p.applied_by || null,
        tipoActivo: p.asset_type || null,
        activoID: p.asset_id || activo?.properties?.id || null,
        software: software?.properties?.name || null,
        contenedor: contenedor?.properties?.name || null,
        endpoint: endpoint?.properties?.hostname || null,
        verificado: p.verified === true,
        verificacionConcluyente: p.verification_conclusive === true,
        motivoVerificacion: p.verification_reason || null,
        versionInstalada: p.installed_version || null,
        versionEsperada: p.expected_version || null,
        notas: p.notes || null,
      };
    })
    .sort((a, b) => (b.aplicadoEn?.getTime() || 0) - (a.aplicadoEn?.getTime() || 0));
}

/**
 * Calcula las métricas de parcheo y remediación del proyecto.
 *
 * @param {object} idx        índice del grafo (indexarGrafo)
 * @param {object} opciones
 *   slaConfig    configuración de SLA vigente, para medir si cada cierre llegó a tiempo
 *   ahora        instante de referencia, en milisegundos
 *   ventanaDias  días del periodo del informe: 7 en el semanal, 30 en el mensual
 * @returns {object} agregados para las láminas y filas de detalle para las hojas Excel
 */
export function metricasDeRemediacion(idx, { slaConfig = [], ahora = Date.now(), ventanaDias = 30 } = {}) {
  const desde = ahora - ventanaDias * DIA_MS;
  const sla = indiceSLA(slaConfig);
  const vulnPorCVE = vulnerabilidadesPorCVE(idx);

  // Qué CVE tienen parche publicado. (:Patch)-[:FIXES]->(:Vulnerability) dice que existe,
  // no que se haya aplicado.
  const cvesConParche = new Set();
  for (const parche of idx.de('Patch')) {
    for (const v of idx.hacia(parche, 'FIXES')) {
      const cve = v.properties?.cve_id;
      if (cve) cvesConParche.add(cve);
    }
  }

  const declaraciones = declaracionesDeParche(idx, { ahora, ventanaDias });
  // Un hallazgo se cruza con su declaración por (activo, CVE), que es la clave con la que
  // el backend la escribe.
  const declaracionPorClave = new Map();
  for (const d of declaraciones) {
    if (!d.cve || !d.activoID) continue;
    const clave = `${d.activoID}|${d.cve}`;
    if (!declaracionPorClave.has(clave)) declaracionPorClave.set(clave, d);
  }

  const cierres = [];   // hallazgos cerrados con el reloj completo: alimentan el MTTR
  const backlog = [];   // hallazgos abiertos: la contraparte, cuánto llevan esperando
  let supersedidos = 0;
  let cerradosSinFechas = 0;
  let abiertosConParche = 0;
  let abiertosSinParche = 0;

  for (const f of idx.de('Finding')) {
    const p = f.properties || {};
    const estado = estadoDe(f);
    const ctx = contextoDeHallazgo(idx, f);
    const ref = cveDeHallazgo(idx, f, vulnPorCVE);
    const severidad = severidadDeScore(ref.nodo?.properties?.base_score);
    const categoria = categoriaDe(ctx);
    const activoID = ctx.instalacion?.properties?.id || ctx.contenedor?.properties?.id || null;
    const hayParche = Boolean(ref.cveID && cvesConParche.has(ref.cveID));

    if (estado === 'SUPERSEDED') { supersedidos += 1; continue; }

    const detectado = aFecha(p.first_seen);

    if (!ESTADOS_CERRADOS.includes(estado)) {
      if (hayParche) abiertosConParche += 1; else abiertosSinParche += 1;
      const edad = diasEntre(detectado, new Date(ahora));
      backlog.push({
        cve: ref.cveID, severidad, categoria,
        endpoint: ctx.endpoint?.properties?.hostname || null,
        software: ctx.software?.properties?.name || null,
        detectado, edadDias: edad, parcheDisponible: hayParche,
        slaDias: sla.get(`${categoria}|${severidad}`) ?? null,
      });
      continue;
    }

    const resuelto = aFecha(p.resolved_at);
    const dias = diasEntre(detectado, resuelto);
    if (dias === null) { cerradosSinFechas += 1; continue; }

    const slaDias = sla.get(`${categoria}|${severidad}`) ?? null;
    const decl = activoID && ref.cveID ? declaracionPorClave.get(`${activoID}|${ref.cveID}`) : null;

    cierres.push({
      cve: ref.cveID,
      severidad,
      categoria,
      estado,
      endpoint: ctx.endpoint?.properties?.hostname || null,
      contenedor: ctx.contenedor?.properties?.name || null,
      software: ctx.software?.properties?.name || null,
      version: ctx.software?.properties?.version || null,
      detectado,
      resuelto,
      dias,
      slaDias,
      // Sin plazo acordado no hay incumplimiento que declarar: se queda en null en vez de
      // contarse como cumplido, que sería inventar un compromiso que nadie firmó.
      dentroDeSLA: slaDias ? dias <= slaDias : null,
      desvioDias: slaDias ? Math.round((dias - slaDias) * 10) / 10 : null,
      nivel: decl?.nivel || null,
      nivelES: decl?.nivelES || null,
      declarado: Boolean(decl),
      verificado: decl?.verificado ?? null,
      aplicadoPor: decl?.aplicadoPor || null,
      enPeriodo: Boolean(resuelto && resuelto.getTime() >= desde),
    });
  }

  // ── Agregados de MTTR ───────────────────────────────────────────────────
  const global = resumenDeDias(cierres.map(c => c.dias));

  const porSeveridad = {};
  SEVERIDADES.forEach(sev => {
    const filas = cierres.filter(c => c.severidad === sev);
    porSeveridad[sev] = {
      ...resumenDeDias(filas.map(c => c.dias)),
      // Plazo de referencia: el más exigente de los acordados para esa severidad, que es
      // contra el que se lee si el ritmo da o no da.
      slaDias: ['Server', 'Workstation']
        .map(cat => sla.get(`${cat}|${sev}`))
        .filter(n => Number.isFinite(n))
        .reduce((a, b) => (a === null ? b : Math.min(a, b)), null),
    };
  });

  const porCategoria = {};
  ['Server', 'Workstation', 'Container', ''].forEach(cat => {
    const filas = cierres.filter(c => c.categoria === cat);
    porCategoria[cat || 'sinClasificar'] = resumenDeDias(filas.map(c => c.dias));
  });

  const medidos = cierres.filter(c => c.dentroDeSLA !== null);
  const enPlazo = medidos.filter(c => c.dentroDeSLA).length;

  const mttr = {
    ...global,
    porSeveridad,
    porCategoria,
    enPeriodo: resumenDeDias(cierres.filter(c => c.enPeriodo).map(c => c.dias)),
    cumplimiento: {
      medidos: medidos.length,
      enPlazo,
      fuera: medidos.length - enPlazo,
      pct: medidos.length > 0 ? Math.round((enPlazo / medidos.length) * 1000) / 10 : null,
    },
    sinFechas: cerradosSinFechas,
    supersedidos,
  };

  // ── Edad del backlog abierto ────────────────────────────────────────────
  const edades = backlog.map(b => b.edadDias).filter(n => Number.isFinite(n));
  const masViejo = backlog
    .filter(b => Number.isFinite(b.edadDias))
    .sort((a, b) => b.edadDias - a.edadDias)[0] || null;
  const vencidos = backlog.filter(b => b.slaDias && Number.isFinite(b.edadDias) && b.edadDias > b.slaDias).length;

  // ── Disponibilidad y aplicación de parche ───────────────────────────────
  // Las CVEs del alcance son las que corresponden a los hallazgos del proyecto,
  // evitando contar vulnerabilidades huérfanas de hallazgo que viajen en el export.
  const cvesDelAlcance = new Set(
    idx.de('Finding')
      .map(f => cveDeHallazgo(idx, f, vulnPorCVE).cveID)
      .filter(Boolean)
  );
  const totalVulns = cvesDelAlcance.size > 0 ? cvesDelAlcance.size : idx.de('Vulnerability').length;
  const conParche = [...cvesConParche].filter(cve => (cvesDelAlcance.size > 0 ? cvesDelAlcance.has(cve) : vulnPorCVE.has(cve))).length;
  const abiertos = abiertosConParche + abiertosSinParche;

  const porNivel = {};
  Object.keys(NIVEL_ES).forEach(k => { porNivel[k] = declaraciones.filter(d => d.nivel === k).length; });

  return {
    disponibilidad: {
      parches: idx.de('Patch').length,
      cvesTotales: totalVulns,
      cvesConParche: conParche,
      coberturaPct: totalVulns > 0 ? Math.round((conParche / totalVulns) * 1000) / 10 : null,
      abiertos,
      abiertosConParche,
      abiertosSinParche,
      accionablePct: abiertos > 0 ? Math.round((abiertosConParche / abiertos) * 1000) / 10 : null,
    },
    aplicados: {
      total: declaraciones.length,
      enPeriodo: declaraciones.filter(d => d.enPeriodo).length,
      oficiales: porNivel.OFFICIAL_FIX || 0,
      mitigaciones: (porNivel.TEMPORARY_FIX || 0) + (porNivel.WORKAROUND || 0),
      revertidos: porNivel.UNAVAILABLE || 0,
      porNivel,
      verificados: declaraciones.filter(d => d.verificado).length,
      noConcluyentes: declaraciones.filter(d => !d.verificacionConcluyente).length,
      cves: new Set(declaraciones.map(d => d.cve).filter(Boolean)).size,
      activos: new Set(declaraciones.map(d => d.activoID).filter(Boolean)).size,
      ultimas: declaraciones,
    },
    mttr,
    backlog: {
      n: backlog.length,
      ...resumenDeDias(edades),
      vencidos,
      masViejo,
      filas: backlog,
    },
    cierres,
  };
}

/**
 * Definición de las hojas del informe técnico en Excel.
 *
 * Cada constructor devuelve una especificación —no una hoja ya escrita— para que
 * el caso de uso pueda recorrerlas dos veces: una para volcarlas al libro y otra
 * para medir qué columnas quedan vacías y componer la hoja de cobertura de datos.
 *
 * Los nombres de propiedad de aquí están tomados del modelo real del grafo, no
 * adivinados. Es la causa de que el export anterior mostrara 'N/A' en columnas
 * cuyo dato estaba presente en el 100% de los nodos: pedía `cvss_score` cuando el
 * grafo guarda `base_score`, `path` cuando guarda `install_path`, o `description`
 * en Network cuando la propiedad se llama `descripcion`.
 */

import { T, severidadDeScore, aNumero } from './formato';
import {
  esLabel, contextoDeHallazgo, ipsDeEndpoint, nombreDeNodo,
  cveDeHallazgo, vulnerabilidadesPorCVE,
} from './grafo';
import { TACTICS, normalizeTacticKeys } from '../mitre/tactics';
import { metricasDeRemediacion } from '../remediacion/metricas';

const SEVERIDADES = ['Critical', 'High', 'Medium', 'Low'];

function props(n) { return n?.properties || {}; }

function tabla(nombre, columnas, filas) {
  return { tipo: 'tabla', nombre, columnas, filas };
}
function libre(nombre, filas, anchos) {
  return { tipo: 'libre', nombre, filas, anchos };
}

// ═════════════════════════════════════════════════════════════════════════
// 1 · PORTADA
// ═════════════════════════════════════════════════════════════════════════
function hojaPortada(d, idx) {
  const p = props(idx.de('Project')[0]);

  return libre('Portada', [
    ['INFORME TÉCNICO DE INFRAESTRUCTURA'],
    [],
    ['Proyecto', p.name || d.nombreProyecto || ''],
    ['ID de proyecto', d.projectId ?? p.id ?? ''],
    ['Generado', d.generadoEn || new Date()],
    [],
    ['ALCANCE'],
    ['Endpoints', idx.de('Endpoint').length],
    ['Contenedores', idx.de('Container').length],
    ['Imágenes de contenedor', idx.de('ContainerImage').length],
    ['Instalaciones de software', idx.de('SoftwareInstallation').length],
    ['Redes', idx.de('Network').length],
    ['Hallazgos', idx.de('Finding').length],
    ['Vulnerabilidades distintas', idx.de('Vulnerability').length],
    ['Técnicas MITRE en el entorno', (d.matriz || []).length],
    [],
    ['CÓMO LEER ESTE LIBRO'],
    ['Celdas vacías', 'Una celda vacía significa que el dato no existe en el origen, no que valga cero.'],
    ['Mapeo de técnicas', 'La procedencia de cada mapeo CVE-técnica está en la hoja "Matriz TTP". El mapeo determinista (CWE-CAPEC-ATT&CK) es verificable contra catálogo; el inferido por modelo de lenguaje debe tratarse como indicio, no como evidencia.'],
    ['Severidad', 'Derivada de la puntuación base CVSS con el mismo corte que el backend: >=9 Critical, >=7 High, >=4 Medium, >0 Low.'],
    ['Filtros', 'Todas las hojas de datos llevan autofiltro en la fila de cabecera.'],
  ], [46, 30, 95]);
}

// ═════════════════════════════════════════════════════════════════════════
// 2 · RESUMEN EJECUTIVO
// ═════════════════════════════════════════════════════════════════════════
function hojaResumen(d, idx, rem) {
  const proj = props(idx.de('Project')[0]);
  const endpoints = idx.de('Endpoint');
  const vulns = idx.de('Vulnerability');
  const hallazgos = idx.de('Finding');

  const porSeveridad = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  let kev = 0;
  let exploit = 0;
  let epssAlto = 0;
  for (const v of vulns) {
    const pv = props(v);
    const sev = severidadDeScore(pv.base_score);
    if (sev && porSeveridad[sev] !== undefined) porSeveridad[sev] += 1;
    if (pv.kev === true) kev += 1;
    if (pv.exploit === true) exploit += 1;
    if ((aNumero(pv.epss_score) ?? 0) >= 0.1) epssAlto += 1;
  }

  const categorias = { Server: 0, Workstation: 0, sinClasificar: 0 };
  for (const e of endpoints) {
    const c = props(e).category;
    if (c === 'Server' || c === 'Workstation') categorias[c] += 1;
    else categorias.sinClasificar += 1;
  }

  const st = d.statsTTP || {};
  const totalMapeos = (st.capec_static ?? 0) + (st.llm_enriched ?? 0);
  const pct = (parte, total) => (total > 0 ? Math.round((parte / total) * 100) + '%' : '');

  const porRiesgo = (lista) => [...lista]
    .sort((a, b) => (aNumero(props(b).risk_score) ?? 0) - (aNumero(props(a).risk_score) ?? 0))
    .slice(0, 5);

  const filas = [
    ['RESUMEN EJECUTIVO'],
    [],
    ['RIESGO DEL PROYECTO', 'Valor', 'Detalle'],
    ['Puntuación de riesgo', aNumero(proj.risk_score), proj.risk_tier || ''],
    ['Puntuación de prioridad', aNumero(proj.priority_score), proj.priority_tier || ''],
    ['Endpoints en riesgo', aNumero(proj.risky_endpoint_count), ''],
    ['Driver técnico', proj.technical_driver_cve_id || '', [proj.technical_driver_endpoint_hostname, proj.technical_driver_software_name].filter(Boolean).join(' · ')],
    ['Driver de prioridad', proj.priority_driver_cve_id || '', [proj.priority_driver_endpoint_hostname, proj.priority_driver_software_name].filter(Boolean).join(' · ')],
    [],
    ['INVENTARIO', 'Nº', 'Detalle'],
    ['Endpoints', endpoints.length, `${categorias.Server} servidores · ${categorias.Workstation} puestos · ${categorias.sinClasificar} sin clasificar`],
    ['Contenedores', idx.de('Container').length, ''],
    ['Imágenes de contenedor', idx.de('ContainerImage').length, ''],
    ['Instalaciones de software', idx.de('SoftwareInstallation').length, ''],
    ['Componentes de software', idx.de('Software').length, ''],
    ['Redes', idx.de('Network').length, ''],
    ['Equipos de hardware', idx.de('Hardware').length, ''],
    [],
    ['VULNERABILIDADES', 'Nº', 'Sobre el total'],
    ...SEVERIDADES.map(s => [s, porSeveridad[s], pct(porSeveridad[s], vulns.length)]),
    ['Total de CVE distintas', vulns.length, ''],
    ['En catálogo KEV (explotación confirmada)', kev, pct(kev, vulns.length)],
    ['Con exploit público conocido', exploit, pct(exploit, vulns.length)],
    ['EPSS >= 10%', epssAlto, pct(epssAlto, vulns.length)],
    ['Hallazgos abiertos', hallazgos.filter(f => props(f).status === 'OPEN').length, `de ${hallazgos.length} hallazgos en total`],
    [],
    ['MAPEO A TÉCNICAS MITRE', 'Nº', 'Detalle'],
    ['CVE analizadas', st.total_cves ?? '', ''],
    ['CVE mapeadas a técnica', st.mapped_cves ?? '', st.total_cves ? `${pct(st.mapped_cves || 0, st.total_cves)} de cobertura` : ''],
    ['CVE sin mapear', st.unmapped_cves ?? '', ''],
    ['   de ellas, resolubles por catálogo CAPEC', st.capec_pending_cves ?? '', 'Trabajo determinista pendiente de procesar'],
    ['Mapeos por correlación determinista', st.capec_static ?? '', `${pct(st.capec_static || 0, totalMapeos)} del total — verificable contra catálogo`],
    ['Mapeos por inferencia del modelo', st.llm_enriched ?? '', `${pct(st.llm_enriched || 0, totalMapeos)} del total — tratar como indicio`],
    ['Técnicas distintas en el entorno', (d.matriz || []).length, ''],
    [],
    ['REMEDIACIÓN Y GOBIERNO', 'Nº', 'Detalle'],
    ['Elementos en la cola de parcheo', d.cola?.total ?? (d.cola?.queue || []).length, ''],
    // El backend incluye una clave 'ALL' que repite el total; sumarla como si
    // fuera un tier más duplicaría la cola en el desglose.
    ...Object.entries(d.cola?.priority_tier_counts || {})
      .filter(([tier]) => tier !== 'ALL')
      .map(([tier, n]) => [`   prioridad ${tier}`, n, '']),
    ['Parches identificados', idx.de('Patch').length, `Cubren ${rem.disponibilidad.cvesConParche} de ${rem.disponibilidad.cvesTotales} CVE del alcance`],
    ['Hallazgos abiertos con parche disponible', rem.disponibilidad.abiertosConParche,
      rem.disponibilidad.accionablePct === null ? '' : `${rem.disponibilidad.accionablePct}% del backlog es accionable por parcheo`],
    ['Hallazgos abiertos sin parche disponible', rem.disponibilidad.abiertosSinParche, 'Solo admiten mitigación o aceptación formal'],
    ['Parches declarados aplicados', rem.aplicados.total,
      rem.aplicados.total > 0 ? `${rem.aplicados.oficiales} oficiales · ${rem.aplicados.mitigaciones} mitigaciones` : 'Sin declaraciones registradas'],
    ['Tiempo medio de remediación (MTTR)', rem.mttr.media,
      rem.mttr.n > 0 ? `días · mediana ${rem.mttr.mediana} · sobre ${rem.mttr.n} hallazgos cerrados` : 'Sin hallazgos cerrados que medir'],
    ['   cerrados dentro del plazo de SLA', rem.mttr.cumplimiento.enPlazo,
      rem.mttr.cumplimiento.pct === null ? 'Ningún cierre tiene plazo acordado que medir' : `${rem.mttr.cumplimiento.pct}% de ${rem.mttr.cumplimiento.medidos} cierres medibles`],
    ['Edad media del backlog abierto', rem.backlog.media,
      rem.backlog.vencidos > 0 ? `días · ${rem.backlog.vencidos} ya han pasado de su plazo` : 'días desde la detección'],
    // Incumplidos, no todas las filas: cada fila del endpoint es una CVE en un activo, esté
    // o no fuera de plazo, y contarlas todas hacía pasar el backlog entero por incumplimiento.
    ['Incumplimientos de SLA abiertos',
      (d.breaches || []).filter(b => b.sla_days > 0 && b.days_remaining < 0)
        .reduce((a, b) => a + (Number(b.finding_count) || 1), 0),
      'Hallazgos con el plazo ya vencido'],
    ['Rutas de explotación detectadas', (d.rutas || []).length, ''],
    [],
    ['TOP 5 ENDPOINTS POR RIESGO', 'Riesgo', 'CVE driver'],
    ...porRiesgo(endpoints).map(e => [props(e).hostname || '', aNumero(props(e).risk_score), props(e).technical_driver_cve_id || '']),
    [],
    ['TOP 5 INSTALACIONES POR RIESGO', 'Riesgo', 'CVE driver'],
    ...porRiesgo(idx.de('SoftwareInstallation')).map(s => {
      const sw = props(idx.uno(s, 'INSTANCE_OF'));
      const nombre = sw.name ? `${sw.name} ${sw.version || ''}`.trim() : props(s).id;
      return [nombre, aNumero(props(s).risk_score), props(s).driver_cve_id || ''];
    }),
  ];

  return libre('Resumen ejecutivo', filas, [46, 16, 62]);
}

// ═════════════════════════════════════════════════════════════════════════
// 3 · ENDPOINTS (con hardware, IPs y redes unidos)
// ═════════════════════════════════════════════════════════════════════════
function hojaEndpoints(d, idx) {
  const columnas = [
    { clave: 'id', titulo: 'ID', tipo: T.TEXTO },
    { clave: 'hostname', titulo: 'Hostname', tipo: T.TEXTO },
    { clave: 'categoria', titulo: 'Categoría', tipo: T.TEXTO },
    { clave: 'tipo', titulo: 'Tipo / SO', tipo: T.TEXTO },
    { clave: 'entorno', titulo: 'Entorno', tipo: T.TEXTO },
    { clave: 'estado', titulo: 'Estado', tipo: T.TEXTO },
    { clave: 'expuesto', titulo: 'Expuesto a Internet', tipo: T.BOOL },
    { clave: 'ips', titulo: 'Direcciones IP', tipo: T.TEXTO },
    { clave: 'redes', titulo: 'Redes conectadas', tipo: T.TEXTO },
    { clave: 'fabricante', titulo: 'Fabricante', tipo: T.TEXTO },
    { clave: 'modelo', titulo: 'Modelo', tipo: T.TEXTO },
    { clave: 'cpu', titulo: 'CPU', tipo: T.TEXTO },
    { clave: 'ram', titulo: 'RAM (GB)', tipo: T.ENTERO },
    { clave: 'disco', titulo: 'Disco (GB)', tipo: T.ENTERO },
    { clave: 'serie', titulo: 'Nº de serie', tipo: T.TEXTO },
    { clave: 'reqC', titulo: 'Req. confidencialidad', tipo: T.TEXTO },
    { clave: 'reqI', titulo: 'Req. integridad', tipo: T.TEXTO },
    { clave: 'reqA', titulo: 'Req. disponibilidad', tipo: T.TEXTO },
    { clave: 'riesgo', titulo: 'Riesgo', tipo: T.DECIMAL2 },
    { clave: 'riesgoTier', titulo: 'Tier riesgo', tipo: T.TEXTO },
    { clave: 'prioridad', titulo: 'Prioridad', tipo: T.DECIMAL2 },
    { clave: 'prioridadTier', titulo: 'Tier prioridad', tipo: T.TEXTO },
    { clave: 'swEnRiesgo', titulo: 'Software en riesgo', tipo: T.ENTERO },
    { clave: 'instalaciones', titulo: 'Instalaciones', tipo: T.ENTERO },
    { clave: 'contenedores', titulo: 'Contenedores', tipo: T.ENTERO },
    { clave: 'hallazgos', titulo: 'Hallazgos', tipo: T.ENTERO },
    { clave: 'driverCVE', titulo: 'CVE driver técnico', tipo: T.TEXTO },
    { clave: 'driverSW', titulo: 'Software driver técnico', tipo: T.TEXTO },
    { clave: 'prioDriverCVE', titulo: 'CVE driver prioridad', tipo: T.TEXTO },
    { clave: 'riesgoCalc', titulo: 'Riesgo calculado', tipo: T.FECHA },
    { clave: 'actualizado', titulo: 'Actualizado', tipo: T.FECHA },
  ];

  const filas = idx.de('Endpoint').map(e => {
    const p = props(e);
    const hw = props(idx.uno(e, 'HAS_HARDWARE'));
    const instalaciones = idx.hacia(e, 'HAS_INSTALLATION');
    const contenedores = idx.hacia(e, 'HOSTS');
    let hallazgos = 0;
    for (const s of instalaciones) hallazgos += idx.hacia(s, 'HAS_FINDING').length;
    for (const c of contenedores) {
      for (const s of idx.hacia(c, 'HAS_INSTALLATION')) hallazgos += idx.hacia(s, 'HAS_FINDING').length;
      const img = idx.uno(c, 'USES_IMAGE');
      if (img) hallazgos += idx.hacia(img, 'HAS_FINDING').length;
    }

    return {
      id: p.id,
      hostname: p.hostname,
      categoria: p.category,
      tipo: p.type,
      entorno: p.environment,
      estado: p.status,
      expuesto: p.internet_exposed,
      ips: ipsDeEndpoint(idx, e),
      redes: idx.hacia(e, 'CONNECTED_TO').map(n => props(n).nombre || props(n).cidr),
      fabricante: hw.manufacturer,
      modelo: hw.modelo,
      cpu: hw.cpu,
      ram: hw.ram_gb,
      disco: hw.storage_gb,
      serie: hw.serial_number,
      reqC: p.confidentiality_req,
      reqI: p.integrity_req,
      reqA: p.availability_req,
      riesgo: p.risk_score,
      riesgoTier: p.risk_tier,
      prioridad: p.priority_score,
      prioridadTier: p.priority_tier,
      swEnRiesgo: p.risky_software_count,
      instalaciones: instalaciones.length,
      contenedores: contenedores.length,
      hallazgos,
      driverCVE: p.technical_driver_cve_id,
      driverSW: p.technical_driver_software_name,
      prioDriverCVE: p.priority_driver_cve_id,
      riesgoCalc: p.risk_computed_at,
      actualizado: p.updated_at,
    };
  }).sort((a, b) => (aNumero(b.riesgo) ?? 0) - (aNumero(a.riesgo) ?? 0));

  return tabla('Endpoints', columnas, filas);
}

// ═════════════════════════════════════════════════════════════════════════
// 4 · CONTENEDORES E IMÁGENES
// ═════════════════════════════════════════════════════════════════════════
function hojaContenedores(d, idx) {
  const columnas = [
    { clave: 'id', titulo: 'ID', tipo: T.TEXTO },
    { clave: 'nombre', titulo: 'Contenedor', tipo: T.TEXTO },
    { clave: 'estado', titulo: 'Estado', tipo: T.TEXTO },
    { clave: 'privilegiado', titulo: 'Privilegiado', tipo: T.BOOL },
    { clave: 'expuesto', titulo: 'Expuesto a Internet', tipo: T.BOOL },
    { clave: 'host', titulo: 'Endpoint anfitrión', tipo: T.TEXTO },
    { clave: 'imagen', titulo: 'Imagen', tipo: T.TEXTO },
    { clave: 'riesgo', titulo: 'Riesgo', tipo: T.DECIMAL2 },
    { clave: 'riesgoTier', titulo: 'Tier riesgo', tipo: T.TEXTO },
    { clave: 'prioridad', titulo: 'Prioridad', tipo: T.DECIMAL2 },
    { clave: 'prioridadTier', titulo: 'Tier prioridad', tipo: T.TEXTO },
    { clave: 'instalaciones', titulo: 'Instalaciones', tipo: T.ENTERO },
    { clave: 'hallazgosImagen', titulo: 'Hallazgos de la imagen', tipo: T.ENTERO },
    { clave: 'hallazgosDirectos', titulo: 'Hallazgos directos', tipo: T.ENTERO },
    { clave: 'driverCVE', titulo: 'CVE driver técnico', tipo: T.TEXTO },
    { clave: 'escaneadas', titulo: 'CVE procesadas en la imagen', tipo: T.ENTERO },
    { clave: 'disponibles', titulo: 'CVE disponibles en la imagen', tipo: T.ENTERO },
    { clave: 'escaneoFin', titulo: 'Último escaneo de imagen', tipo: T.FECHA },
    { clave: 'cache', titulo: 'Escaneo desde caché', tipo: T.BOOL },
    { clave: 'riesgoCalc', titulo: 'Riesgo calculado', tipo: T.FECHA },
  ];

  const filas = idx.de('Container').map(c => {
    const p = props(c);
    const img = idx.uno(c, 'USES_IMAGE');
    const pi = props(img);
    const host = idx.unoDesde(c, 'HOSTS') || idx.unoDesde(c, 'HAS_ENDPOINT');
    return {
      id: p.id,
      nombre: p.name,
      estado: p.state,
      privilegiado: p.privileged,
      expuesto: p.internet_exposed,
      host: props(host).hostname,
      imagen: pi.image_id || p.image_id,
      riesgo: p.risk_score,
      riesgoTier: p.risk_tier,
      prioridad: p.priority_score,
      prioridadTier: p.priority_tier,
      instalaciones: idx.hacia(c, 'HAS_INSTALLATION').length,
      hallazgosImagen: img ? idx.hacia(img, 'HAS_FINDING').length : null,
      hallazgosDirectos: p.direct_finding_count,
      driverCVE: p.technical_driver_cve_id,
      escaneadas: pi.vuln_scan_processed,
      disponibles: pi.vuln_scan_total_available,
      escaneoFin: pi.vuln_scan_completed_at,
      cache: pi.vuln_scan_cache_hit,
      riesgoCalc: p.risk_computed_at,
    };
  }).sort((a, b) => (aNumero(b.riesgo) ?? 0) - (aNumero(a.riesgo) ?? 0));

  // Imágenes que no cuelgan de ningún contenedor del proyecto: se listan igual,
  // porque sus hallazgos sí cuentan en el resto del libro.
  const usadas = new Set(idx.de('Container').map(c => idx.uno(c, 'USES_IMAGE')?.id).filter(Boolean));
  for (const img of idx.de('ContainerImage')) {
    if (usadas.has(img.id)) continue;
    const pi = props(img);
    filas.push({
      id: pi.id,
      imagen: pi.image_id,
      hallazgosImagen: idx.hacia(img, 'HAS_FINDING').length,
      escaneadas: pi.vuln_scan_processed,
      disponibles: pi.vuln_scan_total_available,
      escaneoFin: pi.vuln_scan_completed_at,
      cache: pi.vuln_scan_cache_hit,
    });
  }

  return tabla('Contenedores e imágenes', columnas, filas);
}

// ═════════════════════════════════════════════════════════════════════════
// 5 · REDES E IPs
// ═════════════════════════════════════════════════════════════════════════
function hojaRedes(d, idx) {
  const columnas = [
    { clave: 'id', titulo: 'ID', tipo: T.TEXTO },
    { clave: 'clase', titulo: 'Tipo de registro', tipo: T.TEXTO },
    { clave: 'nombre', titulo: 'Nombre / IP', tipo: T.TEXTO },
    { clave: 'cidr', titulo: 'CIDR', tipo: T.TEXTO },
    { clave: 'gateway', titulo: 'Gateway', tipo: T.TEXTO },
    { clave: 'vlan', titulo: 'VLAN', tipo: T.TEXTO },
    { clave: 'asignada', titulo: 'Asignada a', tipo: T.TEXTO },
    { clave: 'endpoints', titulo: 'Endpoints conectados', tipo: T.ENTERO },
    { clave: 'descripcion', titulo: 'Descripción', tipo: T.TEXTO },
  ];

  const filas = [];
  for (const n of idx.de('Network')) {
    const p = props(n);
    filas.push({
      id: p.id,
      clase: 'Red',
      nombre: p.nombre,
      cidr: p.cidr,
      gateway: p.gateway,
      vlan: p.vlan_id,
      endpoints: idx.desde(n, 'CONNECTED_TO').length,
      descripcion: p.descripcion,
    });
  }
  for (const ip of idx.de('IPAddress')) {
    const p = props(ip);
    filas.push({
      id: p.id,
      clase: 'Dirección IP',
      nombre: p.ip,
      vlan: p.vlan_id,
      asignada: nombreDeNodo(idx.unoDesde(ip, 'HAS_IP')),
    });
  }

  return tabla('Redes e IPs', columnas, filas);
}

// ═════════════════════════════════════════════════════════════════════════
// 6 · SOFTWARE INSTALADO
// ═════════════════════════════════════════════════════════════════════════
function hojaSoftware(d, idx) {
  const columnas = [
    { clave: 'id', titulo: 'ID instalación', tipo: T.TEXTO },
    { clave: 'nombre', titulo: 'Software', tipo: T.TEXTO },
    { clave: 'version', titulo: 'Versión', tipo: T.TEXTO },
    { clave: 'vendor', titulo: 'Fabricante', tipo: T.TEXTO },
    { clave: 'anfitrion', titulo: 'Anfitrión', tipo: T.TEXTO },
    { clave: 'tipoAnfitrion', titulo: 'Tipo de anfitrión', tipo: T.TEXTO },
    { clave: 'ruta', titulo: 'Ruta de instalación', tipo: T.TEXTO },
    { clave: 'gestor', titulo: 'Gestor de paquetes', tipo: T.TEXTO },
    { clave: 'estado', titulo: 'Estado', tipo: T.TEXTO },
    { clave: 'criticidad', titulo: 'Criticidad', tipo: T.TEXTO },
    { clave: 'multiplicador', titulo: 'Multiplicador criticidad', tipo: T.DECIMAL2 },
    { clave: 'riesgo', titulo: 'Riesgo', tipo: T.DECIMAL2 },
    { clave: 'riesgoTier', titulo: 'Tier riesgo', tipo: T.TEXTO },
    { clave: 'prioridad', titulo: 'Prioridad', tipo: T.DECIMAL2 },
    { clave: 'prioridadTier', titulo: 'Tier prioridad', tipo: T.TEXTO },
    { clave: 'hallazgos', titulo: 'Hallazgos', tipo: T.ENTERO },
    { clave: 'driverCVE', titulo: 'CVE driver', tipo: T.TEXTO },
    { clave: 'cpe', titulo: 'CPE', tipo: T.TEXTO },
    { clave: 'purl', titulo: 'PURL', tipo: T.TEXTO },
    { clave: 'url', titulo: 'URL', tipo: T.TEXTO },
    { clave: 'detectado', titulo: 'Detectado por', tipo: T.TEXTO },
    { clave: 'primeraVez', titulo: 'Primera detección', tipo: T.FECHA },
    { clave: 'escaneadas', titulo: 'CVE procesadas', tipo: T.ENTERO },
    { clave: 'disponibles', titulo: 'CVE disponibles', tipo: T.ENTERO },
    { clave: 'escaneoFin', titulo: 'Último escaneo', tipo: T.FECHA },
  ];

  const filas = idx.de('SoftwareInstallation').map(s => {
    const p = props(s);
    const sw = props(idx.uno(s, 'INSTANCE_OF'));
    const padre = idx.unoDesde(s, 'HAS_INSTALLATION');
    return {
      id: p.id,
      nombre: sw.name,
      version: sw.version,
      vendor: sw.vendor,
      anfitrion: nombreDeNodo(padre),
      tipoAnfitrion: padre ? (esLabel(padre, 'Container') ? 'Contenedor' : 'Endpoint') : null,
      ruta: p.install_path,
      gestor: p.package_manager,
      estado: p.status,
      criticidad: p.criticality_level,
      multiplicador: p.criticality_multiplier,
      riesgo: p.risk_score,
      riesgoTier: p.risk_tier,
      prioridad: p.priority_score,
      prioridadTier: p.priority_tier,
      hallazgos: idx.hacia(s, 'HAS_FINDING').length,
      driverCVE: p.driver_cve_id,
      cpe: sw.cpe || p.vuln_scan_cpe,
      purl: sw.purl,
      url: sw.url,
      detectado: p.detected_by,
      primeraVez: p.first_seen,
      escaneadas: p.vuln_scan_processed,
      disponibles: p.vuln_scan_total_available,
      escaneoFin: p.vuln_scan_completed_at,
    };
  }).sort((a, b) => (aNumero(b.riesgo) ?? 0) - (aNumero(a.riesgo) ?? 0));

  return tabla('Software instalado', columnas, filas);
}

// ═════════════════════════════════════════════════════════════════════════
// 7 · VULNERABILIDADES
// ═════════════════════════════════════════════════════════════════════════
function hojaVulnerabilidades(d, idx) {
  // Las técnicas se toman de la matriz del backend, que es la fuente autorizada: el
  // mapeo CVE→TTP vive en relaciones del grafo, no en propiedades del nodo Vulnerability.
  const tecnicasPorCVE = new Map();
  for (const t of d.matriz || []) {
    const idT = t.id || t.ID;
    for (const c of (t.cves || t.CVEs || [])) {
      if (!c?.id) continue;
      if (!tecnicasPorCVE.has(c.id)) tecnicasPorCVE.set(c.id, []);
      tecnicasPorCVE.get(c.id).push(idT);
    }
  }

  const columnas = [
    { clave: 'cve', titulo: 'CVE', tipo: T.TEXTO },
    { clave: 'score', titulo: 'CVSS base', tipo: T.DECIMAL },
    { clave: 'severidad', titulo: 'Severidad', tipo: T.TEXTO },
    { clave: 'epss', titulo: 'EPSS', tipo: T.PORCENTAJE },
    { clave: 'kev', titulo: 'En KEV', tipo: T.BOOL },
    { clave: 'exploit', titulo: 'Exploit público', tipo: T.BOOL },
    { clave: 'hallazgos', titulo: 'Hallazgos asociados', tipo: T.ENTERO },
    { clave: 'activos', titulo: 'Activos afectados', tipo: T.TEXTO },
    { clave: 'cwe', titulo: 'CWE', tipo: T.TEXTO },
    { clave: 'tecnicas', titulo: 'Técnicas MITRE', tipo: T.TEXTO },
    { clave: 'nTecnicas', titulo: 'Nº de técnicas', tipo: T.ENTERO },
    { clave: 'fixed', titulo: 'Versión corregida', tipo: T.TEXTO },
    { clave: 'vector', titulo: 'Vector CVSS', tipo: T.TEXTO },
    { clave: 'cpe', titulo: 'CPE', tipo: T.TEXTO },
    { clave: 'detectada', titulo: 'Primera detección', tipo: T.FECHA },
    { clave: 'enriquecida', titulo: 'Enriquecida en NVD', tipo: T.FECHA },
    { clave: 'descripcion', titulo: 'Descripción', tipo: T.TEXTO, ancho: 80 },
  ];

  // Los hallazgos se agrupan por CVE resolviendo también los que solo la llevan en
  // su clave: contar únicamente los de la arista OF_VULNERABILITY dejaba a un
  // tercio de los hallazgos fuera del recuento de cada CVE.
  const vulnPorCVE = vulnerabilidadesPorCVE(idx);
  const hallazgosPorCVE = new Map();
  for (const f of idx.de('Finding')) {
    const ref = cveDeHallazgo(idx, f, vulnPorCVE);
    if (!ref.cveID) continue;
    if (!hallazgosPorCVE.has(ref.cveID)) hallazgosPorCVE.set(ref.cveID, []);
    hallazgosPorCVE.get(ref.cveID).push(f);
  }

  const filas = idx.de('Vulnerability').map(v => {
    const p = props(v);
    const hallazgos = hallazgosPorCVE.get(p.cve_id) || [];
    const activos = new Set();
    for (const h of hallazgos) {
      const ctx = contextoDeHallazgo(idx, h);
      const nombre = nombreDeNodo(ctx.endpoint) || nombreDeNodo(ctx.contenedor) || nombreDeNodo(ctx.imagen);
      if (nombre) activos.add(nombre);
    }
    const tecnicas = tecnicasPorCVE.get(p.cve_id) || [];

    return {
      cve: p.cve_id,
      score: p.base_score,
      severidad: severidadDeScore(p.base_score),
      epss: p.epss_score,
      kev: p.kev,
      exploit: p.exploit,
      hallazgos: hallazgos.length,
      activos: [...activos],
      cwe: p.cwe,
      tecnicas,
      nTecnicas: tecnicas.length,
      fixed: p.fixed_version,
      vector: p.cvss_vector || p.nvd_vector,
      cpe: p.cpe,
      detectada: p.first_detected_at,
      enriquecida: p.nvd_enriched_at,
      descripcion: p.description,
    };
  }).sort((a, b) => (aNumero(b.score) ?? 0) - (aNumero(a.score) ?? 0));

  return tabla('Vulnerabilidades', columnas, filas);
}

// ═════════════════════════════════════════════════════════════════════════
// 8 · HALLAZGOS — la tabla que une CVE, activo y software
// ═════════════════════════════════════════════════════════════════════════
function hojaHallazgos(d, idx) {
  const columnas = [
    { clave: 'id', titulo: 'ID hallazgo', tipo: T.TEXTO },
    { clave: 'clave', titulo: 'Clave única', tipo: T.TEXTO },
    { clave: 'cve', titulo: 'CVE', tipo: T.TEXTO },
    { clave: 'vinculoCVE', titulo: 'Procedencia del vínculo CVE', tipo: T.TEXTO },
    { clave: 'score', titulo: 'CVSS base', tipo: T.DECIMAL },
    { clave: 'severidad', titulo: 'Severidad', tipo: T.TEXTO },
    { clave: 'estado', titulo: 'Estado', tipo: T.TEXTO },
    { clave: 'endpoint', titulo: 'Endpoint', tipo: T.TEXTO },
    { clave: 'entorno', titulo: 'Entorno', tipo: T.TEXTO },
    { clave: 'contenedor', titulo: 'Contenedor', tipo: T.TEXTO },
    { clave: 'imagen', titulo: 'Imagen', tipo: T.TEXTO },
    { clave: 'software', titulo: 'Software', tipo: T.TEXTO },
    { clave: 'version', titulo: 'Versión', tipo: T.TEXTO },
    { clave: 'ruta', titulo: 'Ruta', tipo: T.TEXTO },
    { clave: 'riesgo', titulo: 'Riesgo', tipo: T.DECIMAL2 },
    { clave: 'prioridad', titulo: 'Prioridad', tipo: T.DECIMAL2 },
    { clave: 'probabilidad', titulo: 'Probabilidad', tipo: T.DECIMAL2 },
    { clave: 'impacto', titulo: 'Impacto', tipo: T.DECIMAL2 },
    { clave: 'exposicion', titulo: 'Factor de exposición', tipo: T.DECIMAL2 },
    { clave: 'criticidad', titulo: 'Criticidad del activo', tipo: T.DECIMAL2 },
    { clave: 'urgencia', titulo: 'Refuerzo de urgencia', tipo: T.DECIMAL2 },
    { clave: 'remediacion', titulo: 'Factor de remediación', tipo: T.DECIMAL2 },
    { clave: 'kev', titulo: 'En KEV', tipo: T.BOOL },
    { clave: 'exploit', titulo: 'Exploit público', tipo: T.BOOL },
    { clave: 'origen', titulo: 'Origen', tipo: T.TEXTO },
    { clave: 'contexto', titulo: 'Tipo de contexto', tipo: T.TEXTO },
    { clave: 'primera', titulo: 'Primera detección', tipo: T.FECHA },
    { clave: 'ultima', titulo: 'Última detección', tipo: T.FECHA },
    { clave: 'resuelto', titulo: 'Resuelto', tipo: T.FECHA },
    { clave: 'calculado', titulo: 'Riesgo calculado', tipo: T.FECHA },
  ];

  const vulnPorCVE = vulnerabilidadesPorCVE(idx);

  const filas = idx.de('Finding').map(f => {
    const p = props(f);
    const ctx = contextoDeHallazgo(idx, f);
    const ref = cveDeHallazgo(idx, f, vulnPorCVE);
    const vuln = props(ref.nodo);
    const sw = props(ctx.software);
    const pe = props(ctx.endpoint);

    return {
      id: p.id,
      clave: p.finding_key || p.unique_ref,
      cve: ref.cveID,
      vinculoCVE: ref.origen,
      score: vuln.base_score,
      // El nodo Finding tiene propiedad `severity`, pero solo la traen 2 de 1090:
      // se deriva del CVSS de la CVE, que sí está siempre.
      severidad: severidadDeScore(vuln.base_score),
      estado: p.status,
      endpoint: pe.hostname,
      entorno: pe.environment,
      contenedor: props(ctx.contenedor).name,
      imagen: props(ctx.imagen).image_id || p.image_id,
      software: sw.name,
      version: sw.version,
      ruta: props(ctx.instalacion).install_path,
      riesgo: p.risk_score,
      prioridad: p.priority_score,
      probabilidad: p.likelihood,
      impacto: p.impact_score,
      exposicion: p.exposure_factor,
      criticidad: p.asset_criticality,
      urgencia: p.urgency_boost,
      remediacion: p.remediation_factor,
      kev: vuln.kev,
      exploit: vuln.exploit,
      origen: p.source,
      contexto: p.context_type,
      primera: p.first_seen,
      ultima: p.last_seen,
      resuelto: p.resolved_at,
      calculado: p.risk_computed_at,
    };
  }).sort((a, b) => (aNumero(b.prioridad) ?? 0) - (aNumero(a.prioridad) ?? 0));

  return tabla('Hallazgos', columnas, filas);
}

// ═════════════════════════════════════════════════════════════════════════
// 9 · COLA DE REMEDIACIÓN
// ═════════════════════════════════════════════════════════════════════════
function hojaCola(d) {
  const columnas = [
    { clave: 'position', titulo: 'Posición', tipo: T.ENTERO },
    { clave: 'priority_tier', titulo: 'Tier prioridad', tipo: T.TEXTO },
    { clave: 'priority_score', titulo: 'Prioridad', tipo: T.DECIMAL2 },
    { clave: 'risk_score', titulo: 'Riesgo', tipo: T.DECIMAL2 },
    { clave: 'cve_id', titulo: 'CVE', tipo: T.TEXTO },
    { clave: 'status', titulo: 'Estado', tipo: T.TEXTO },
    { clave: 'hostname', titulo: 'Endpoint', tipo: T.TEXTO },
    { clave: 'environment', titulo: 'Entorno', tipo: T.TEXTO },
    { clave: 'in_container', titulo: 'En contenedor', tipo: T.BOOL },
    { clave: 'container_name', titulo: 'Contenedor', tipo: T.TEXTO },
    { clave: 'software_name', titulo: 'Software', tipo: T.TEXTO },
    { clave: 'software_version', titulo: 'Versión instalada', tipo: T.TEXTO },
    { clave: 'software_vendor', titulo: 'Fabricante', tipo: T.TEXTO },
    { clave: 'fixed_version', titulo: 'Versión corregida', tipo: T.TEXTO, ancho: 60 },
    { clave: 'patch_available', titulo: 'Parche disponible', tipo: T.BOOL },
    { clave: 'remediation_kind', titulo: 'Tipo de remediación', tipo: T.TEXTO },
    { clave: 'asset_criticality', titulo: 'Criticidad del activo', tipo: T.DECIMAL2 },
    { clave: 'urgency_boost', titulo: 'Refuerzo de urgencia', tipo: T.DECIMAL2 },
    { clave: 'asset_type', titulo: 'Tipo de activo', tipo: T.TEXTO },
    { clave: 'asset_id', titulo: 'ID del activo', tipo: T.TEXTO },
    { clave: 'finding_id', titulo: 'ID hallazgo', tipo: T.TEXTO },
    { clave: 'software_cpe', titulo: 'CPE', tipo: T.TEXTO },
  ];

  return tabla('Cola de remediación', columnas, d.cola?.queue || []);
}

// ═════════════════════════════════════════════════════════════════════════
// 10 · PARCHES
// ═════════════════════════════════════════════════════════════════════════
function hojaParches(d, idx, rem) {
  const columnas = [
    { clave: 'id', titulo: 'ID', tipo: T.TEXTO },
    { clave: 'cves', titulo: 'CVE que corrige', tipo: T.TEXTO },
    { clave: 'nCves', titulo: 'Nº de CVE', tipo: T.ENTERO },
    { clave: 'severidadMax', titulo: 'Severidad máxima cubierta', tipo: T.TEXTO },
    { clave: 'aplicaciones', titulo: 'Veces declarado aplicado', tipo: T.ENTERO },
    { clave: 'activos', titulo: 'Activos donde se ha aplicado', tipo: T.TEXTO, ancho: 45 },
    { clave: 'ultimaAplicacion', titulo: 'Última aplicación', tipo: T.FECHA },
    { clave: 'url', titulo: 'URL', tipo: T.TEXTO, ancho: 70 },
    { clave: 'fecha', titulo: 'Fecha de publicación', tipo: T.FECHA },
    { clave: 'descripcion', titulo: 'Descripción', tipo: T.TEXTO, ancho: 60 },
  ];

  // Declaraciones agrupadas por parche: la hoja pasa así de listar el catálogo de
  // arreglos disponibles a decir además cuáles se han puesto y dónde.
  const aplicacionesPorParche = new Map();
  for (const a of rem.aplicados.ultimas) {
    if (a.parcheID === null || a.parcheID === undefined) continue;
    const clave = String(a.parcheID);
    if (!aplicacionesPorParche.has(clave)) aplicacionesPorParche.set(clave, []);
    aplicacionesPorParche.get(clave).push(a);
  }

  const filas = idx.de('Patch').map(p0 => {
    const p = props(p0);
    const vulns = idx.hacia(p0, 'FIXES');
    const scores = vulns.map(v => aNumero(props(v).base_score)).filter(n => n !== null);
    const aplicaciones = aplicacionesPorParche.get(String(p.id)) || [];
    const fechas = aplicaciones.map(a => a.aplicadoEn).filter(Boolean);
    return {
      id: p.id,
      cves: vulns.map(v => props(v).cve_id).filter(Boolean),
      nCves: vulns.length,
      severidadMax: scores.length > 0 ? severidadDeScore(Math.max(...scores)) : null,
      aplicaciones: aplicaciones.length > 0 ? aplicaciones.length : null,
      activos: [...new Set(aplicaciones.map(a => a.endpoint || a.contenedor || a.activoID).filter(Boolean))],
      ultimaAplicacion: fechas.length > 0 ? new Date(Math.max(...fechas.map(f => f.getTime()))) : null,
      url: p.url,
      fecha: p.release_date,
      descripcion: p.description,
    };
  }).sort((a, b) => b.nCves - a.nCves);

  return tabla('Parches', columnas, filas);
}

// ═════════════════════════════════════════════════════════════════════════
// 10 · PARCHEO Y MTTR
// ═════════════════════════════════════════════════════════════════════════

/**
 * Resumen del ritmo de parcheo: qué parte del backlog tiene arreglo publicado, qué se ha
 * declarado aplicado y cuánto se tarda en cerrar un hallazgo desde que se detecta.
 *
 * Las cifras salen del mismo cálculo que publican las láminas del PPTX, para que el libro
 * y la presentación del mismo proyecto no puedan dar un MTTR distinto.
 */
function hojaParcheoMTTR(d, rem) {
  const P = rem.disponibilidad;
  const A = rem.aplicados;
  const M = rem.mttr;
  const B = rem.backlog;

  const dia = (n) => (Number.isFinite(n) ? n : null);
  const pct = (n) => (Number.isFinite(n) ? `${n}%` : '');

  const filas = [
    ['PARCHEO Y TIEMPO DE REMEDIACIÓN'],
    [],
    ['DISPONIBILIDAD DE PARCHE', 'Valor', 'Detalle'],
    ['Parches identificados', P.parches, 'Nodos Patch enlazados por FIXES a alguna CVE del alcance'],
    ['CVE con parche publicado', P.cvesConParche, `${pct(P.coberturaPct)} de las ${P.cvesTotales} CVE del proyecto`],
    ['Hallazgos abiertos con parche', P.abiertosConParche, `${pct(P.accionablePct)} del backlog es accionable por parcheo`],
    ['Hallazgos abiertos sin parche', P.abiertosSinParche, 'Solo admiten mitigación compensatoria o aceptación formal'],
    [],
    ['PARCHES DECLARADOS APLICADOS', 'Valor', 'Detalle'],
    ['Declaraciones registradas', A.total, `Sobre ${A.activos} ${A.activos === 1 ? 'activo' : 'activos'} y ${A.cves} ${A.cves === 1 ? 'CVE' : 'CVE distintas'}`],
    ['   parches oficiales', A.oficiales, 'Cierran el hallazgo: el software deja de ser vulnerable'],
    ['   mitigaciones', A.mitigaciones, 'Corrección temporal o solución alternativa: el hallazgo sigue abierto'],
    ['   reversiones', A.revertidos, 'Declaradas como UNAVAILABLE, revierten una declaración previa'],
    ['Verificadas contra la versión instalada', A.verificados,
      A.total > 0 ? `de ${A.total} ${A.total === 1 ? 'declaración' : 'declaraciones'}` : ''],
    ['   sin verificación concluyente', A.noConcluyentes, 'No consta la versión que corrige el fallo, así que no hay contra qué comparar'],
    ['Aplicadas en los últimos 30 días', A.enPeriodo, ''],
    [],
    ['TIEMPO DE REMEDIACIÓN (MTTR)', 'Días', 'Detalle'],
    ['Media', dia(M.media), `Sobre ${M.n} ${M.n === 1 ? 'hallazgo cerrado' : 'hallazgos cerrados'} con fecha de detección y de cierre`],
    ['Mediana', dia(M.mediana), 'La mitad de los cierres queda por debajo de este tiempo'],
    ['Percentil 90', dia(M.p90), 'El decil más lento supera este tiempo'],
    ['Mínimo', dia(M.min), ''],
    ['Máximo', dia(M.max), ''],
    ['Media de los últimos 30 días', dia(M.enPeriodo.media), `${M.enPeriodo.n} ${M.enPeriodo.n === 1 ? 'cierre' : 'cierres'} en la ventana`],
    [],
    ['MTTR POR SEVERIDAD', 'Días (media)', 'Frente al plazo acordado'],
    ...SEVERIDADES.map(sev => {
      const b = M.porSeveridad[sev];
      if (b.n === 0) return [sev, null, 'Sin cierres medidos'];
      const ref = Number.isFinite(b.slaDias)
        ? `SLA ${b.slaDias} d — ${b.media > b.slaDias ? `excedido en ${Math.round((b.media - b.slaDias) * 10) / 10} d` : 'dentro de plazo'}`
        : 'Sin plazo acordado para esta severidad';
      return [sev, dia(b.media), `${b.n} ${b.n === 1 ? 'cierre' : 'cierres'} · mediana ${b.mediana} d · ${ref}`];
    }),
    [],
    ['MTTR POR GRUPO DE MANTENIMIENTO', 'Días (media)', 'Detalle'],
    ['Servidores', dia(M.porCategoria.Server.media), `${M.porCategoria.Server.n} cierres · mediana ${M.porCategoria.Server.mediana ?? '—'} d`],
    ['Puestos de trabajo', dia(M.porCategoria.Workstation.media), `${M.porCategoria.Workstation.n} cierres · mediana ${M.porCategoria.Workstation.mediana ?? '—'} d`],
    ['Contenedores', dia(M.porCategoria.Container.media), `${M.porCategoria.Container.n} cierres · mediana ${M.porCategoria.Container.mediana ?? '—'} d`],
    ['Sin clasificar', dia(M.porCategoria.sinClasificar.media), `${M.porCategoria.sinClasificar.n} cierres — sin categoría no hay SLA aplicable`],
    [],
    ['CUMPLIMIENTO EN EL CIERRE', 'Valor', 'Detalle'],
    ['Cierres con plazo medible', M.cumplimiento.medidos, 'Requiere categoría del activo y severidad con SLA acordado'],
    ['   cerrados dentro de plazo', M.cumplimiento.enPlazo, pct(M.cumplimiento.pct)],
    ['   cerrados fuera de plazo', M.cumplimiento.fuera, ''],
    ['Cerrados sin marcas de tiempo', M.sinFechas, 'Quedan fuera del cálculo del MTTR'],
    ['Reemplazados al cambiar la imagen', M.supersedidos, 'Estado SUPERSEDED: el cierre no lo produce un trabajo de remediación'],
    [],
    ['BACKLOG ABIERTO', 'Valor', 'Detalle'],
    ['Hallazgos abiertos', B.n, 'La contraparte del MTTR: lo que todavía no se ha cerrado'],
    ['Edad media', dia(B.media), 'Días desde la detección'],
    ['Edad mediana', dia(B.mediana), ''],
    ['Percentil 90 de edad', dia(B.p90), ''],
    ['Abiertos con el plazo ya vencido', B.vencidos, 'Superan los días de SLA de su par (grupo, severidad)'],
    ['Hallazgo abierto más antiguo', dia(B.masViejo?.edadDias),
      B.masViejo ? [B.masViejo.cve, B.masViejo.endpoint, B.masViejo.software].filter(Boolean).join(' · ') : ''],
  ];

  return libre('Parcheo y MTTR', filas, [46, 18, 72]);
}

// ═════════════════════════════════════════════════════════════════════════
// 12 · PARCHES DECLARADOS APLICADOS
// ═════════════════════════════════════════════════════════════════════════

/**
 * Histórico de declaraciones: una fila por arista (:Patch)-[:APPLIED_TO]->(activo).
 *
 * Es la evidencia de que el parche no solo existe sino que se ha puesto, con quién lo
 * declaró y qué dijo la verificación automática contra la versión instalada.
 */
function hojaParchesAplicados(rem) {
  const columnas = [
    { clave: 'cve', titulo: 'CVE', tipo: T.TEXTO },
    { clave: 'nivel', titulo: 'Nivel de remediación', tipo: T.TEXTO },
    { clave: 'oficial', titulo: 'Cierra el hallazgo', tipo: T.BOOL },
    { clave: 'factor', titulo: 'Factor de remediación', tipo: T.DECIMAL2 },
    { clave: 'endpoint', titulo: 'Endpoint', tipo: T.TEXTO },
    { clave: 'contenedor', titulo: 'Contenedor', tipo: T.TEXTO },
    { clave: 'software', titulo: 'Software', tipo: T.TEXTO },
    { clave: 'tipoActivo', titulo: 'Tipo de activo', tipo: T.TEXTO },
    { clave: 'activoID', titulo: 'ID del activo', tipo: T.TEXTO },
    { clave: 'aplicadoEn', titulo: 'Aplicado', tipo: T.FECHA },
    { clave: 'aplicadoPor', titulo: 'Declarado por', tipo: T.TEXTO },
    { clave: 'verificado', titulo: 'Verificado', tipo: T.BOOL },
    { clave: 'verificacionConcluyente', titulo: 'Verificación concluyente', tipo: T.BOOL },
    { clave: 'motivoVerificacion', titulo: 'Resultado de la verificación', tipo: T.TEXTO, ancho: 55 },
    { clave: 'versionInstalada', titulo: 'Versión instalada', tipo: T.TEXTO },
    { clave: 'versionEsperada', titulo: 'Versión que corrige', tipo: T.TEXTO },
    { clave: 'parcheID', titulo: 'ID del parche', tipo: T.TEXTO },
    { clave: 'parcheURL', titulo: 'URL del parche', tipo: T.TEXTO, ancho: 70 },
    { clave: 'notas', titulo: 'Notas', tipo: T.TEXTO, ancho: 60 },
  ];

  const filas = rem.aplicados.ultimas.map(a => ({ ...a, nivel: a.nivelES }));

  return tabla('Parches aplicados', columnas, filas);
}

// ═════════════════════════════════════════════════════════════════════════
// 13 · CIERRES Y MTTR
// ═════════════════════════════════════════════════════════════════════════

/**
 * Una fila por hallazgo cerrado con el reloj completo: es el detalle que sostiene el
 * MTTR del resumen, para que la media se pueda auditar caso a caso en vez de tener que
 * creérsela.
 */
function hojaCierres(rem) {
  const columnas = [
    { clave: 'cve', titulo: 'CVE', tipo: T.TEXTO },
    { clave: 'severidad', titulo: 'Severidad', tipo: T.TEXTO },
    { clave: 'categoria', titulo: 'Grupo de mantenimiento', tipo: T.TEXTO },
    { clave: 'endpoint', titulo: 'Endpoint', tipo: T.TEXTO },
    { clave: 'contenedor', titulo: 'Contenedor', tipo: T.TEXTO },
    { clave: 'software', titulo: 'Software', tipo: T.TEXTO },
    { clave: 'version', titulo: 'Versión', tipo: T.TEXTO },
    { clave: 'estado', titulo: 'Estado', tipo: T.TEXTO },
    { clave: 'detectado', titulo: 'Detectado', tipo: T.FECHA },
    { clave: 'resuelto', titulo: 'Cerrado', tipo: T.FECHA },
    { clave: 'dias', titulo: 'Días hasta el cierre', tipo: T.DECIMAL },
    { clave: 'slaDias', titulo: 'Días de SLA', tipo: T.ENTERO },
    { clave: 'dentroDeSLA', titulo: 'Cerrado en plazo', tipo: T.BOOL },
    { clave: 'desvioDias', titulo: 'Desvío sobre el plazo', tipo: T.DECIMAL },
    { clave: 'nivelES', titulo: 'Nivel de remediación declarado', tipo: T.TEXTO },
    { clave: 'declarado', titulo: 'Con declaración de parche', tipo: T.BOOL },
    { clave: 'verificado', titulo: 'Parche verificado', tipo: T.BOOL },
    { clave: 'aplicadoPor', titulo: 'Declarado por', tipo: T.TEXTO },
  ];

  const filas = [...rem.cierres].sort((a, b) => (b.dias ?? 0) - (a.dias ?? 0));

  return tabla('Cierres y MTTR', columnas, filas);
}

// ═════════════════════════════════════════════════════════════════════════
// 11 · MATRIZ TTP
// ═════════════════════════════════════════════════════════════════════════
function hojaMatrizTTP(d) {
  const etiqueta = new Map(TACTICS.map(t => [t.key, t.label]));

  const columnas = [
    { clave: 'id', titulo: 'Técnica', tipo: T.TEXTO },
    { clave: 'nombre', titulo: 'Nombre', tipo: T.TEXTO },
    { clave: 'tacticas', titulo: 'Tácticas', tipo: T.TEXTO, ancho: 60 },
    { clave: 'nTacticas', titulo: 'Nº de tácticas', tipo: T.ENTERO },
    { clave: 'nCves', titulo: 'CVE asociadas', tipo: T.ENTERO },
    { clave: 'cvssMax', titulo: 'CVSS máximo', tipo: T.DECIMAL },
    { clave: 'cves', titulo: 'Listado de CVE', tipo: T.TEXTO, ancho: 70 },
    { clave: 'descripcion', titulo: 'Descripción', tipo: T.TEXTO, ancho: 80 },
  ];

  const filas = (d.matriz || []).map(t => {
    const cves = t.cves || t.CVEs || [];
    const claves = normalizeTacticKeys(t.tactic || t.Tactic || '');
    const scores = cves.map(c => aNumero(c.cvss)).filter(n => n !== null);
    return {
      id: t.id || t.ID,
      nombre: t.name || t.Name,
      tacticas: claves.map(k => etiqueta.get(k) || k),
      nTacticas: claves.length,
      nCves: cves.length,
      cvssMax: scores.length > 0 ? Math.max(...scores) : null,
      cves: cves.map(c => c.id).filter(Boolean),
      descripcion: t.desc || t.Desc,
    };
  }).sort((a, b) => b.nCves - a.nCves);

  return tabla('Matriz TTP', columnas, filas);
}

// ═════════════════════════════════════════════════════════════════════════
// 12 · TTP POR TÁCTICA
// ═════════════════════════════════════════════════════════════════════════
function hojaTacticas(d) {
  const columnas = [
    { clave: 'id', titulo: 'ID táctica', tipo: T.TEXTO },
    { clave: 'nombre', titulo: 'Táctica', tipo: T.TEXTO },
    { clave: 'nTecnicas', titulo: 'Técnicas en el entorno', tipo: T.ENTERO },
    { clave: 'nCves', titulo: 'CVE asociadas', tipo: T.ENTERO },
    { clave: 'top', titulo: 'Técnicas más frecuentes', tipo: T.TEXTO, ancho: 70 },
  ];

  const cubo = new Map(TACTICS.map(t => [t.key, { tecnicas: [], cves: 0 }]));
  for (const t of d.matriz || []) {
    const cves = (t.cves || t.CVEs || []).length;
    for (const k of normalizeTacticKeys(t.tactic || t.Tactic || '')) {
      const b = cubo.get(k);
      if (!b) continue;
      b.tecnicas.push({ id: t.id || t.ID, nombre: t.name || t.Name, n: cves });
      b.cves += cves;
    }
  }

  const filas = TACTICS.map(tac => {
    const b = cubo.get(tac.key);
    const top = [...b.tecnicas].sort((x, y) => y.n - x.n).slice(0, 3);
    return {
      id: tac.id,
      nombre: tac.label,
      nTecnicas: b.tecnicas.length,
      nCves: b.cves,
      top: top.map(t => `${t.id} ${t.nombre} (${t.n})`),
    };
  });

  return tabla('TTP por táctica', columnas, filas);
}

// ═════════════════════════════════════════════════════════════════════════
// 13 · TOP THREAT ACTORS
// ═════════════════════════════════════════════════════════════════════════
function hojaActores(d, idx) {
  const alias = new Map(idx.de('ThreatActor').map(a => [props(a).actor_id, props(a)]));

  const columnas = [
    { clave: 'id', titulo: 'ID actor', tipo: T.TEXTO },
    { clave: 'nombre', titulo: 'Actor', tipo: T.TEXTO },
    { clave: 'alias', titulo: 'Alias', tipo: T.TEXTO, ancho: 50 },
    { clave: 'origen', titulo: 'Origen', tipo: T.TEXTO },
    { clave: 'motivacion', titulo: 'Motivación', tipo: T.TEXTO },
    { clave: 'coincidentes', titulo: 'Técnicas coincidentes', tipo: T.ENTERO },
    { clave: 'totalInfra', titulo: 'Técnicas del entorno', tipo: T.ENTERO },
    { clave: 'cobertura', titulo: 'Cobertura', tipo: T.PORCENTAJE },
    { clave: 'tecnicas', titulo: 'Técnicas compartidas', tipo: T.TEXTO, ancho: 90 },
    { clave: 'descripcion', titulo: 'Descripción', tipo: T.TEXTO, ancho: 80 },
  ];

  const filas = (d.apts || []).map(a => {
    const nodo = alias.get(a.actor_id) || {};
    return {
      id: a.actor_id,
      nombre: a.actor_name || nodo.name,
      alias: nodo.aliases,
      origen: a.origin && a.origin !== 'Unknown' ? a.origin : null,
      motivacion: a.motivation && a.motivation !== 'Unknown' ? a.motivation : null,
      coincidentes: a.matched_ttp_count,
      totalInfra: a.total_infra_ttps,
      // El backend devuelve el porcentaje ya en escala 0-100; Excel lo quiere 0-1.
      cobertura: aNumero(a.coverage_percent) !== null ? aNumero(a.coverage_percent) / 100 : null,
      tecnicas: a.matched_ttp_names,
      descripcion: nodo.description,
    };
  });

  return tabla('Top Threat Actors', columnas, filas);
}

// ═════════════════════════════════════════════════════════════════════════
// 14 · RUTAS DE EXPLOTACIÓN
// ═════════════════════════════════════════════════════════════════════════
function hojaRutas(d) {
  const columnas = [
    { clave: 'ruta', titulo: 'Ruta', tipo: T.TEXTO },
    { clave: 'inicio', titulo: 'Endpoint inicial', tipo: T.TEXTO },
    { clave: 'riesgoTotal', titulo: 'Riesgo acumulado', tipo: T.DECIMAL2 },
    { clave: 'paso', titulo: 'Paso', tipo: T.ENTERO },
    { clave: 'origen', titulo: 'Origen', tipo: T.TEXTO },
    { clave: 'destino', titulo: 'Destino', tipo: T.TEXTO },
    { clave: 'cve', titulo: 'CVE explotada', tipo: T.TEXTO },
    { clave: 'software', titulo: 'Software afectado', tipo: T.TEXTO },
    { clave: 'contenedor', titulo: 'Es contenedor', tipo: T.BOOL },
    { clave: 'escape', titulo: 'Escape de contenedor', tipo: T.BOOL },
    { clave: 'explotable', titulo: 'Exploit conocido', tipo: T.BOOL },
    { clave: 'rce', titulo: 'Ejecución remota', tipo: T.BOOL },
    { clave: 'root', titulo: 'Obtiene root', tipo: T.BOOL },
  ];

  const filas = [];
  for (const r of d.rutas || []) {
    for (const s of r.steps || []) {
      filas.push({
        ruta: r.path_id,
        inicio: r.initial_endpoint,
        riesgoTotal: r.total_risk_score,
        paso: (s.step_index ?? 0) + 1,
        origen: s.source_endpoint,
        destino: s.target_endpoint,
        cve: s.vulnerability,
        software: s.software_affected,
        contenedor: s.is_container,
        escape: s.container_escape,
        explotable: s.exploitable,
        rce: s.rce,
        root: s.root_obtained,
      });
    }
  }

  return tabla('Rutas de explotación', columnas, filas);
}

// ═════════════════════════════════════════════════════════════════════════
// 15 · GOBIERNO Y SLA
// ═════════════════════════════════════════════════════════════════════════
function hojaSLA(d) {
  const columnas = [
    { clave: 'bloque', titulo: 'Bloque', tipo: T.TEXTO },
    { clave: 'categoria', titulo: 'Categoría', tipo: T.TEXTO },
    { clave: 'severidad', titulo: 'Severidad', tipo: T.TEXTO },
    { clave: 'cve', titulo: 'CVE', tipo: T.TEXTO },
    { clave: 'score', titulo: 'CVSS base', tipo: T.DECIMAL },
    { clave: 'dias', titulo: 'Días de SLA', tipo: T.ENTERO },
    { clave: 'restantes', titulo: 'Días restantes', tipo: T.ENTERO },
    { clave: 'activo', titulo: 'Activo', tipo: T.TEXTO },
    { clave: 'hallazgos', titulo: 'Hallazgos', tipo: T.ENTERO },
    { clave: 'detectada', titulo: 'Primera detección', tipo: T.FECHA },
  ];

  const filas = [];
  for (const c of d.slaConfig || []) {
    filas.push({
      bloque: 'Configuración de SLA',
      categoria: c.category,
      severidad: c.severity,
      dias: c.days,
    });
  }
  for (const b of d.breaches || []) {
    filas.push({
      bloque: 'Incumplimiento',
      categoria: b.category,
      severidad: b.severity,
      cve: b.cve_id,
      score: b.base_score,
      dias: b.sla_days,
      restantes: b.days_remaining,
      activo: b.asset_name,
      hallazgos: b.finding_count,
      detectada: b.first_detected_at,
    });
  }

  return tabla('Gobierno y SLA', columnas, filas);
}

// ═════════════════════════════════════════════════════════════════════════
// Composición
// ═════════════════════════════════════════════════════════════════════════

/**
 * Devuelve las especificaciones de todas las hojas, en el orden del libro.
 */
export function construirEspecificaciones(datos, idx) {
  // Un único cálculo de parcheo y MTTR para todo el libro, y el mismo que usan las
  // láminas del PPTX: si cada hoja lo recalculara podrían discrepar entre ellas.
  const rem = metricasDeRemediacion(idx, {
    slaConfig: datos.slaConfig,
    ahora: (datos.generadoEn instanceof Date ? datos.generadoEn : new Date()).getTime(),
    ventanaDias: 30,
  });

  const hojas = [
    hojaPortada(datos, idx),
    hojaResumen(datos, idx, rem),
    hojaEndpoints(datos, idx),
    hojaContenedores(datos, idx),
    hojaRedes(datos, idx),
    hojaSoftware(datos, idx),
    hojaVulnerabilidades(datos, idx),
    hojaHallazgos(datos, idx),
    hojaCola(datos),
    hojaParcheoMTTR(datos, rem),
    hojaParches(datos, idx, rem),
    hojaParchesAplicados(rem),
    hojaCierres(rem),
    hojaMatrizTTP(datos),
    hojaTacticas(datos),
    hojaActores(datos, idx),
    hojaRutas(datos),
    hojaSLA(datos),
  ];
  return hojas;
}

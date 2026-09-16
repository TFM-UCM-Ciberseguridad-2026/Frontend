/**
 * reportSlides — constructores de lámina, uno por sección del informe.
 *
 * Cada función recibe el contexto (`ctx`, con la presentación y el sistema visual) y los
 * datos ya normalizados (`D`, de reportData). El informe semanal y el mensual se limitan a
 * componer listas distintas de estas piezas, de modo que una corrección de diseño llega a
 * los dos a la vez.
 */

import {
  C, F, PAGE, CW, SEV_COLOR, SEV_ES, SEV_ORDER, CAT_LABEL, CAT_COLOR, GRUPOS_SLA, fechaCorta, recortar,
} from './reportKit.js';
import { FILAS_COLA } from './reportData.js';

/** Suma una severidad (o el total) sobre todos los grupos, contenedores incluidos. */
const sumaGrupos = (porGrupo, clave) => Object.values(porGrupo).reduce((a, g) => a + (g[clave] || 0), 0);

const pct = (n) => `${Math.round(Number(n || 0) * 100)}%`;

// ════════════════════════════════════════════════════════════════════════════
// SITUACIÓN DEL PERIODO
// ════════════════════════════════════════════════════════════════════════════
export function situacionDelPeriodo(ctx, D, { titulo, etiquetaPeriodo }) {
  const s = ctx.slide();
  ctx.head(s, {
    fase: 'Resumen',
    titulo,
    subtitulo: 'Lectura de un vistazo, con el detalle en las secciones siguientes',
    control: 'SP 800-53r4 · PM-4',
  });

  const criticasAbiertas = sumaGrupos(D.porGrupo, 'Critical');
  const incumplidos = D.incumplidos;
  const cumpServidores = D.cumplimiento.Server.total > 0 ? `${D.cumplimiento.Server.pct}%` : '—';

  const kw = (CW - 0.18 * 4) / 5;
  const kpis = [
    {
      label: 'Riesgo del proyecto', value: D.proyecto.riskTier,
      sub: `Score agregado ${D.proyecto.riskScore.toFixed(2)} / 1.00`,
      color: D.proyecto.riskTier === 'CRITICAL' ? C.CRIT : D.proyecto.riskTier === 'HIGH' ? C.HIGH : C.TEXT,
      accent: D.proyecto.riskTier === 'CRITICAL' ? C.CRIT : C.ACCENT,
    },
    {
      label: `Altas en ${etiquetaPeriodo}`, value: D.findings.nuevosPeriodo,
      sub: `${D.findings.cerradosPeriodo} cerradas · neto ${D.findings.neto >= 0 ? '+' : ''}${D.findings.neto}`,
      color: D.findings.neto > 0 ? C.WARN : C.OK, accent: D.findings.neto > 0 ? C.WARN : C.OK,
    },
    {
      label: 'Críticas abiertas', value: criticasAbiertas,
      sub: `De ${D.findings.abiertos} hallazgos abiertos`, color: C.CRIT, accent: C.CRIT,
    },
    {
      label: 'Cumplimiento SLA', value: cumpServidores,
      sub: D.cumplimiento.Server.total > 0
        ? `Servidores · ${D.cumplimiento.Server.enPlazo} de ${D.cumplimiento.Server.total} en plazo`
        : 'Sin hallazgos que medir',
      color: D.cumplimiento.Server.total === 0 ? C.MUTE
        : D.cumplimiento.Server.pct >= 95 ? C.OK : D.cumplimiento.Server.pct >= 80 ? C.WARN : C.BAD,
      accent: C.OK,
    },
    {
      label: 'Activos sin clasificar', value: D.inventario.sinClasificar,
      sub: D.inventario.sinClasificar > 0 ? 'Sin SLA aplicable — acción requerida' : 'Todo el parque clasificado',
      color: D.inventario.sinClasificar > 0 ? C.WARN : C.OK,
      accent: D.inventario.sinClasificar > 0 ? C.WARN : C.OK,
    },
  ];
  kpis.forEach((k, i) => ctx.kpi(s, { ...k, x: PAGE.M + i * (kw + 0.18), y: 1.68, w: kw, h: 1.36 }));

  // Valoración redactada a partir del propio dato
  const runs = [];
  if (incumplidos === 0) {
    runs.push({ text: `Ningún plazo de remediación se ha incumplido en ${etiquetaPeriodo}`, options: { bold: true, color: C.TEXT } });
    const medidos = GRUPOS_SLA.reduce((a, cat) => a + D.cumplimiento[cat].total, 0);
    runs.push({ text: `. Los ${medidos} hallazgos con plazo acordado están dentro de su acuerdo. `, options: { color: C.TEXT_2 } });
  } else {
    runs.push({ text: `${incumplidos} hallazgos han superado su plazo de remediación`, options: { bold: true, color: C.CRIT } });
    runs.push({ text: `, y son el primer punto a tratar: cada uno es un compromiso vencido, no una tarea pendiente. `, options: { color: C.TEXT_2 } });
  }
  runs.push({ text: '\n\nEl riesgo agregado del proyecto es ', options: { color: C.TEXT_2 } });
  runs.push({ text: `${D.proyecto.riskTier} (${D.proyecto.riskScore.toFixed(2)})`, options: { bold: true, color: C.TEXT } });
  if (D.proyecto.driverHost) {
    runs.push({ text: ', empujado por ', options: { color: C.TEXT_2 } });
    runs.push({
      text: `${D.proyecto.driverHost}${D.proyecto.driverSoftware ? ` (${D.proyecto.driverSoftware})` : ''}${D.proyecto.driverCVE ? ` · ${D.proyecto.driverCVE}` : ''}`,
      options: { bold: true, color: C.TEXT },
    });
    runs.push({ text: ', que es el activo con mayor riesgo técnico del alcance.', options: { color: C.TEXT_2 } });
  } else {
    runs.push({ text: '.', options: { color: C.TEXT_2 } });
  }

  ctx.callout(s, { x: PAGE.M, y: 3.26, w: 7.55, h: 2.05, titulo: 'Valoración', runs });

  // Puntos que requieren decisión, derivados de los propios indicadores
  const atencion = [];
  if (D.inventario.sinClasificar > 0) {
    atencion.push(`${D.inventario.sinClasificar} de ${D.inventario.endpoints} endpoints no tienen tipo válido: quedan fuera de toda medición de SLA.`);
  }
  if (incumplidos > 0) atencion.push(`${incumplidos} hallazgos fuera de plazo requieren escalado según PROC-06.`);
  if (D.vencenPronto.length > 0) atencion.push(`${D.vencenProntoHallazgos} hallazgos vencen en los próximos 7 días.`);
  if (atencion.length === 0) atencion.push('Sin puntos de decisión pendientes en este periodo.');

  s.addShape(ctx.pres.ShapeType.roundRect, {
    x: 8.35, y: 3.26, w: 4.43, h: 2.05,
    fill: { color: C.PANEL }, line: { color: C.WARN, width: 0.75 }, rectRadius: 0.08,
  });
  s.addText('REQUIERE DECISIÓN', {
    x: 8.6, y: 3.44, w: 4, h: 0.24,
    fontSize: 8.5, fontFace: F.MONO, bold: true, color: C.WARN, charSpacing: 1.4,
  });
  atencion.slice(0, 3).forEach((t, i) => {
    const y = 3.76 + i * 0.5;
    s.addShape(ctx.pres.ShapeType.rect, { x: 8.6, y: y + 0.08, w: 0.07, h: 0.07, fill: { color: C.WARN } });
    s.addText(t, { x: 8.78, y, w: 3.85, h: 0.46, fontSize: 9, fontFace: F.SANS, color: C.TEXT_2, lineSpacingMultiple: 1.2 });
  });

  // Franja de severidad del total abierto
  const totalSev = {};
  SEV_ORDER.forEach(k => {
    totalSev[k] = sumaGrupos(D.porGrupo, k);
  });
  const suma = SEV_ORDER.reduce((a, k) => a + totalSev[k], 0);

  s.addText('DISTRIBUCIÓN DE HALLAZGOS ABIERTOS POR SEVERIDAD', {
    x: PAGE.M, y: 5.5, w: 8, h: 0.24, fontSize: 8, fontFace: F.MONO, color: C.MUTE, charSpacing: 1.2,
  });
  ctx.severityStrip(s, { x: PAGE.M, y: 5.78, w: CW, counts: totalSev });
  ctx.nota(s, {
    x: PAGE.M, y: 6.28, w: CW,
    text: `Total ${suma} hallazgos abiertos con severidad CVSS asignada, sobre ${D.findings.abiertos} abiertos en el grafo. La diferencia corresponde a hallazgos todavía sin puntuación base.`,
  });

  ctx.footer(s);
}

// ════════════════════════════════════════════════════════════════════════════
// INVENTARIO Y GRUPOS DE MANTENIMIENTO
// ════════════════════════════════════════════════════════════════════════════
export function inventarioYGrupos(ctx, D) {
  const s = ctx.slide();
  ctx.head(s, {
    fase: 'Fase 1 · Gestión de activos',
    titulo: 'Inventario y grupos de mantenimiento',
    subtitulo: 'SP 800-40 Rev. 4 recomienda agrupar los activos que comparten características y necesidades de mantenimiento',
    control: 'SP 800-53r4 · CM-8',
  });

  const grupos = [
    {
      nombre: 'Servidores', n: D.inventario.servidores, color: C.NIST,
      incluye: 'Server · Domain Controller · Firewall · Router',
      criterio: 'Alta exposición, ventana de mantenimiento planificada, impacto de indisponibilidad elevado.',
    },
    {
      nombre: 'Puestos de trabajo', n: D.inventario.puestos, color: C.ACCENT,
      incluye: 'Workstation',
      criterio: 'Despliegue masivo, reinicio tolerable, dependencia del usuario final.',
    },
    {
      nombre: 'Sin clasificar', n: D.inventario.sinClasificar, color: C.WARN,
      incluye: 'Tipo no reconocido',
      criterio: 'No se les puede exigir plazo. Requieren reclasificación antes del próximo ciclo.',
    },
  ];

  const gw = (CW - 0.2 * 2) / 3;
  grupos.forEach((g, i) => {
    const x = PAGE.M + i * (gw + 0.2);
    s.addShape(ctx.pres.ShapeType.roundRect, {
      x, y: 1.68, w: gw, h: 2.5,
      fill: { color: C.PANEL }, line: { color: g.n === 0 ? C.RULE : g.color, width: 0.9 }, rectRadius: 0.08,
    });
    s.addShape(ctx.pres.ShapeType.rect, { x, y: 1.68, w: gw, h: 0.055, fill: { color: g.color } });
    s.addText(g.nombre.toUpperCase(), {
      x: x + 0.24, y: 1.87, w: gw - 0.48, h: 0.28,
      fontSize: 10, fontFace: F.MONO, bold: true, color: g.color, charSpacing: 1.2, valign: 'middle',
    });
    s.addText(String(g.n), {
      x: x + 0.22, y: 2.16, w: gw - 0.44, h: 0.7,
      fontSize: 40, fontFace: F.SANS, bold: true, color: g.n === 0 ? C.MUTE : C.TEXT, valign: 'middle',
    });
    s.addText('endpoints', { x: x + 0.24, y: 2.86, w: gw - 0.48, h: 0.22, fontSize: 9, fontFace: F.SANS, color: C.MUTE });
    s.addShape(ctx.pres.ShapeType.rect, { x: x + 0.24, y: 3.16, w: gw - 0.48, h: 0.012, fill: { color: C.RULE } });
    s.addText('TIPOS QUE AGRUPA', {
      x: x + 0.24, y: 3.26, w: gw - 0.48, h: 0.2, fontSize: 7.5, fontFace: F.MONO, color: C.MUTE, charSpacing: 1,
    });
    s.addText(g.incluye, { x: x + 0.24, y: 3.45, w: gw - 0.48, h: 0.28, fontSize: 8.5, fontFace: F.SANS, color: C.TEXT_2 });
    s.addText(g.criterio, {
      x: x + 0.24, y: 3.74, w: gw - 0.48, h: 0.4, fontSize: 8.5, fontFace: F.SANS, color: C.MUTE, lineSpacingMultiple: 1.2,
    });
  });

  s.addText('COMPOSICIÓN DEL INVENTARIO', {
    x: PAGE.M, y: 4.38, w: 6, h: 0.24, fontSize: 8, fontFace: F.MONO, color: C.MUTE, charSpacing: 1.2,
  });
  const inv = [
    ['Endpoints', D.inventario.endpoints], ['Contenedores', D.inventario.contenedores],
    ['Imágenes', D.inventario.imagenes], ['Instalaciones sw', D.inventario.instalaciones],
    ['Productos sw', D.inventario.software], ['Redes', D.inventario.redes], ['Hardware', D.inventario.hardware],
  ];
  const iw = (CW - 0.14 * 6) / 7;
  inv.forEach(([k, v], i) => {
    const x = PAGE.M + i * (iw + 0.14);
    s.addShape(ctx.pres.ShapeType.roundRect, {
      x, y: 4.66, w: iw, h: 0.82, fill: { color: C.PANEL_2 }, line: { color: C.RULE, width: 0.6 }, rectRadius: 0.05,
    });
    s.addText(String(v), {
      x, y: 4.74, w: iw, h: 0.4, fontSize: 19, fontFace: F.SANS, bold: true, color: C.TEXT, align: 'center', valign: 'middle',
    });
    s.addText(k, { x, y: 5.13, w: iw, h: 0.28, fontSize: 8, fontFace: F.SANS, color: C.MUTE, align: 'center', valign: 'top' });
  });

  // Aviso de cobertura, solo si procede
  if (D.inventario.sinClasificar > 0) {
    s.addShape(ctx.pres.ShapeType.roundRect, {
      x: PAGE.M, y: 5.68, w: CW, h: 0.92,
      fill: { color: C.BG_WARN }, line: { color: C.WARN, width: 0.75 }, rectRadius: 0.06,
    });
    s.addText('!', {
      x: PAGE.M + 0.22, y: 5.68, w: 0.35, h: 0.92,
      fontSize: 20, fontFace: F.SANS, bold: true, color: C.WARN, align: 'center', valign: 'middle',
    });
    s.addText(
      [
        { text: `Cobertura de clasificación: ${D.inventario.coberturaClasificacion}% (${D.inventario.servidores + D.inventario.puestos} de ${D.inventario.endpoints} endpoints).  `, options: { bold: true, color: C.WARN } },
        { text: `Los ${D.inventario.sinClasificar} restantes conservan un tipo libre y quedan fuera de la medición de plazos: sus ${D.porGrupo.sinClasificar.total} hallazgos abiertos no computan en ningún SLA. Reclasificarlos es la acción de mayor impacto, porque hasta hacerlo el porcentaje de cumplimiento describe solo a una parte del parque.`, options: { color: C.TEXT_2 } },
      ],
      { x: PAGE.M + 0.68, y: 5.78, w: CW - 0.95, h: 0.75, fontSize: 9.5, fontFace: F.SANS, lineSpacingMultiple: 1.25, valign: 'middle' }
    );
  } else {
    s.addShape(ctx.pres.ShapeType.roundRect, {
      x: PAGE.M, y: 5.68, w: CW, h: 0.92,
      fill: { color: C.BG_OK }, line: { color: C.OK, width: 0.75 }, rectRadius: 0.06,
    });
    s.addText(
      [
        { text: 'Cobertura de clasificación del 100%.  ', options: { bold: true, color: C.OK } },
        { text: 'Todos los endpoints del alcance tienen un tipo válido, así que todos los hallazgos entran en la medición de plazos y el porcentaje de cumplimiento describe al parque completo.', options: { color: C.TEXT_2 } },
      ],
      { x: PAGE.M + 0.26, y: 5.78, w: CW - 0.55, h: 0.75, fontSize: 9.5, fontFace: F.SANS, lineSpacingMultiple: 1.25, valign: 'middle' }
    );
  }

  ctx.footer(s);
}

// ════════════════════════════════════════════════════════════════════════════
// COBERTURA DEL ANÁLISIS Y CALIDAD DEL DATO
// ════════════════════════════════════════════════════════════════════════════
export function coberturaYCalidad(ctx, D) {
  const s = ctx.slide();
  ctx.head(s, {
    fase: 'Fase 1 · Conocimiento de vulnerabilidades',
    titulo: 'Cobertura del análisis y calidad del dato',
    subtitulo: 'Un indicador solo vale lo que vale el dato que lo alimenta: esta lámina declara los límites de los demás',
    control: 'SP 800-53r4 · RA-5',
  });

  const tot = Math.max(D.enriquecimiento.total, 1);
  const estado = (n) => n === 0 ? { t: 'SIN DATO', c: C.BAD } : n >= tot ? { t: 'COMPLETO', c: C.OK } : { t: 'PARCIAL', c: C.WARN };

  const fuentes = [
    { fuente: 'NVD — CVE y CVSS', n: D.vulns.total, cubre: `${D.vulns.total} de ${D.enriquecimiento.total} CVE` },
    { fuente: 'MITRE CAPEC → ATT&CK', n: D.ttp.mapeadas, cubre: `${D.ttp.mapeadas} de ${D.ttp.totalCves} CVE mapeadas` },
    { fuente: 'OSV — parches y versión corregida', n: D.enriquecimiento.parches, cubre: `${D.enriquecimiento.parches} parches registrados` },
  ];

  // Las filas ocupan todo el ancho y la etiqueta de estado va dentro de la fila, alineada a
  // su borde derecho: con la columna lateral la etiqueta asomaba por fuera del recuadro.
  const rowH = 0.62;
  fuentes.forEach((f, i) => {
    const y = 1.78 + i * (rowH + 0.1);
    const e = estado(f.n);
    const p = Math.min(100, Math.round((f.n / tot) * 100));
    s.addShape(ctx.pres.ShapeType.rect, { x: PAGE.M, y, w: CW, h: rowH, fill: { color: i % 2 ? C.PANEL_2 : C.PANEL } });
    s.addText(f.fuente, { x: PAGE.M + 0.25, y, w: 4.6, h: rowH, fontSize: 11, fontFace: F.SANS, color: C.TEXT, valign: 'middle' });
    s.addText(f.cubre, { x: PAGE.M + 5.0, y, w: 3.0, h: rowH, fontSize: 9.5, fontFace: F.MONO, color: C.MUTE, valign: 'middle' });
    ctx.bar(s, { x: PAGE.M + 8.15, y: y + (rowH - 0.14) / 2, w: 2.3, h: 0.14, value: p, max: 100, color: e.c });
    s.addText(e.t, {
      x: PAGE.M + 10.6, y, w: CW - 10.6 - 0.25, h: rowH,
      fontSize: 8.5, fontFace: F.MONO, bold: true, color: e.c, align: 'right', valign: 'middle',
    });
  });

  // Procedencia del mapeo a técnicas
  const totalRel = D.ttp.capec + D.ttp.llm;
  s.addText('PROCEDENCIA DEL MAPEO A TÉCNICAS ADVERSARIAS', {
    x: PAGE.M, y: 4.3, w: 8, h: 0.24, fontSize: 8, fontFace: F.MONO, color: C.MUTE, charSpacing: 1.2,
  });
  const proc = [
    { l: 'Correlación determinista CWE → CAPEC → ATT&CK', n: D.ttp.capec, c: C.OK, tag: 'Confianza alta' },
    { l: 'Inferencia por modelo de lenguaje (Ollama)', n: D.ttp.llm, c: C.WARN, tag: 'Confianza media' },
  ];
  const maxProc = Math.max(D.ttp.capec, D.ttp.llm, 1);
  proc.forEach((p, i) => {
    const y = 4.62 + i * 0.62;
    s.addText(p.l, { x: PAGE.M, y, w: 4.6, h: 0.42, fontSize: 9.5, fontFace: F.SANS, color: C.TEXT_2, valign: 'middle' });
    ctx.bar(s, { x: PAGE.M + 4.7, y: y + 0.13, w: 4.1, h: 0.18, value: p.n, max: maxProc, color: p.c });
    s.addText(`${p.n} relaciones`, {
      x: PAGE.M + 8.95, y, w: 1.5, h: 0.42, fontSize: 9, fontFace: F.MONO, bold: true, color: C.TEXT, valign: 'middle',
    });
    s.addText(p.tag, { x: PAGE.M + 10.5, y, w: 1.6, h: 0.42, fontSize: 8.5, fontFace: F.SANS, color: p.c, valign: 'middle' });
  });

  if (totalRel > 0) {
    const pc = Math.round((D.ttp.capec / totalRel) * 100);
    ctx.nota(s, {
      x: PAGE.M, y: 6.0, w: CW,
      text: `La distinción se conserva en el grafo (propiedad \`source\` de la relación :MAPS_TO): ${pc}% del mapeo procede de correlación determinista y ${100 - pc}% de inferencia, que debe tratarse como indicio y no como evidencia.`,
    });
  }

  ctx.footer(s);
}

// ════════════════════════════════════════════════════════════════════════════
// PANORAMA DE VULNERABILIDADES
// ════════════════════════════════════════════════════════════════════════════
export function panoramaVulnerabilidades(ctx, D) {
  const s = ctx.slide();
  ctx.head(s, {
    fase: 'Fase 2 · Evaluación',
    titulo: 'Panorama de vulnerabilidades',
    subtitulo: 'Distribución por severidad CVSS y reparto entre grupos de mantenimiento',
    control: 'SP 800-53r4 · RA-3',
  });

  // Las dos mitades salen del mismo conjunto —los hallazgos abiertos de los tres grupos más
  // los de activos sin clasificar— y solo cambia la unidad: en el anillo cada CVE cuenta una
  // vez; en las barras, una vez por activo afectado. Antes el anillo contaba todas las CVE del
  // grafo y las barras solo el software del host, y las cifras no podían cuadrar.
  const A = D.abiertas;

  s.addText('SEVERIDAD DE LAS CVE ÚNICAS ABIERTAS', {
    x: PAGE.M, y: 1.66, w: 5.5, h: 0.24, fontSize: 8, fontFace: F.MONO, color: C.MUTE, charSpacing: 1.2,
  });

  if (A.total > 0) {
    // El anillo tiene su propia caja y la leyenda empieza a su derecha: a 3,5 in de ancho el
    // gráfico llegaba hasta la leyenda y los colores se montaban sobre el anillo.
    const dx = PAGE.M, dy = 2.0, dd = 3.1;
    s.addChart(ctx.pres.charts.DOUGHNUT, [{
      name: 'Severidad',
      labels: SEV_ORDER.map(k => SEV_ES[k]),
      values: SEV_ORDER.map(k => A[k]),
    }], {
      x: dx, y: dy, w: dd, h: dd,
      showTitle: false, showLegend: false, showPercent: true, showValue: false,
      dataLabelColor: 'FFFFFF', dataLabelFontSize: 9, dataLabelFontBold: true,
      chartColors: SEV_ORDER.map(k => SEV_COLOR[k]),
      holeSize: 62, plotArea: { fill: { color: C.INK } },
      border: { pt: 0, color: C.INK },
    });
    s.addText(String(A.total), {
      x: dx + dd / 2 - 0.8, y: dy + dd / 2 - 0.34, w: 1.6, h: 0.5,
      fontSize: 24, fontFace: F.SANS, bold: true, color: C.TEXT, align: 'center', valign: 'middle',
    });
    s.addText('CVE únicas', {
      x: dx + dd / 2 - 0.8, y: dy + dd / 2 + 0.12, w: 1.6, h: 0.24, fontSize: 8, fontFace: F.MONO, color: C.MUTE, align: 'center',
    });

    const lx = dx + dd + 0.35;
    SEV_ORDER.forEach((sev, i) => {
      const y = 2.35 + i * 0.62;
      s.addShape(ctx.pres.ShapeType.rect, { x: lx, y: y + 0.06, w: 0.14, h: 0.28, fill: { color: SEV_COLOR[sev] } });
      s.addText(SEV_ES[sev], { x: lx + 0.26, y, w: 1.0, h: 0.4, fontSize: 10.5, fontFace: F.SANS, color: C.TEXT, valign: 'middle' });
      s.addText(String(A[sev]), {
        x: lx + 1.25, y, w: 0.55, h: 0.4, fontSize: 11, fontFace: F.MONO, bold: true, color: SEV_COLOR[sev], align: 'right', valign: 'middle',
      });
      s.addText(`${((A[sev] / A.total) * 100).toFixed(1)}%`, {
        x: lx + 1.82, y, w: 0.7, h: 0.4, fontSize: 9, fontFace: F.MONO, color: C.MUTE, align: 'right', valign: 'middle',
      });
    });
  } else {
    s.addText('No hay vulnerabilidades abiertas en este proyecto.', {
      x: PAGE.M, y: 3.2, w: 6.1, h: 0.6, fontSize: 12, fontFace: F.SANS, italic: true, color: C.MUTE, align: 'center', valign: 'middle',
    });
  }

  s.addText('HALLAZGOS ABIERTOS POR GRUPO DE MANTENIMIENTO', {
    x: 6.95, y: 1.66, w: 5.9, h: 0.24, fontSize: 8, fontFace: F.MONO, color: C.MUTE, charSpacing: 1.2,
  });
  const filas = [
    { g: 'Servidores', d: D.porGrupo.Server },
    { g: 'Puestos de trabajo', d: D.porGrupo.Workstation },
    { g: 'Contenedores', d: D.porGrupo.Container },
    { g: 'Sin clasificar', d: D.porGrupo.sinClasificar },
  ];
  // Cada barra ocupa todo el ancho y muestra el reparto dentro de su grupo (el total va a la
  // derecha). Escaladas al grupo mayor, las de grupos pequeños quedaban en un muñón ilegible.
  const MIN_TRAMO = 0.08;
  const anchosTramos = (d, bw) => {
    const sevs = SEV_ORDER.filter(sev => d[sev] > 0);
    const minimos = sevs.filter(sev => (bw * d[sev]) / d.total < MIN_TRAMO);
    const resto = sevs.filter(sev => !minimos.includes(sev));
    const sumaResto = resto.reduce((a, sev) => a + d[sev], 0);
    const libre = bw - minimos.length * MIN_TRAMO;
    return sevs.map(sev => ({
      sev, n: d[sev], w: minimos.includes(sev) ? MIN_TRAMO : (libre * d[sev]) / sumaResto,
    }));
  };

  filas.forEach((r, i) => {
    const y = 2.0 + i * 0.98;
    s.addText(r.g, { x: 6.95, y, w: 3.2, h: 0.3, fontSize: 11, fontFace: F.SANS, bold: true, color: C.TEXT, valign: 'middle' });
    s.addText(`${r.d.total} hallazgos`, {
      x: 10.5, y, w: 2.3, h: 0.3, fontSize: 10, fontFace: F.MONO, color: r.d.total ? C.TEXT : C.MUTE, align: 'right', valign: 'middle',
    });

    const bw = 5.85;
    if (r.d.total === 0) {
      s.addShape(ctx.pres.ShapeType.rect, { x: 6.95, y: y + 0.36, w: bw, h: 0.3, fill: { color: C.PANEL_2 } });
      s.addText('Sin hallazgos en este grupo', {
        x: 6.95, y: y + 0.36, w: bw, h: 0.3, fontSize: 8.5, fontFace: F.SANS, italic: true, color: C.MUTE,
        align: 'center', valign: 'middle',
      });
    } else {
      let bx = 6.95;
      anchosTramos(r.d, bw).forEach(({ sev, n, w }) => {
        s.addShape(ctx.pres.ShapeType.rect, { x: bx, y: y + 0.36, w, h: 0.3, fill: { color: SEV_COLOR[sev] } });
        if (w > 0.4) {
          s.addText(String(n), {
            x: bx, y: y + 0.36, w, h: 0.3, fontSize: 8.5, fontFace: F.SANS, bold: true, margin: 0,
            color: sev === 'Medium' ? '1A1400' : 'FFFFFF', align: 'center', valign: 'middle',
          });
        }
        bx += w;
      });
    }
    // Leyenda con la cifra de cada severidad: se lee aunque el tramo sea demasiado estrecho para rotularlo.
    s.addText(SEV_ORDER.flatMap((sev, j) => [
      ...(j > 0 ? [{ text: '  ·  ', options: { color: C.MUTE } }] : []),
      { text: `${SEV_ES[sev]} `, options: { color: C.MUTE } },
      { text: String(r.d[sev] || 0), options: { bold: true, color: r.d[sev] ? SEV_COLOR[sev] : C.MUTE } },
    ]), {
      x: 6.95, y: y + 0.7, w: bw, h: 0.22, fontSize: 7.5, fontFace: F.MONO, margin: 0, valign: 'middle',
    });
  });

  // Un hallazgo es una CVE en un activo concreto: las CVE únicas nunca pueden superar a los
  // hallazgos, y la diferencia son las CVE presentes en más de un activo.
  const reparto = filas.filter(r => r.d.total > 0).map(r => `${r.d.total} en ${r.g.toLowerCase()}`).join(', ');
  const notaVulns = A.total === 0
    ? ''
    : A.hallazgos > A.total
      ? `Las ${A.total} CVE únicas abiertas generan ${A.hallazgos} hallazgos (${reparto}). Una CVE presente en varios activos cuenta una vez en el anillo y una vez por activo en las barras, porque cada instancia se remedia por separado.`
      : `Las ${A.total} CVE únicas abiertas corresponden a ${A.hallazgos} hallazgos (${reparto}): cada vulnerabilidad afecta a una única instancia de activo.`;

  if (notaVulns) {
    ctx.nota(s, { x: PAGE.M, y: 5.35, w: 6.1, text: notaVulns });
  }

  ctx.footer(s);
}

// ════════════════════════════════════════════════════════════════════════════
// CUMPLIMIENTO DE SLA
// ════════════════════════════════════════════════════════════════════════════
export function cumplimientoSLA(ctx, D, { etiquetaPeriodo }) {
  const s = ctx.slide();
  ctx.head(s, {
    fase: 'Fase 3 · Ejecución',
    titulo: 'Cumplimiento de los acuerdos de nivel de servicio',
    subtitulo: 'Un acuerdo por grupo: servidores, puestos y contenedores no comparten plazo ni forma de remediar',
    control: 'SP 800-53r4 · SI-2',
  });

  const gap = 0.2;
  const w = (CW - gap * (GRUPOS_SLA.length - 1)) / GRUPOS_SLA.length;
  const top = 1.68;
  const inner = w - 0.48;

  GRUPOS_SLA.forEach((cat, i) => {
    const x = PAGE.M + i * (w + gap);
    const cump = D.cumplimiento[cat];
    const plazos = D.sla[cat] || {};
    const vacio = cump.total === 0;

    s.addShape(ctx.pres.ShapeType.roundRect, {
      x, y: top, w, h: 3.6,
      fill: { color: C.PANEL }, line: { color: C.RULE, width: 0.9 }, rectRadius: 0.08,
    });
    s.addShape(ctx.pres.ShapeType.rect, { x, y: top, w, h: 0.055, fill: { color: CAT_COLOR[cat] } });
    s.addText(`SLA · ${CAT_LABEL[cat].toUpperCase()}`, {
      x: x + 0.24, y: top + 0.18, w: inner, h: 0.3,
      fontSize: 10, fontFace: F.MONO, bold: true, color: CAT_COLOR[cat], charSpacing: 1.3, valign: 'middle',
    });

    s.addText(vacio ? '—' : `${cump.pct.toFixed(1)}%`, {
      x: x + 0.22, y: top + 0.5, w: inner, h: 0.62,
      fontSize: 32, fontFace: F.SANS, bold: true,
      color: vacio ? C.MUTE : cump.pct >= 95 ? C.OK : cump.pct >= 80 ? C.WARN : C.BAD,
      valign: 'middle',
    });
    s.addText(vacio ? 'Sin hallazgos que medir' : `${cump.enPlazo} de ${cump.total} hallazgos en plazo`, {
      x: x + 0.24, y: top + 1.12, w: inner, h: 0.24, fontSize: 9, fontFace: F.SANS, color: C.MUTE, valign: 'middle',
    });

    // Los tres estados en fila bajo el porcentaje: con tres tarjetas ya no caben a su lado.
    const estados = [
      { t: 'En plazo', n: cump.enPlazo - cump.porVencer, c: C.OK },
      { t: 'Por vencer', n: cump.porVencer, c: C.WARN },
      { t: 'Incumplidos', n: cump.incumplidos, c: C.BAD },
    ];
    const ew = inner / 3;
    estados.forEach((e, j) => {
      const ex = x + 0.24 + j * ew;
      s.addText(String(e.n), {
        x: ex, y: top + 1.44, w: ew, h: 0.38, fontSize: 17, fontFace: F.SANS, bold: true,
        color: e.n > 0 ? e.c : C.MUTE, align: 'center', valign: 'middle',
      });
      s.addText(e.t, { x: ex, y: top + 1.82, w: ew, h: 0.22, fontSize: 8, fontFace: F.SANS, color: C.MUTE, align: 'center' });
      s.addShape(ctx.pres.ShapeType.rect, { x: ex + ew * 0.25, y: top + 2.06, w: ew * 0.5, h: 0.05, fill: { color: e.n > 0 ? e.c : C.RULE } });
    });

    s.addShape(ctx.pres.ShapeType.rect, { x: x + 0.24, y: top + 2.22, w: inner, h: 0.012, fill: { color: C.RULE } });
    s.addText('PLAZO MÁXIMO DESDE LA DETECCIÓN', {
      x: x + 0.24, y: top + 2.3, w: inner, h: 0.22, fontSize: 7.5, fontFace: F.MONO, color: C.MUTE, charSpacing: 1,
    });
    const tw = inner / 4;
    SEV_ORDER.forEach((sev, j) => {
      const px = x + 0.24 + j * tw;
      const pw = tw - 0.08;
      const py = top + 2.56;
      s.addShape(ctx.pres.ShapeType.roundRect, {
        x: px, y: py, w: pw, h: 0.92, fill: { color: C.PANEL_2 }, line: { color: C.RULE, width: 0.6 }, rectRadius: 0.05,
      });
      s.addShape(ctx.pres.ShapeType.rect, { x: px, y: py, w: pw, h: 0.05, fill: { color: SEV_COLOR[sev] } });
      s.addText(SEV_ES[sev], {
        x: px, y: py + 0.08, w: pw, h: 0.22, fontSize: 8, fontFace: F.SANS, color: SEV_COLOR[sev], align: 'center', valign: 'middle',
      });
      s.addText(plazos[sev] !== undefined ? String(plazos[sev]) : '—', {
        x: px, y: py + 0.28, w: pw, h: 0.4, fontSize: 19, fontFace: F.SANS, bold: true, color: C.TEXT, align: 'center', valign: 'middle',
      });
      s.addText('días', { x: px, y: py + 0.66, w: pw, h: 0.2, fontSize: 7.5, fontFace: F.MONO, color: C.MUTE, align: 'center' });
    });
  });

  // Lectura del dato, redactada según la situación real y sobre los tres grupos a la vez
  const T = GRUPOS_SLA.reduce((acc, cat) => {
    const c = D.cumplimiento[cat];
    acc.total += c.total; acc.enPlazo += c.enPlazo; acc.porVencer += c.porVencer; acc.incumplidos += c.incumplidos;
    return acc;
  }, { total: 0, enPlazo: 0, porVencer: 0, incumplidos: 0 });
  const pctTotal = T.total === 0 ? 100 : Math.round((T.enPlazo / T.total) * 1000) / 10;
  const hayContenedores = D.cumplimiento.Container.total > 0;

  // Plazo más corto entre los grupos que tienen hallazgos, leído de la configuración real.
  const plazosConDatos = GRUPOS_SLA
    .filter(cat => D.cumplimiento[cat].total > 0)
    .flatMap(cat => SEV_ORDER
      .filter(sev => Number(D.sla[cat]?.[sev]) > 0)
      .map(sev => ({ cat, sev, dias: Number(D.sla[cat][sev]) })));
  const minimo = plazosConDatos.reduce((m, p) => (!m || p.dias < m.dias ? p : m), null);
  const minimoDe = (cat) => Math.min(...SEV_ORDER.map(sev => Number(D.sla[cat]?.[sev]) || Infinity));
  const contenedoresMasCortos = hayContenedores
    && GRUPOS_SLA.filter(cat => cat !== 'Container').every(cat => minimoDe('Container') < minimoDe(cat));
  // Con todo el backlog en su primera semana y ningún plazo de 7 días o menos, nada ha podido vencer.
  const soloRecientes = D.aging['8 — 30 días'] === 0 && D.aging['31 — 90 días'] === 0 && D.aging['> 90 días'] === 0;
  const sinVencimientos = T.incumplidos === 0 && (!minimo || (soloRecientes && minimo.dias > 7));

  const runs = [];
  if (T.total === 0) {
    runs.push({ text: 'No hay hallazgos medibles en ningún grupo. ', options: { bold: true, color: C.TEXT } });
    runs.push({ text: 'Los acuerdos están definidos pero todavía no se aplican a ningún activo con tipo válido.', options: { color: C.TEXT_2 } });
  } else if (sinVencimientos) {
    runs.push({ text: `El cumplimiento global es del ${pctTotal.toFixed(1)}% porque todos los hallazgos se detectaron hace menos que el plazo más corto y ninguno ha podido agotarlo aún. `, options: { color: C.TEXT_2 } });
    runs.push({ text: 'Todavía no mide capacidad de remediación.', options: { bold: true, color: C.TEXT } });
    if (minimo) {
      runs.push({
        text: ` El primer dato con valor llegará cuando venza el plazo más corto: ${minimo.dias} días, el de las ${SEV_ES[minimo.sev].toLowerCase()}s en ${CAT_LABEL[minimo.cat].toLowerCase()}.`,
        options: { color: C.TEXT_2 },
      });
    }
  } else if (T.incumplidos === 0 && T.porVencer > 0) {
    runs.push({ text: `El cumplimiento global es del ${pctTotal.toFixed(1)}% y ningún hallazgo ha superado su plazo`, options: { bold: true, color: C.OK } });
    runs.push({ text: `, pero ${T.porVencer} ${T.porVencer === 1 ? 'está' : 'están'} en el último quinto de su ventana y ${T.porVencer === 1 ? 'es el primer candidato' : 'son los primeros candidatos'} a incumplir.`, options: { color: C.TEXT_2 } });
  } else if (T.incumplidos === 0) {
    runs.push({ text: `El cumplimiento global es del ${pctTotal.toFixed(1)}% y ningún hallazgo ha superado su plazo`, options: { bold: true, color: C.OK } });
    runs.push({ text: ', y ninguno está todavía en el último quinto de su ventana: no hay vencimientos inminentes.', options: { color: C.TEXT_2 } });
  } else {
    const detalle = GRUPOS_SLA
      .filter(cat => D.cumplimiento[cat].incumplidos > 0)
      .map(cat => `${D.cumplimiento[cat].incumplidos} en ${CAT_LABEL[cat].toLowerCase()}`)
      .join(', ');
    runs.push({ text: `${T.incumplidos} hallazgos han superado su plazo (${detalle})`, options: { bold: true, color: C.CRIT } });
    runs.push({ text: ` y ${T.porVencer} están en el último quinto de su ventana. Según PROC-06, el vencimiento dispara escalado a Responsable de Infraestructura, y a los 15 días al CISO para aceptación formal del riesgo o priorización forzada.`, options: { color: C.TEXT_2 } });
  }
  if (hayContenedores) {
    runs.push({
      text: contenedoresMasCortos ? '\nLos contenedores tienen el plazo más corto' : '\nLos contenedores se remedian de otra forma',
      options: { bold: true, color: CAT_COLOR.Container },
    });
    runs.push({
      text: contenedoresMasCortos
        ? ' porque no se parchean en ejecución: se reconstruye la imagen sobre una base corregida y se redespliega (NIST SP 800-190), sin ventana de mantenimiento del host.'
        : ': no se parchean en ejecución, se reconstruye la imagen sobre una base corregida y se redespliega (NIST SP 800-190), sin ventana de mantenimiento del host.',
      options: { color: C.TEXT_2 },
    });
  }
  if (D.sinSLA > 0) {
    runs.push({ text: `\n${D.sinSLA} hallazgos quedan fuera de los acuerdos`, options: { bold: true, color: C.WARN } });
    runs.push({ text: ': afectan a activos sin tipo reconocido, así que no se les puede exigir plazo y no computan en ningún porcentaje.', options: { color: C.TEXT_2 } });
  }

  ctx.callout(s, { x: PAGE.M, y: 5.42, w: CW, h: 1.42, titulo: `Cómo leer estas cifras · ${etiquetaPeriodo}`, runs });
  ctx.footer(s);
}

// ════════════════════════════════════════════════════════════════════════════
// COLA DE REMEDIACIÓN
// ════════════════════════════════════════════════════════════════════════════
export function colaRemediacion(ctx, D) {
  const s = ctx.slide();
  ctx.head(s, {
    fase: 'Fase 3 · Ejecución',
    titulo: 'Cola de remediación priorizada',
    subtitulo: 'Software del host, por prioridad operativa: riesgo técnico × criticidad del activo × urgencia',
    control: 'SP 800-53r4 · SI-2',
  });

  if (D.cola.length === 0) {
    ctx.vacio(s, 'No hay hallazgos del software del host pendientes de remediación.');
    ctx.footer(s);
    return;
  }

  // Los contenedores tienen su propia lámina: aquí solo el software instalado en el host.
  const filas = D.cola.slice(0, FILAS_COLA);
  const header = [
    ctx.th('#', { align: 'center' }), ctx.th('CVE'), ctx.th('PRIORIDAD', { align: 'center' }),
    ctx.th('TIER', { align: 'center' }), ctx.th('SOFTWARE'), ctx.th('VERSIÓN', { align: 'center' }),
    ctx.th('ACTIVO'), ctx.th('CORRIGE EN', { align: 'center' }), ctx.th('PARCHE', { align: 'center' }),
  ];

  const tierColor = { CRITICAL: C.CRIT, HIGH: C.HIGH, MEDIUM: C.MED, LOW: C.LOW };
  const rows = filas.map((r, i) => {
    const bg = i % 2 === 0 ? C.PANEL : C.PANEL_2;
    const tc = tierColor[r.tier] || C.LOW;
    return [
      ctx.td(String(i + 1), { align: 'center', color: C.MUTE, mono: true, fill: bg }),
      ctx.td(r.cve, { color: C.TEXT, bold: true, mono: true, fill: bg }),
      ctx.td(r.prio.toFixed(3), { align: 'center', color: C.TEXT, bold: true, mono: true, fill: bg }),
      ctx.td(r.tier, { align: 'center', color: tc, bold: true, fill: bg }),
      ctx.td(r.sw, { color: C.TEXT_2, fill: bg }),
      ctx.td(r.version, { align: 'center', color: C.MUTE, mono: true, fill: bg }),
      ctx.td(r.host, { color: C.TEXT_2, mono: true, fill: bg }),
      ctx.td(r.fix || '—', { align: 'center', color: r.fix ? C.OK : C.MUTE, mono: true, fill: bg }),
      ctx.td(r.parche ? 'Sí' : 'No', { align: 'center', color: r.parche ? C.OK : C.MUTE, bold: true, fill: bg }),
    ];
  });

  s.addTable([header, ...rows], {
    x: PAGE.M, y: 1.7, w: CW,
    colW: [0.42, 1.62, 1.05, 1.0, 1.62, 1.0, 2.3, 1.3, 0.72].map(v => v * (CW / 11.03)),
    rowH: 0.345,
    border: { type: 'solid', pt: 0.4, color: C.RULE },
    autoPage: false,
  });

  // Concentración: cuántos activos y productos acumulan la cabecera de la cola
  const hosts = [...new Set(filas.map(r => r.host))];
  const sws = [...new Set(filas.map(r => r.sw))];
  const sinParche = filas.filter(r => !r.parche).length;

  const y = 1.7 + (filas.length + 1) * 0.345 + 0.25;
  ctx.callout(s, {
    x: PAGE.M, y, w: CW, h: 0.95, titulo: null,
    runs: [
      { text: 'Concentración: ', options: { bold: true, color: C.ACCENT } },
      { text: `las ${filas.length} entradas de mayor prioridad${D.colaTotal > filas.length ? ` de ${D.colaTotal}` : ''} se reparten entre ${hosts.length} ${hosts.length === 1 ? 'activo' : 'activos'} y ${sws.length} ${sws.length === 1 ? 'producto' : 'productos'}. `, options: { color: C.TEXT_2 } },
      { text: sinParche > 0
          ? `${sinParche} de ellas no tienen parche disponible todavía: no son accionables y procede valorar mitigación o aceptación temporal en vez de dejarlas envejecer en la cola.`
          : 'Todas tienen parche disponible, así que la cola es enteramente accionable en la próxima ventana de mantenimiento.',
        options: { color: C.TEXT_2 } },
    ],
  });

  ctx.footer(s);
}

// ════════════════════════════════════════════════════════════════════════════
// COLA DE REMEDIACIÓN · CONTENEDORES
// ════════════════════════════════════════════════════════════════════════════
export function colaContenedores(ctx, D) {
  const s = ctx.slide();
  ctx.head(s, {
    fase: 'Fase 3 · Ejecución',
    titulo: 'Cola de remediación · contenedores',
    subtitulo: 'Imágenes y software empaquetado en ellas: se corrigen reconstruyendo la imagen, no parcheando',
    control: 'SP 800-53r4 · SI-2 · CM-3',
  });

  if (D.colaContenedores.length === 0) {
    ctx.vacio(s, 'No hay hallazgos en contenedores pendientes de remediación.');
    ctx.footer(s);
    return;
  }

  const filas = D.colaContenedores.slice(0, FILAS_COLA);
  const header = [
    ctx.th('#', { align: 'center' }), ctx.th('CVE'), ctx.th('PRIORIDAD', { align: 'center' }),
    ctx.th('TIER', { align: 'center' }), ctx.th('COMPONENTE'), ctx.th('ORIGEN', { align: 'center' }),
    ctx.th('CONTENEDOR'), ctx.th('HOST'), ctx.th('PARCHE', { align: 'center' }),
  ];

  const tierColor = { CRITICAL: C.CRIT, HIGH: C.HIGH, MEDIUM: C.MED, LOW: C.LOW };
  const conVersion = (r) => (r.version && r.version !== '—' && r.version !== 'N/A' ? `${r.sw} ${r.version}` : r.sw);
  const rows = filas.map((r, i) => {
    const bg = i % 2 === 0 ? C.PANEL : C.PANEL_2;
    return [
      ctx.td(String(i + 1), { align: 'center', color: C.MUTE, mono: true, fill: bg }),
      ctx.td(r.cve, { color: C.TEXT, bold: true, mono: true, fill: bg }),
      ctx.td(r.prio.toFixed(3), { align: 'center', color: C.TEXT, bold: true, mono: true, fill: bg }),
      ctx.td(r.tier, { align: 'center', color: tierColor[r.tier] || C.LOW, bold: true, fill: bg }),
      ctx.td(conVersion(r), { color: C.TEXT_2, fill: bg }),
      ctx.td(r.imagen ? 'Imagen' : 'Software', { align: 'center', color: r.imagen ? CAT_COLOR.Container : C.TEXT_2, fill: bg }),
      ctx.td(r.contenedor, { color: C.TEXT_2, mono: true, fill: bg }),
      ctx.td(r.host, { color: C.MUTE, mono: true, fill: bg }),
      ctx.td(r.parche ? 'Sí' : 'No', { align: 'center', color: r.parche ? C.OK : C.MUTE, bold: true, fill: bg }),
    ];
  });

  s.addTable([header, ...rows], {
    x: PAGE.M, y: 1.7, w: CW,
    colW: [0.42, 1.62, 1.0, 0.95, 2.0, 0.95, 1.7, 1.5, 0.75].map(v => v * (CW / 10.89)),
    rowH: 0.345,
    border: { type: 'solid', pt: 0.4, color: C.RULE },
    autoPage: false,
  });

  const contenedores = new Set(filas.map(r => r.contenedor)).size;
  const deImagen = filas.filter(r => r.imagen).length;
  const sinParche = filas.filter(r => !r.parche).length;

  const y = 1.7 + (filas.length + 1) * 0.345 + 0.25;
  ctx.callout(s, {
    x: PAGE.M, y, w: CW, h: 0.95, titulo: null, color: CAT_COLOR.Container,
    runs: [
      { text: 'Remediación por reconstrucción: ', options: { bold: true, color: CAT_COLOR.Container } },
      { text: `las ${filas.length} entradas de mayor prioridad${D.colaContenedoresTotal > filas.length ? ` de ${D.colaContenedoresTotal}` : ''} afectan a ${contenedores} ${contenedores === 1 ? 'contenedor' : 'contenedores'}; ${deImagen} vienen de la imagen base y ${filas.length - deImagen} del software empaquetado en ella. `, options: { color: C.TEXT_2 } },
      { text: 'Actualizar el paquete dentro del contenedor en marcha no sirve: el cambio se pierde al recrearlo, así que la corrección va al Dockerfile o a la imagen base. ', options: { color: C.TEXT_2 } },
      { text: sinParche > 0
          ? `${sinParche} no tienen versión corregida publicada: procede valorar otra imagen base o una aceptación temporal.`
          : 'Todas tienen versión corregida publicada.',
        options: { color: C.TEXT_2 } },
    ],
  });

  ctx.footer(s);
}

// ════════════════════════════════════════════════════════════════════════════
// ENVEJECIMIENTO DEL BACKLOG
// ════════════════════════════════════════════════════════════════════════════
export function envejecimiento(ctx, D) {
  const s = ctx.slide();
  ctx.head(s, {
    fase: 'Fase 3 · Ejecución',
    titulo: 'Envejecimiento del backlog',
    subtitulo: 'Cuánto tiempo llevan abiertos los hallazgos pendientes: el indicador que delata deuda acumulada',
    control: 'SP 800-53r4 · SI-2 · PM-4',
  });

  const buckets = [
    { k: '0 — 7 días', c: C.LOW }, { k: '8 — 30 días', c: C.MED },
    { k: '31 — 90 días', c: C.HIGH }, { k: '> 90 días', c: C.CRIT },
  ];
  const max = Math.max(...buckets.map(b => D.aging[b.k]), 1);

  buckets.forEach((b, i) => {
    const y = 1.85 + i * 0.86;
    const n = D.aging[b.k];
    s.addText(b.k, { x: PAGE.M, y, w: 1.9, h: 0.5, fontSize: 12, fontFace: F.SANS, bold: true, color: C.TEXT, valign: 'middle' });
    ctx.bar(s, { x: PAGE.M + 2.0, y: y + 0.08, w: 7.4, h: 0.36, value: n, max, color: b.c });
    s.addText(String(n), {
      x: PAGE.M + 9.5, y, w: 0.9, h: 0.5, fontSize: 14, fontFace: F.MONO, bold: true,
      color: n > 0 ? C.TEXT : C.MUTE, align: 'right', valign: 'middle',
    });
    s.addText('hallazgos', { x: PAGE.M + 10.45, y, w: 1.3, h: 0.5, fontSize: 9, fontFace: F.SANS, color: C.MUTE, valign: 'middle' });
  });

  const medios = D.aging['8 — 30 días'];
  const viejos = D.aging['31 — 90 días'] + D.aging['> 90 días'];
  const abiertosConFecha = Object.values(D.aging).reduce((a, n) => a + n, 0);
  const limpio = viejos === 0 && medios === 0;
  const { cerrados, total } = D.findings;
  const cierres = cerrados === 0
    ? `ninguno de los ${total} hallazgos figura todavía como remediado`
    : `${cerrados} de ${total} hallazgos figuran como remediados`;

  let runs;
  if (abiertosConFecha === 0) {
    runs = [
      { text: 'Sin backlog que medir. ', options: { bold: true, color: C.OK } },
      { text: `No hay hallazgos abiertos con fecha de detección registrada; ${cierres}.`, options: { color: C.TEXT_2 } },
    ];
  } else if (limpio) {
    runs = [
      { text: 'Sin deuda acumulada. ', options: { bold: true, color: C.OK } },
      { text: `Todos los hallazgos abiertos con fecha de detección registrada caen en la franja de 0 a 7 días. Conviene leerlo con cuidado: ${cierres}, así que la franja baja refleja un inventario reciente más que una capacidad de cierre demostrada.`, options: { color: C.TEXT_2 } },
    ];
  } else if (viejos === 0) {
    runs = [
      { text: `${medios} ${medios === 1 ? 'hallazgo lleva' : 'hallazgos llevan'} entre 8 y 30 días abiertos`, options: { bold: true, color: C.WARN } },
      { text: ` y ninguno supera los 30: todavía no hay deuda antigua, pero el backlog ya no es solo inventario reciente. Como ${cierres}, esta franja es la que hay que vigilar para que no pase a la siguiente.`, options: { color: C.TEXT_2 } },
    ];
  } else {
    runs = [
      { text: `${viejos} ${viejos === 1 ? 'hallazgo lleva' : 'hallazgos llevan'} más de 30 días abiertos`, options: { bold: true, color: C.WARN } },
      { text: `, de los cuales ${D.aging['> 90 días']} superan los 90. Un hallazgo que envejece por encima de su plazo deja de ser una tarea pendiente y pasa a ser riesgo aceptado de facto, pero sin la decisión formal que lo respalde. Procede o priorizarlos o registrar la aceptación con caducidad según PROC-05.`, options: { color: C.TEXT_2 } },
    ];
  }

  ctx.callout(s, {
    x: PAGE.M, y: 5.5, w: CW, h: 1.1, titulo: null,
    color: limpio ? C.OK : C.WARN, fill: limpio ? C.BG_OK : C.PANEL, borde: limpio ? C.OK : C.WARN,
    runs,
  });

  if (D.findings.sinFechaDeteccion > 0) {
    ctx.nota(s, {
      x: PAGE.M, y: 6.68, w: CW,
      text: `${D.findings.sinFechaDeteccion} hallazgos abiertos no tienen fecha de detección y quedan fuera de este reparto.`,
    });
  }

  ctx.footer(s);
}

// ════════════════════════════════════════════════════════════════════════════
// INTELIGENCIA DE AMENAZAS
// ════════════════════════════════════════════════════════════════════════════
export function inteligenciaAmenazas(ctx, D) {
  const s = ctx.slide();
  ctx.head(s, {
    fase: 'Fase 4 · Monitorización',
    titulo: 'Inteligencia de amenazas',
    subtitulo: 'Traducción de las vulnerabilidades del inventario a técnicas adversarias de MITRE ATT&CK',
    control: 'SP 800-53r4 · SI-5 · RA-3',
  });

  const cobertura = D.ttp.totalCves > 0 ? Math.round((D.ttp.mapeadas / D.ttp.totalCves) * 100) : 0;
  // A todo el ancho: repartidas en la mitad izquierda, etiqueta y subtítulo partían en dos
  // líneas y se salían de la tarjeta. Encima del panel del actor no hay nada.
  const kw = (CW - 0.18 * 2) / 3;
  [
    { label: 'CVE analizadas', value: D.ttp.totalCves, sub: 'Del alcance del proyecto', accent: C.ACCENT, color: C.TEXT },
    { label: 'Mapeadas a TTP', value: D.ttp.mapeadas, sub: `${cobertura}% de cobertura`, accent: cobertura >= 90 ? C.OK : C.WARN, color: cobertura >= 90 ? C.OK : C.WARN },
    { label: 'Técnicas distintas', value: D.ttp.tecnicasDistintas, sub: 'Detectadas en el inventario', accent: C.NIST, color: C.TEXT },
  ].forEach((k, i) => ctx.kpi(s, { ...k, x: PAGE.M + i * (kw + 0.18), y: 1.7, w: kw, h: 1.2 }));

  s.addText('TÉCNICAS MÁS FRECUENTES EN EL INVENTARIO', {
    x: PAGE.M, y: 3.05, w: 5.9, h: 0.24, fontSize: 8, fontFace: F.MONO, color: C.MUTE, charSpacing: 1.2,
  });

  if (D.ttp.top.length > 0) {
    const maxT = D.ttp.top[0].n || 1;
    D.ttp.top.forEach((t, i) => {
      const y = 3.35 + i * 0.44;
      s.addText(t.id, { x: PAGE.M, y, w: 0.95, h: 0.36, fontSize: 8.5, fontFace: F.MONO, color: C.ACCENT, valign: 'middle' });
      s.addText(t.name, { x: PAGE.M + 1.0, y, w: 2.35, h: 0.36, fontSize: 9, fontFace: F.SANS, color: C.TEXT_2, valign: 'middle' });
      ctx.bar(s, { x: PAGE.M + 3.45, y: y + 0.1, w: 1.9, h: 0.17, value: t.n, max: maxT, color: C.ACCENT });
      s.addText(String(t.n), {
        x: PAGE.M + 5.42, y, w: 0.5, h: 0.36, fontSize: 8.5, fontFace: F.MONO, bold: true, color: C.TEXT, align: 'right', valign: 'middle',
      });
    });
  } else {
    s.addText('Sin datos de frecuencia de técnicas.', {
      x: PAGE.M, y: 3.4, w: 5.9, h: 0.4, fontSize: 10, fontFace: F.SANS, italic: true, color: C.MUTE,
    });
  }

  // Actor principal
  const a = D.apts[0];
  s.addShape(ctx.pres.ShapeType.roundRect, {
    x: 6.9, y: 3.05, w: 5.88, h: 3.5,
    fill: { color: C.PANEL }, line: { color: C.RULE, width: 0.9 }, rectRadius: 0.08,
  });
  s.addText('ACTOR CON MAYOR SOLAPAMIENTO', {
    x: 7.15, y: 3.26, w: 5.4, h: 0.25, fontSize: 8.5, fontFace: F.MONO, bold: true, color: C.ACCENT, charSpacing: 1.3,
  });

  if (a) {
    s.addText(a.nombre, { x: 7.15, y: 3.55, w: 3.4, h: 0.55, fontSize: 26, fontFace: F.SANS, bold: true, color: C.TEXT, valign: 'middle' });
    s.addText(a.id, { x: 7.15, y: 4.1, w: 3.4, h: 0.26, fontSize: 10, fontFace: F.MONO, color: C.MUTE });
    s.addText(`${a.pct}%`, {
      x: 10.6, y: 3.55, w: 1.95, h: 0.55, fontSize: 26, fontFace: F.SANS, bold: true, color: C.HIGH, align: 'right', valign: 'middle',
    });
    s.addText('de solapamiento', { x: 10.6, y: 4.1, w: 1.95, h: 0.26, fontSize: 8.5, fontFace: F.SANS, color: C.MUTE, align: 'right' });
    ctx.bar(s, { x: 7.15, y: 4.5, w: 5.4, h: 0.22, value: a.pct, max: 100, color: C.HIGH });
    s.addText(`${a.n} de las ${a.totalInfra} técnicas presentes en la infraestructura figuran en el repertorio documentado de este actor.`, {
      x: 7.15, y: 4.85, w: 5.4, h: 0.5, fontSize: 9, fontFace: F.SANS, color: C.TEXT_2, lineSpacingMultiple: 1.25,
    });
    s.addShape(ctx.pres.ShapeType.rect, { x: 7.15, y: 5.42, w: 5.4, h: 0.012, fill: { color: C.RULE } });
    s.addText(
      'Un solapamiento alto no implica que este actor esté interesado en la organización. Indica que las técnicas que habilitan las vulnerabilidades del inventario coinciden con las que ese grupo emplea, y por tanto que sus informes públicos son una fuente útil para priorizar detecciones.',
      { x: 7.15, y: 5.56, w: 5.4, h: 0.85, fontSize: 8.5, fontFace: F.SANS, italic: true, color: C.MUTE, lineSpacingMultiple: 1.25 }
    );
  } else {
    s.addText('Sin correlación de actores disponible. Requiere que el catálogo MITRE ATT&CK esté sincronizado.', {
      x: 7.15, y: 3.7, w: 5.4, h: 0.8, fontSize: 10, fontFace: F.SANS, italic: true, color: C.MUTE, lineSpacingMultiple: 1.3,
    });
  }

  ctx.footer(s);
}

// ════════════════════════════════════════════════════════════════════════════
// ACTORES DE AMENAZA
// ════════════════════════════════════════════════════════════════════════════
export function actoresAmenaza(ctx, D) {
  const s = ctx.slide();
  ctx.head(s, {
    fase: 'Fase 4 · Monitorización',
    titulo: 'Actores de amenaza correlacionados',
    subtitulo: 'Grupos cuyo repertorio documentado de técnicas coincide con el de la infraestructura auditada',
    control: 'SP 800-53r4 · SI-5',
  });

  if (D.apts.length === 0) {
    ctx.vacio(s, 'Sin correlación de actores disponible. Requiere que el catálogo MITRE ATT&CK esté sincronizado en el grafo.');
    ctx.footer(s);
    return;
  }

  const maxPct = D.apts[0].pct || 1;
  // Una sola línea y por debajo de la regla de la cabecera (1,46 in); antes partía en dos y la tocaba.
  s.addText('TÉCNICAS COMPARTIDAS · % SOBRE LAS DE LA INFRAESTRUCTURA', {
    x: PAGE.M + 3.45, y: 1.6, w: 4.6, h: 0.2, fontSize: 7, fontFace: F.MONO, color: C.MUTE, charSpacing: 1,
    margin: 0, valign: 'middle', wrap: false,
  });

  D.apts.forEach((a, i) => {
    const y = 1.86 + i * 0.475;
    const bg = i % 2 === 0 ? C.PANEL : C.INK;
    s.addShape(ctx.pres.ShapeType.rect, { x: PAGE.M, y, w: 8.05, h: 0.42, fill: { color: bg } });
    // 0,44 in de ancho: a menos, el puesto «10» partía en dos líneas.
    s.addText(String(i + 1), {
      x: PAGE.M + 0.02, y, w: 0.44, h: 0.42,
      fontSize: 9, fontFace: F.MONO, color: i < 3 ? C.ACCENT : C.MUTE, align: 'center', valign: 'middle',
    });
    s.addText(a.id, { x: PAGE.M + 0.52, y, w: 0.75, h: 0.42, fontSize: 8.5, fontFace: F.MONO, color: C.MUTE, valign: 'middle' });
    s.addText(a.nombre, {
      x: PAGE.M + 1.3, y, w: 2.05, h: 0.42, fontSize: 10.5, fontFace: F.SANS, bold: i < 3, color: C.TEXT, valign: 'middle',
    });
    ctx.bar(s, {
      x: PAGE.M + 3.45, y: y + 0.13, w: 2.65, h: 0.17, value: a.pct, max: maxPct,
      color: i === 0 ? C.HIGH : i < 3 ? C.ACCENT : '4A4E6B',
    });
    s.addText(`${Number(a.pct).toFixed(2)}%`, {
      x: PAGE.M + 6.15, y, w: 0.85, h: 0.42, fontSize: 9.5, fontFace: F.MONO, bold: true, color: C.TEXT, align: 'right', valign: 'middle',
    });
    // Alineado a la derecha y dentro de la franja (8,05 in): antes se salía por el borde.
    s.addText(`${a.n} de ${a.totalInfra}`, {
      x: PAGE.M + 7.05, y, w: 0.95, h: 0.42, fontSize: 8, fontFace: F.MONO, color: C.MUTE, align: 'right', valign: 'middle',
    });
  });

  s.addShape(ctx.pres.ShapeType.roundRect, {
    x: 8.85, y: 1.86, w: 3.93, h: 2.5,
    fill: { color: C.PANEL }, line: { color: C.NIST, width: 0.9 }, rectRadius: 0.08,
  });
  s.addText('CÓMO SE INTERPRETA', {
    x: 9.1, y: 2.04, w: 3.5, h: 0.25, fontSize: 8.5, fontFace: F.MONO, bold: true, color: C.NIST, charSpacing: 1.3,
  });
  s.addText(
    'El solapamiento no es atribución. Ninguno de estos grupos ha sido observado contra la organización: la lista dice que las técnicas habilitadas por las vulnerabilidades del inventario coinciden con las que estos actores emplean según MITRE.\n\nSu utilidad es de priorización defensiva: los informes públicos de los primeros describen procedimientos concretos sobre esas mismas técnicas, y sirven para redactar reglas de detección con un objetivo realista.',
    { x: 9.1, y: 2.36, w: 3.5, h: 1.9, fontSize: 8.5, fontFace: F.SANS, color: C.TEXT_2, lineSpacingMultiple: 1.3 }
  );

  const lider = D.apts[0];
  s.addShape(ctx.pres.ShapeType.roundRect, {
    x: 8.85, y: 4.5, w: 3.93, h: 2.06,
    fill: { color: C.PANEL }, line: { color: C.RULE, width: 0.75 }, rectRadius: 0.08,
  });
  s.addText(`COINCIDENCIAS DE MAYOR PESO — ${lider.nombre.toUpperCase()}`, {
    x: 9.1, y: 4.66, w: 3.5, h: 0.4,
    fontSize: 8, fontFace: F.MONO, bold: true, color: C.ACCENT, charSpacing: 1.1, lineSpacingMultiple: 1.2,
  });
  (lider.tecnicas.length ? lider.tecnicas : ['Sin detalle de técnicas']).slice(0, 5).forEach((t, i) => {
    const y = 5.08 + i * 0.29;
    s.addShape(ctx.pres.ShapeType.rect, { x: 9.1, y: y + 0.1, w: 0.06, h: 0.06, fill: { color: C.ACCENT } });
    s.addText(t, { x: 9.28, y, w: 3.3, h: 0.26, fontSize: 8.5, fontFace: F.SANS, color: C.TEXT_2, valign: 'middle' });
  });

  ctx.footer(s);
}

// ════════════════════════════════════════════════════════════════════════════
// VENCIMIENTOS PRÓXIMOS  (solo semanal)
// ════════════════════════════════════════════════════════════════════════════
export function vencimientosProximos(ctx, D) {
  const s = ctx.slide();
  ctx.head(s, {
    fase: 'Fase 3 · Ejecución',
    titulo: 'Vencimientos en los próximos 7 días',
    subtitulo: 'Lo que hay que cerrar esta semana para no incumplir el acuerdo',
    control: 'SP 800-53r4 · SI-2',
  });

  const incumplidos = D.incumplidos;

  if (D.vencenPronto.length === 0 && incumplidos === 0) {
    s.addShape(ctx.pres.ShapeType.roundRect, {
      x: PAGE.M, y: 2.6, w: CW, h: 1.6,
      fill: { color: C.BG_OK }, line: { color: C.OK, width: 0.9 }, rectRadius: 0.1,
    });
    s.addText('Ningún vencimiento en los próximos 7 días', {
      x: PAGE.M, y: 2.9, w: CW, h: 0.5, fontSize: 20, fontFace: F.SANS, bold: true, color: C.OK, align: 'center', valign: 'middle',
    });
    s.addText('Ningún hallazgo agota su plazo dentro de la ventana, y no hay compromisos ya vencidos.',
      { x: PAGE.M, y: 3.42, w: CW, h: 0.5, fontSize: 11, fontFace: F.SANS, color: C.TEXT_2, align: 'center', valign: 'middle' });
    ctx.footer(s);
    return;
  }

  // Tope de filas: con más, la nota de lectura se montaba sobre las últimas. Las que no caben
  // se cuentan en la nota y están completas en la pestaña de SLA y en la hoja Excel.
  const filas = D.vencenPronto.slice(0, FILAS_COLA);
  const restantes = D.vencenPronto.length - filas.length;
  const aviso = restantes > 0
    ? `Se listan las ${filas.length} más próximas; otras ${restantes} vencen también esta semana y figuran en la pestaña de SLA.`
    : '';
  const header = [
    ctx.th('CVE'), ctx.th('SEVERIDAD', { align: 'center' }), ctx.th('CVSS', { align: 'center' }),
    ctx.th('GRUPO', { align: 'center' }), ctx.th('ACTIVO'), ctx.th('DETECTADO', { align: 'center' }),
    ctx.th('PLAZO', { align: 'center' }), ctx.th('VENCE EN', { align: 'center' }),
  ];
  const rows = filas.map((b, i) => {
    const bg = i % 2 === 0 ? C.PANEL : C.PANEL_2;
    const urgente = b.days_remaining <= 2;
    return [
      ctx.td(b.cve_id, { color: C.TEXT, bold: true, mono: true, fill: bg }),
      ctx.td(SEV_ES[b.severity] || b.severity, { align: 'center', color: SEV_COLOR[b.severity] || C.MUTE, bold: true, fill: bg }),
      ctx.td(Number(b.base_score).toFixed(1), { align: 'center', color: C.TEXT_2, mono: true, fill: bg }),
      ctx.td(CAT_LABEL[b.category] || '—', { align: 'center', color: CAT_COLOR[b.category] || C.MUTE, fill: bg }),
      ctx.td(recortar(b.asset_name || '—', 22), { color: C.TEXT_2, mono: true, fill: bg }),
      ctx.td(fechaCorta(b.first_detected_at), { align: 'center', color: C.MUTE, mono: true, fill: bg }),
      ctx.td(`${b.sla_days} d`, { align: 'center', color: C.MUTE, mono: true, fill: bg }),
      ctx.td(`${b.days_remaining} d`, { align: 'center', color: urgente ? C.CRIT : C.WARN, bold: true, mono: true, fill: bg }),
    ];
  });

  s.addTable([header, ...rows], {
    x: PAGE.M, y: 1.7, w: CW,
    colW: [2.1, 1.35, 0.8, 1.7, 2.0, 1.3, 0.85, 1.1].map(v => v * (CW / 11.2)),
    rowH: 0.33,
    border: { type: 'solid', pt: 0.4, color: C.RULE },
    autoPage: false,
  });

  // Cada fila es una CVE en un activo; la nota habla en hallazgos, que es la unidad del informe.
  const y = 1.7 + (filas.length + 1) * 0.33 + 0.22;
  ctx.callout(s, {
    x: PAGE.M, y, w: CW, h: 0.95, titulo: null,
    color: incumplidos > 0 ? C.CRIT : C.WARN,
    borde: incumplidos > 0 ? C.CRIT : C.WARN,
    runs: incumplidos > 0
      ? [
          { text: `Además de los ${D.vencenProntoHallazgos} hallazgos que vencen, hay ${incumplidos} compromisos ya incumplidos. `, options: { bold: true, color: C.CRIT } },
          { text: `Estos últimos no admiten replanificación: según PROC-06 el vencimiento dispara escalado a Responsable de Infraestructura, y a los 15 días al CISO para aceptación formal del riesgo. ${aviso}`, options: { color: C.TEXT_2 } },
        ]
      : [
          { text: `${D.vencenProntoHallazgos} hallazgos (${D.vencenProntoCVEs} CVE) agotan su plazo dentro de la ventana. `, options: { bold: true, color: C.WARN } },
          { text: `Cerrarlos en la próxima ventana de mantenimiento evita el primer incumplimiento del ciclo; si alguno no es parcheable, procede registrar la excepción antes del vencimiento y no después. ${aviso}`, options: { color: C.TEXT_2 } },
        ],
  });

  ctx.footer(s);
}

// ════════════════════════════════════════════════════════════════════════════
// RITMO DE REMEDIACIÓN (MTTR)
// ════════════════════════════════════════════════════════════════════════════

/** Formatea días con un decimal, o un guion cuando no hay muestra que medir. */
const dias = (n) => (Number.isFinite(n) ? `${Number(n).toFixed(1)} d` : '—');

export function ritmoDeRemediacion(ctx, D, { etiquetaPeriodo }) {
  const s = ctx.slide();
  ctx.head(s, {
    fase: 'Fase 4 · Verificación',
    titulo: 'Ritmo de remediación',
    subtitulo: 'Cuánto se tarda en cerrar un hallazgo desde que se detecta, medido contra el plazo acordado',
    control: 'SP 800-53r4 · SI-2 · CA-7',
  });

  const R = D.remediacion;
  const M = R.mttr;

  // Sin hallazgos cerrados no hay MTTR que publicar. La edad del backlog sí se puede
  // leer ya, y deja la lámina con contenido en un proyecto recién inventariado.
  if (M.n === 0) {
    ctx.vacio(s, 'Todavía no hay hallazgos cerrados con fecha de detección y de cierre: sin ellos no se puede medir el tiempo de remediación.');
    ctx.callout(s, {
      x: PAGE.M, y: 4.6, w: CW, h: 1.0, titulo: 'Lo que sí se puede leer hoy',
      runs: [
        { text: `${R.backlog.n} hallazgos abiertos`, options: { bold: true, color: C.TEXT } },
        { text: ` acumulan una edad media de ${dias(R.backlog.media)} y una mediana de ${dias(R.backlog.mediana)}. `, options: { color: C.TEXT_2 } },
        { text: R.backlog.masViejo
            ? `El más antiguo lleva ${dias(R.backlog.masViejo.edadDias)} sin cerrarse: ${R.backlog.masViejo.cve || 'sin CVE resuelta'} en ${R.backlog.masViejo.endpoint || 'activo sin resolver'}.`
            : 'Ninguno tiene fecha de detección registrada.',
          options: { color: C.TEXT_2 } },
      ],
    });
    ctx.footer(s);
    return;
  }

  const cump = M.cumplimiento;
  const kw = (CW - 0.18 * 4) / 5;
  const kpis = [
    {
      label: 'MTTR medio', value: dias(M.media),
      sub: `${M.n} ${M.n === 1 ? 'hallazgo cerrado' : 'hallazgos cerrados'} con reloj completo`,
      color: C.TEXT, accent: C.ACCENT,
    },
    {
      label: 'Mediana', value: dias(M.mediana),
      sub: 'La mitad se cierra por debajo de este tiempo',
      color: C.TEXT, accent: C.ACCENT,
    },
    {
      label: 'P90', value: dias(M.p90),
      sub: `El decil más lento supera este tiempo · máximo ${dias(M.max)}`,
      color: Number.isFinite(M.p90) && Number.isFinite(M.mediana) && M.p90 > M.mediana * 3 ? C.WARN : C.TEXT,
      accent: C.NIST,
    },
    {
      label: 'Cierres en plazo', value: cump.pct === null ? '—' : `${cump.pct}%`,
      sub: cump.medidos > 0
        ? `${cump.enPlazo} de ${cump.medidos} dentro del SLA de su grupo`
        : 'Ningún cierre tiene plazo acordado que medir',
      color: cump.pct === null ? C.MUTE : cump.pct >= 95 ? C.OK : cump.pct >= 80 ? C.WARN : C.BAD,
      accent: C.OK,
    },
    {
      label: `Cerrados en ${etiquetaPeriodo}`, value: M.enPeriodo.n,
      sub: M.enPeriodo.n > 0 ? `MTTR del periodo ${dias(M.enPeriodo.media)}` : 'Sin cierres dentro de la ventana',
      color: M.enPeriodo.n > 0 ? C.OK : C.MUTE,
      accent: M.enPeriodo.n > 0 ? C.OK : C.MUTE,
    },
  ];
  kpis.forEach((k, i) => ctx.kpi(s, { ...k, x: PAGE.M + i * (kw + 0.18), y: 1.68, w: kw, h: 1.36 }));

  // ── Tiempo de cierre por severidad, contra el plazo acordado ──────────
  s.addText('TIEMPO MEDIO DE CIERRE POR SEVERIDAD, FRENTE AL PLAZO ACORDADO', {
    x: PAGE.M, y: 3.24, w: 8, h: 0.24, fontSize: 8, fontFace: F.MONO, color: C.MUTE, charSpacing: 1.2,
  });

  // La escala la fija el mayor entre lo tardado y lo acordado: escalando solo por lo
  // tardado, un plazo holgado se saldría del gráfico justo cuando se cumple de sobra.
  const escala = Math.max(
    1,
    ...SEV_ORDER.map(sev => M.porSeveridad[sev].media || 0),
    ...SEV_ORDER.map(sev => M.porSeveridad[sev].slaDias || 0),
  );

  SEV_ORDER.forEach((sev, i) => {
    const b = M.porSeveridad[sev];
    const y = 3.56 + i * 0.62;
    const excede = b.n > 0 && Number.isFinite(b.slaDias) && b.media > b.slaDias;

    s.addText(SEV_ES[sev], {
      x: PAGE.M, y, w: 1.5, h: 0.44, fontSize: 11, fontFace: F.SANS, bold: true,
      color: SEV_COLOR[sev], valign: 'middle',
    });

    const bx = PAGE.M + 1.6;
    const bw = 6.6;
    ctx.bar(s, { x: bx, y: y + 0.13, w: bw, h: 0.2, value: b.media || 0, max: escala, color: SEV_COLOR[sev] });

    // Marca del plazo: la referencia contra la que se lee la barra.
    if (Number.isFinite(b.slaDias) && b.slaDias > 0) {
      const mx = bx + (bw * Math.min(b.slaDias, escala)) / escala;
      s.addShape(ctx.pres.ShapeType.rect, { x: mx, y: y + 0.05, w: 0.018, h: 0.36, fill: { color: C.TEXT } });
      s.addText(`SLA ${b.slaDias} d`, {
        x: mx - 0.55, y: y - 0.13, w: 1.1, h: 0.2, fontSize: 7, fontFace: F.MONO, color: C.MUTE, align: 'center',
      });
    }

    s.addText(b.n > 0 ? dias(b.media) : '—', {
      x: PAGE.M + 8.35, y, w: 1.0, h: 0.44, fontSize: 12, fontFace: F.MONO, bold: true,
      color: b.n === 0 ? C.MUTE : excede ? C.BAD : C.OK,
      align: 'right', valign: 'middle',
    });
    s.addText(b.n > 0 ? `${b.n} ${b.n === 1 ? 'cierre' : 'cierres'} · mediana ${dias(b.mediana)}` : 'sin cierres medidos', {
      x: PAGE.M + 9.5, y, w: 2.7, h: 0.44, fontSize: 8.5, fontFace: F.SANS, color: C.MUTE, valign: 'middle',
    });
  });

  // ── Lectura ───────────────────────────────────────────────────────────
  const excedidas = SEV_ORDER.filter(sev => {
    const b = M.porSeveridad[sev];
    return b.n > 0 && Number.isFinite(b.slaDias) && b.media > b.slaDias;
  });

  const runs = [];
  if (excedidas.length > 0) {
    runs.push({ text: `El tiempo medio de cierre supera el plazo acordado en ${excedidas.map(x => SEV_ES[x].toLowerCase()).join(', ')}`, options: { bold: true, color: C.BAD } });
    runs.push({ text: '. No es un incumplimiento suelto sino el ritmo habitual: mientras la media esté por encima del plazo, cada nueva tanda de hallazgos de esa severidad nace condenada a vencer. ', options: { color: C.TEXT_2 } });
  } else {
    runs.push({ text: 'El ritmo de cierre cabe dentro de los plazos acordados en todas las severidades medidas', options: { bold: true, color: C.OK } });
    runs.push({ text: '. ', options: { color: C.TEXT_2 } });
  }
  runs.push({ text: `El backlog abierto acumula ${dias(R.backlog.media)} de edad media`, options: { color: C.TEXT_2 } });
  if (R.backlog.vencidos > 0) {
    runs.push({ text: `, y ${R.backlog.vencidos} de esos hallazgos ya han pasado de su plazo sin cerrarse`, options: { bold: true, color: C.WARN } });
  }
  runs.push({ text: '.', options: { color: C.TEXT_2 } });

  ctx.callout(s, { x: PAGE.M, y: 6.14, w: CW, h: 0.72, titulo: null, runs });

  const notas = [
    M.sinFechas > 0 ? `${M.sinFechas} hallazgos cerrados no tienen las dos marcas de tiempo y quedan fuera del cálculo.` : '',
    M.supersedidos > 0 ? `${M.supersedidos} hallazgos figuran como reemplazados al cambiar la imagen de su contenedor: ese cierre no lo produce un trabajo de remediación, así que no entra en el MTTR.` : '',
  ].filter(Boolean);
  if (notas.length > 0) ctx.nota(s, { x: PAGE.M, y: 6.92, w: CW, text: notas.join(' ') });

  ctx.footer(s);
}

// ════════════════════════════════════════════════════════════════════════════
// PARCHES: DISPONIBILIDAD Y APLICACIÓN
// ════════════════════════════════════════════════════════════════════════════
export function parches(ctx, D, { etiquetaPeriodo }) {
  const s = ctx.slide();
  ctx.head(s, {
    fase: 'Fase 3 · Ejecución',
    titulo: 'Parches: disponibilidad y aplicación',
    subtitulo: 'Qué parte del backlog es parcheable hoy y qué se ha declarado aplicado sobre el parque',
    control: 'SP 800-53r4 · SI-2 · CM-3',
  });

  const P = D.remediacion.disponibilidad;
  const A = D.remediacion.aplicados;

  const kw = (CW - 0.18 * 4) / 5;
  const kpis = [
    {
      label: 'Parches identificados', value: P.parches,
      sub: `Cubren ${P.cvesConParche} de ${P.cvesTotales} CVE del alcance`,
      color: C.TEXT, accent: C.ACCENT,
    },
    {
      label: 'Backlog accionable', value: P.accionablePct === null ? '—' : `${P.accionablePct}%`,
      sub: `${P.abiertosConParche} de ${P.abiertos} hallazgos abiertos tienen parche publicado`,
      color: P.accionablePct === null ? C.MUTE : P.accionablePct >= 60 ? C.OK : C.WARN,
      accent: C.OK,
    },
    {
      label: 'Sin parche disponible', value: P.abiertosSinParche,
      sub: P.abiertosSinParche > 0 ? 'Solo admiten mitigación o aceptación' : 'Todo el backlog es parcheable',
      color: P.abiertosSinParche > 0 ? C.WARN : C.OK,
      accent: P.abiertosSinParche > 0 ? C.WARN : C.OK,
    },
    {
      label: 'Parches declarados', value: A.total,
      sub: A.total > 0
        ? `${A.oficiales} ${A.oficiales === 1 ? 'oficial' : 'oficiales'} · ${A.mitigaciones} ${A.mitigaciones === 1 ? 'mitigación' : 'mitigaciones'}`
        : 'Ninguna declaración registrada',
      color: A.total > 0 ? C.TEXT : C.MUTE,
      accent: A.total > 0 ? C.OK : C.MUTE,
    },
    {
      label: `Aplicados en ${etiquetaPeriodo}`, value: A.enPeriodo,
      sub: A.total > 0
        ? `${A.cves} ${A.cves === 1 ? 'CVE' : 'CVE distintas'} sobre ${A.activos} ${A.activos === 1 ? 'activo' : 'activos'}`
        : 'Sin actividad de parcheo registrada',
      color: A.enPeriodo > 0 ? C.OK : C.MUTE,
      accent: A.enPeriodo > 0 ? C.OK : C.MUTE,
    },
  ];
  kpis.forEach((k, i) => ctx.kpi(s, { ...k, x: PAGE.M + i * (kw + 0.18), y: 1.68, w: kw, h: 1.36 }));

  // Sin declaraciones la tabla sobra, pero el hueco es en sí mismo el hallazgo: hay
  // parche publicado para parte del backlog y no consta que se haya aplicado.
  if (A.total === 0) {
    ctx.callout(s, {
      x: PAGE.M, y: 3.36, w: CW, h: 1.5, titulo: 'Sin declaraciones de parche',
      color: C.WARN, borde: C.WARN,
      runs: [
        { text: 'No consta ningún parche declarado como aplicado sobre el parque. ', options: { bold: true, color: C.WARN } },
        { text: `Hay ${P.abiertosConParche} hallazgos abiertos cuyo arreglo ya está publicado, así que lo que falta no es el parche sino el registro de su aplicación. Sin esa declaración el hallazgo sigue contando como abierto, el riesgo del activo no baja, el reloj del SLA sigue corriendo y el trabajo hecho en la ventana de mantenimiento no queda acreditado como evidencia de SI-2.`, options: { color: C.TEXT_2 } },
      ],
    });
    ctx.nota(s, {
      x: PAGE.M, y: 5.05, w: CW,
      text: 'La declaración se registra desde la cola de parcheo, indicando el nivel de remediación aplicado (parche oficial, corrección temporal o solución alternativa).',
    });
    ctx.footer(s);
    return;
  }

  // ── Últimas declaraciones ─────────────────────────────────────────────
  s.addText('ÚLTIMAS DECLARACIONES DE PARCHE', {
    x: PAGE.M, y: 3.24, w: 8, h: 0.24, fontSize: 8, fontFace: F.MONO, color: C.MUTE, charSpacing: 1.2,
  });

  const filas = A.ultimas.slice(0, 5);
  const header = [
    ctx.th('CVE'), ctx.th('NIVEL'), ctx.th('ACTIVO'), ctx.th('SOFTWARE'),
    ctx.th('APLICADO', { align: 'center' }), ctx.th('POR'), ctx.th('VERIFICACIÓN', { align: 'center' }),
  ];
  const rows = filas.map((r, i) => {
    const bg = i % 2 === 0 ? C.PANEL : C.PANEL_2;
    const colorNivel = r.oficial ? C.OK : r.nivel === 'UNAVAILABLE' ? C.MUTE : C.WARN;
    const verif = r.verificado ? 'Verificado' : r.verificacionConcluyente ? 'No coincide' : 'No concluyente';
    return [
      ctx.td(r.cve || '—', { color: C.TEXT, bold: true, mono: true, fill: bg }),
      ctx.td(r.nivelES || '—', { color: colorNivel, bold: true, fill: bg }),
      ctx.td(r.endpoint || r.contenedor || r.activoID || '—', { color: C.TEXT_2, mono: true, fill: bg }),
      ctx.td(r.software || '—', { color: C.TEXT_2, fill: bg }),
      ctx.td(r.aplicadoEn ? fechaCorta(r.aplicadoEn) : '—', { align: 'center', color: C.MUTE, mono: true, fill: bg }),
      ctx.td(r.aplicadoPor || '—', { color: C.TEXT_2, fill: bg }),
      ctx.td(verif, {
        align: 'center', bold: true, fill: bg,
        color: r.verificado ? C.OK : r.verificacionConcluyente ? C.BAD : C.WARN,
      }),
    ];
  });

  const tableY = 3.48;
  const rowH = 0.30;
  s.addTable([header, ...rows], {
    x: PAGE.M, y: tableY, w: CW,
    colW: [1.9, 1.85, 2.3, 1.9, 1.3, 1.35, 1.63].map(v => v * (CW / 12.23)),
    rowH,
    border: { type: 'solid', pt: 0.4, color: C.RULE },
    autoPage: false,
  });

  const tableH = (filas.length + 1) * rowH;
  const calloutY = tableY + tableH + 0.18;
  const runs = [];
  const una = A.total === 1;
  if (A.mitigaciones > 0) {
    runs.push({
      text: una
        ? 'La única declaración registrada es una mitigación'
        : `${A.mitigaciones} de las ${A.total} declaraciones son mitigaciones`,
      options: { bold: true, color: C.WARN },
    });
    runs.push({ text: ', no parches oficiales: rebajan el riesgo pero dejan instalado el software vulnerable, así que el hallazgo sigue abierto y su plazo sigue corriendo. ', options: { color: C.TEXT_2 } });
  } else {
    runs.push({
      text: una
        ? 'La única declaración registrada es un parche oficial'
        : `Las ${A.total} declaraciones son parches oficiales`,
      options: { bold: true, color: C.OK },
    });
    runs.push({ text: ', que cierra el hallazgo y lo saca del cómputo de SLA. ', options: { color: C.TEXT_2 } });
  }
  if (A.noConcluyentes > 0) {
    runs.push({
      text: A.noConcluyentes === 1 && una
        ? 'La verificación automática no ha sido concluyente'
        : `La verificación automática no ha sido concluyente en ${A.noConcluyentes} de ellas`,
      options: { bold: true, color: C.TEXT },
    });
    runs.push({ text: ': se contrasta la versión instalada con la que corrige el fallo, y cuando esa versión corregida no está publicada no hay contra qué comparar. Queda como declaración del operador, no como evidencia verificada.', options: { color: C.TEXT_2 } });
  } else {
    runs.push({ text: 'Todas las declaraciones se han podido verificar contra la versión instalada del componente.', options: { color: C.TEXT_2 } });
  }

  ctx.callout(s, { x: PAGE.M, y: calloutY, w: CW, h: 0.88, titulo: null, runs });

  ctx.footer(s);
}

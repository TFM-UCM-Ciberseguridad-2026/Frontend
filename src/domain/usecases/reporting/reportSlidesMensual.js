/**
 * reportSlidesMensual — láminas exclusivas del informe mensual.
 *
 * El semanal es operativo: qué hay que cerrar y en qué plazo. El mensual es de gobierno:
 * bajo qué marco se decide, con qué política se prioriza, quién responde de cada actividad
 * y de qué control es evidencia cada cifra. Estas secciones cambian de mes a mes como mucho,
 * así que repetirlas cada semana solo conseguiría que se dejara de leer el informe.
 */

import { C, F, PAGE, CW, SEV_ES, SEV_ORDER, SEV_COLOR } from './reportKit.js';

// ════════════════════════════════════════════════════════════════════════════
// ÍNDICE
// ════════════════════════════════════════════════════════════════════════════
export function indice(ctx, secciones) {
  const s = ctx.slide();
  ctx.head(s, {
    fase: 'Índice',
    titulo: 'Contenido del informe',
    subtitulo: 'El marco normativo, la política de priorización, la situación del periodo y el gobierno del proceso',
  });

  const H_HEAD = 0.28, H_ITEM = 0.40, H_GAP = 0.10;
  // Reparto por número de ENTRADAS y no de bloques: un grupo con muchas secciones
  // desequilibraba la columna derecha hasta salirse de la lámina.
  const totalItems = secciones.reduce((a, b) => a + b.items.length, 0);
  const corte = [];
  let acumulado = 0;
  secciones.forEach(b => {
    if (acumulado < Math.ceil(totalItems / 2)) { corte.push(b); acumulado += b.items.length; }
  });
  const colA = corte;
  const colB = secciones.filter(b => !corte.includes(b));

  function columna(bloques, x, w) {
    let y = 1.66;
    bloques.forEach(b => {
      s.addText(b.g.toUpperCase(), {
        x, y, w, h: 0.22, fontSize: 7.5, fontFace: F.MONO, bold: true, color: b.c, charSpacing: 1.3, valign: 'middle',
      });
      s.addShape(ctx.pres.ShapeType.rect, { x, y: y + 0.22, w, h: 0.012, fill: { color: C.RULE } });
      y += H_HEAD;

      b.items.forEach(([pag, tit, desc, ctrl]) => {
        s.addText(pag, {
          x, y, w: 0.4, h: H_ITEM, fontSize: 10, fontFace: F.MONO, bold: true, color: C.ACCENT, valign: 'middle',
        });
        s.addText(tit, {
          x: x + 0.46, y: y + 0.01, w: w - 1.28, h: 0.21,
          fontSize: 9.5, fontFace: F.SANS, bold: true, color: C.TEXT, valign: 'middle',
        });
        s.addText(desc, {
          x: x + 0.46, y: y + 0.21, w: w - 1.28, h: 0.19,
          fontSize: 7.5, fontFace: F.SANS, color: C.MUTE, valign: 'middle',
        });
        if (ctrl && ctrl !== '—') {
          s.addText(ctrl, {
            x: x + w - 0.78, y, w: 0.78, h: H_ITEM,
            fontSize: 7.5, fontFace: F.MONO, color: C.NIST, align: 'right', valign: 'middle',
          });
        }
        y += H_ITEM;
      });
      y += H_GAP;
    });
  }

  columna(colA, PAGE.M, 5.95);
  columna(colB, PAGE.M + 6.28, 5.95);
  ctx.footer(s);
}

// ════════════════════════════════════════════════════════════════════════════
// MARCO DE REFERENCIA Y ALCANCE
// ════════════════════════════════════════════════════════════════════════════
export function marcoDeReferencia(ctx, D) {
  const s = ctx.slide();
  ctx.head(s, {
    fase: 'Nota metodológica',
    titulo: 'Marco de referencia y alcance',
    subtitulo: 'Qué norma ordena este informe, qué mide cada sección y qué queda fuera del alcance',
  });

  s.addText(
    'El informe sigue el ciclo de vida de gestión de vulnerabilidades de software de NIST SP 800-40 Rev. 4. Sus cuatro fases ordenan las secciones: primero qué activos hay y qué se sabe de ellos, después cómo se decide la respuesta, luego cómo se ejecuta y por último cómo se vigila. Cada sección se etiqueta con el control de SP 800-53 Rev. 4 del que constituye evidencia, de modo que el informe sirva también como registro de cumplimiento.',
    { x: PAGE.M, y: 1.68, w: 7.6, h: 1.15, fontSize: 11, fontFace: F.SANS, color: C.TEXT_2, lineSpacingMultiple: 1.35 }
  );

  const fases = [
    { n: '1', t: 'Gestión de activos y conocimiento de vulnerabilidades', c: 'CM-8 · RA-5', d: 'Inventario, agrupación en grupos de mantenimiento y cobertura del escaneo.' },
    { n: '2', t: 'Planificación de la respuesta al riesgo', c: 'RA-3 · RA-5', d: 'Severidad × criticidad del activo, y elección entre mitigar, aceptar, transferir o evitar.' },
    { n: '3', t: 'Ejecución de la respuesta', c: 'SI-2 · CM-3', d: 'Cumplimiento de plazos, cola priorizada y envejecimiento del backlog.' },
    { n: '4', t: 'Monitorización continua', c: 'CA-7 · SI-5', d: 'Inteligencia de amenazas, cobertura de mapeo y gobierno documental.' },
  ];
  fases.forEach((f, i) => {
    const y = 3.05 + i * 0.82;
    s.addShape(ctx.pres.ShapeType.roundRect, {
      x: PAGE.M, y, w: 7.6, h: 0.72, fill: { color: C.PANEL }, line: { color: C.RULE, width: 0.6 }, rectRadius: 0.06,
    });
    s.addShape(ctx.pres.ShapeType.rect, { x: PAGE.M, y, w: 0.045, h: 0.72, fill: { color: C.NIST } });
    s.addText(`FASE ${f.n}`, {
      x: PAGE.M + 0.2, y: y + 0.08, w: 0.85, h: 0.24, fontSize: 8, fontFace: F.MONO, bold: true, color: C.NIST, valign: 'middle',
    });
    s.addText(f.t, {
      x: PAGE.M + 1.05, y: y + 0.07, w: 5.3, h: 0.26, fontSize: 10.5, fontFace: F.SANS, bold: true, color: C.TEXT, valign: 'middle',
    });
    s.addText(f.d, { x: PAGE.M + 1.05, y: y + 0.34, w: 5.3, h: 0.3, fontSize: 8.5, fontFace: F.SANS, color: C.MUTE, valign: 'top' });
    s.addText(f.c, {
      x: PAGE.M + 6.4, y, w: 1.1, h: 0.72, fontSize: 8.5, fontFace: F.MONO, color: C.NIST, align: 'right', valign: 'middle',
    });
  });

  s.addShape(ctx.pres.ShapeType.roundRect, {
    x: 8.45, y: 1.68, w: 4.33, h: 5.0, fill: { color: C.PANEL }, line: { color: C.RULE, width: 0.75 }, rectRadius: 0.08,
  });
  s.addText('ALCANCE', {
    x: 8.72, y: 1.9, w: 3.8, h: 0.25, fontSize: 8.5, fontFace: F.MONO, bold: true, color: C.ACCENT, charSpacing: 1.4,
  });
  const alcance = [
    ['Activos', `${D.inventario.endpoints} endpoints, ${D.inventario.contenedores} contenedores, ${D.inventario.instalaciones} instalaciones de software`],
    ['Ventana', `${ctx.meta.periodo} (${ctx.meta.ciclo})`],
    ['Fuentes', 'NVD · CISA KEV · FIRST EPSS · OSV · MITRE ATT&CK y CAPEC'],
    ['Motor de riesgo', 'CVSS environmental × EPSS/KEV × exposición × factor de remediación'],
  ];
  alcance.forEach(([k, v], i) => {
    const y = 2.24 + i * 0.78;
    s.addText(k.toUpperCase(), { x: 8.72, y, w: 3.8, h: 0.2, fontSize: 7.5, fontFace: F.MONO, color: C.MUTE, charSpacing: 1.1 });
    s.addText(v, {
      x: 8.72, y: y + 0.2, w: 3.8, h: 0.52, fontSize: 9, fontFace: F.SANS, color: C.TEXT_2, lineSpacingMultiple: 1.25, valign: 'top',
    });
  });

  s.addShape(ctx.pres.ShapeType.rect, { x: 8.72, y: 5.42, w: 3.8, h: 0.012, fill: { color: C.RULE } });
  s.addText('FUERA DE ALCANCE', {
    x: 8.72, y: 5.56, w: 3.8, h: 0.25, fontSize: 8.5, fontFace: F.MONO, bold: true, color: C.WARN, charSpacing: 1.4,
  });
  s.addText(
    'Pruebas de intrusión, revisión de código fuente y seguridad física. El informe cubre gestión de vulnerabilidades conocidas sobre inventario declarado; no acredita la ausencia de vulnerabilidades no publicadas.',
    { x: 8.72, y: 5.85, w: 3.8, h: 0.9, fontSize: 8.5, fontFace: F.SANS, color: C.MUTE, lineSpacingMultiple: 1.25 }
  );

  ctx.footer(s);
}

// ════════════════════════════════════════════════════════════════════════════
// MATRIZ DE DECISIÓN Y RESPUESTA AL RIESGO
// ════════════════════════════════════════════════════════════════════════════
export function matrizDecision(ctx, D) {
  const s = ctx.slide();
  ctx.head(s, {
    fase: 'Fase 2 · Selección de respuesta',
    titulo: 'Matriz de decisión y respuesta al riesgo',
    subtitulo: 'Criticidad del activo × severidad de la vulnerabilidad, según el esquema recomendado en SP 800-40 Rev. 4',
    control: 'SP 800-53r4 · RA-3',
  });

  const crits = ['Alta', 'Media', 'Baja'];
  const cell = [[3, 3, 2, 1], [3, 2, 1, 1], [2, 1, 1, 0]];
  const urg = [
    { t: 'Rutinario', c: C.LOW, bg: C.BG_OK },
    { t: 'Planificado', c: C.MED, bg: C.BG_WARN },
    { t: 'Acelerado', c: C.HIGH, bg: C.BG_HIGH },
    { t: 'Inmediato', c: C.CRIT, bg: C.BG_CRIT },
  ];

  const mx = PAGE.M + 1.55, my = 2.15, cw = 1.14, ch = 0.72;
  s.addText('SEVERIDAD CVSS →', {
    x: mx, y: my - 0.66, w: cw * 4, h: 0.24, fontSize: 7.5, fontFace: F.MONO, color: C.MUTE, align: 'center', charSpacing: 1,
  });
  SEV_ORDER.forEach((sev, j) => {
    s.addText(SEV_ES[sev], {
      x: mx + j * cw, y: my - 0.36, w: cw, h: 0.3,
      fontSize: 9, fontFace: F.MONO, bold: true, color: SEV_COLOR[sev], align: 'center', valign: 'middle',
    });
  });
  s.addText('CRITICIDAD\nDEL ACTIVO', {
    x: PAGE.M, y: my + 0.55, w: 1.45, h: 0.6,
    fontSize: 7.5, fontFace: F.MONO, color: C.MUTE, align: 'right', charSpacing: 1, lineSpacingMultiple: 1.2,
  });

  crits.forEach((k, i) => {
    s.addText(k, {
      x: PAGE.M, y: my + i * ch, w: 1.45, h: ch,
      fontSize: 10, fontFace: F.SANS, bold: true, color: C.TEXT, align: 'right', valign: 'middle',
    });
    SEV_ORDER.forEach((sev, j) => {
      const u = urg[cell[i][j]];
      s.addShape(ctx.pres.ShapeType.rect, {
        x: mx + j * cw, y: my + i * ch, w: cw - 0.045, h: ch - 0.045,
        fill: { color: u.bg }, line: { color: u.c, width: 0.75 },
      });
      s.addText(u.t, {
        x: mx + j * cw, y: my + i * ch, w: cw - 0.045, h: ch - 0.045,
        fontSize: 8.5, fontFace: F.SANS, bold: true, color: u.c, align: 'center', valign: 'middle',
      });
    });
  });

  const criticasServidor = D.porGrupo.Server.Critical;
  s.addText(
    `Los ${D.inventario.servidores} servidores del alcance caen en la fila de criticidad alta: están expuestos a Internet o marcados con requisitos CIA altos. Sus ${criticasServidor} hallazgos críticos exigen por tanto respuesta inmediata.`,
    { x: PAGE.M, y: 4.42, w: 6.2, h: 0.7, fontSize: 9.5, fontFace: F.SANS, color: C.TEXT_2, lineSpacingMultiple: 1.3 }
  );

  // Las cuatro respuestas al riesgo de SP 800-40 Rev. 4
  s.addText('RESPUESTA AL RIESGO SELECCIONADA', {
    x: 7.0, y: 1.66, w: 5.8, h: 0.24, fontSize: 8, fontFace: F.MONO, color: C.MUTE, charSpacing: 1.2,
  });
  const abiertosTotales = D.porGrupo.Server.total + D.porGrupo.Workstation.total + D.porGrupo.sinClasificar.total;
  const respuestas = [
    { t: 'Mitigar', en: 'Minimization', n: abiertosTotales, d: 'Aplicar el parche del fabricante o una mitigación de configuración.', c: C.OK },
    { t: 'Aceptar', en: 'Acceptance', n: 0, d: 'Riesgo residual asumido formalmente, con controles compensatorios y caducidad.', c: C.MED },
    { t: 'Transferir', en: 'Transfer', n: 0, d: 'Traslado a un tercero: seguro cibernético o migración a servicio gestionado.', c: C.MUTE },
    { t: 'Evitar', en: 'Avoidance', n: 0, d: 'Retirada del activo o desactivación del componente vulnerable.', c: C.MUTE },
  ];
  respuestas.forEach((r, i) => {
    const y = 1.96 + i * 1.16;
    s.addShape(ctx.pres.ShapeType.roundRect, {
      x: 7.0, y, w: 5.78, h: 1.02, fill: { color: C.PANEL }, line: { color: C.RULE, width: 0.6 }, rectRadius: 0.06,
    });
    s.addShape(ctx.pres.ShapeType.rect, { x: 7.0, y, w: 0.045, h: 1.02, fill: { color: r.c } });
    s.addText(r.t, { x: 7.22, y: y + 0.1, w: 2.2, h: 0.3, fontSize: 12, fontFace: F.SANS, bold: true, color: C.TEXT, valign: 'middle' });
    s.addText(r.en, { x: 7.22, y: y + 0.38, w: 2.2, h: 0.22, fontSize: 8, fontFace: F.MONO, color: C.MUTE });
    s.addText(r.d, { x: 7.22, y: y + 0.6, w: 4.0, h: 0.36, fontSize: 8.5, fontFace: F.SANS, color: C.TEXT_2, lineSpacingMultiple: 1.15 });
    s.addText(String(r.n), {
      x: 11.35, y: y + 0.12, w: 1.2, h: 0.5, fontSize: 22, fontFace: F.SANS, bold: true,
      color: r.n > 0 ? r.c : C.MUTE, align: 'right', valign: 'middle',
    });
    s.addText('hallazgos', { x: 11.35, y: y + 0.62, w: 1.2, h: 0.24, fontSize: 7.5, fontFace: F.MONO, color: C.MUTE, align: 'right' });
  });

  ctx.nota(s, {
    x: PAGE.M, y: 5.25, w: 6.2,
    text: 'No hay ninguna excepción formalizada: todo hallazgo abierto se está tratando por defecto como «mitigar». Si algún activo no admite parche, procede registrar la aceptación con caducidad en vez de dejarlo envejecer en la cola.',
  });

  ctx.footer(s);
}

// ════════════════════════════════════════════════════════════════════════════
// CONCENTRACIÓN POR TÁCTICA Y CADENA DE ATAQUE
// ════════════════════════════════════════════════════════════════════════════
export function concentracionPorTactica(ctx, D) {
  const s = ctx.slide();
  ctx.head(s, {
    fase: 'Fase 4 · Monitorización',
    titulo: 'Concentración por táctica y cadena de ataque',
    subtitulo: 'Dónde se acumula la superficie explotable, medida en vulnerabilidades que habilitan cada táctica',
    control: 'SP 800-53r4 · RA-3',
  });

  const orden = [...D.ttp.tacticas].sort((a, b) => b.cves - a.cves);
  const maxC = Math.max(orden[0]?.cves || 0, 1);

  // 15 tácticas (MITRE ATT&CK v19 añade TA0112 Defense Impairment).
  // Se distribuyen en la mitad izquierda con margen holgado para la nota al pie.
  const y0 = 1.68;
  const stepY = orden.length > 14 ? 0.30 : 0.32;
  orden.forEach((t, i) => {
    const y = y0 + i * stepY;
    s.addText(t.n, {
      x: PAGE.M, y, w: 2.15, h: 0.26, fontSize: 8.2, fontFace: F.SANS, color: t.cves ? C.TEXT_2 : C.MUTE, valign: 'middle',
    });
    s.addText(t.id, {
      x: PAGE.M + 2.18, y, w: 0.66, h: 0.26, fontSize: 7.5, fontFace: F.MONO, color: C.MUTE, valign: 'middle', wrap: false,
    });
    const bx = PAGE.M + 2.90, bw = 3.50;
    const frac = t.cves / maxC;
    ctx.bar(s, {
      x: bx, y: y + 0.055, w: bw, h: 0.15, value: t.cves, max: maxC,
      color: frac >= 0.6 ? C.CRIT : frac >= 0.3 ? C.HIGH : frac >= 0.1 ? C.MED : C.ACCENT,
    });
    s.addText(String(t.cves), {
      x: bx + bw + 0.1, y, w: 0.5, h: 0.26, fontSize: 8.5, fontFace: F.MONO, bold: true,
      color: t.cves ? C.TEXT : C.MUTE, align: 'right', valign: 'middle',
    });
    s.addText(`${t.tec} téc.`, {
      x: bx + bw + 0.65, y, w: 0.68, h: 0.26, fontSize: 7.5, fontFace: F.MONO, color: C.MUTE, valign: 'middle',
    });
  });

  // La cadena se arma con las cinco tácticas de mayor peso, en orden de secuencia real
  const SECUENCIA = ['ia', 'exec', 'pe', 'de', 'di', 'ca', 'disc', 'lm', 'coll', 'c2', 'exfil', 'impact', 'pers', 'reco', 'resdev'];
  const top5 = [...orden].slice(0, 5)
    .sort((a, b) => SECUENCIA.indexOf(a.k) - SECUENCIA.indexOf(b.k));

  s.addText('CADENA CON MAYOR SOPORTE EN EL INVENTARIO', {
    x: 8.6, y: 1.7, w: 4.2, h: 0.24, fontSize: 8, fontFace: F.MONO, color: C.MUTE, charSpacing: 1.2,
  });
  top5.forEach((t, i) => {
    const y = 2.02 + i * 0.92;
    const frac = t.cves / maxC;
    const col = frac >= 0.6 ? C.CRIT : frac >= 0.3 ? C.HIGH : C.MED;
    s.addShape(ctx.pres.ShapeType.roundRect, {
      x: 8.6, y, w: 4.18, h: 0.78, fill: { color: C.PANEL }, line: { color: C.RULE, width: 0.6 }, rectRadius: 0.06,
    });
    s.addShape(ctx.pres.ShapeType.rect, { x: 8.6, y, w: 0.045, h: 0.78, fill: { color: col } });
    s.addText(t.n, {
      x: 8.82, y: y + 0.08, w: 2.7, h: 0.26, fontSize: 10, fontFace: F.SANS, bold: true, color: C.TEXT, valign: 'middle',
    });
    s.addText(String(t.cves), {
      x: 11.5, y: y + 0.06, w: 1.1, h: 0.3, fontSize: 13, fontFace: F.MONO, bold: true, color: col, align: 'right', valign: 'middle',
    });
    s.addText(t.top[0] ? `${t.top[0].id} · ${t.top[0].name}` : 'Sin técnica dominante', {
      x: 8.82, y: y + 0.34, w: 3.75, h: 0.38, fontSize: 8, fontFace: F.SANS, color: C.MUTE, lineSpacingMultiple: 1.15,
    });
    if (i < top5.length - 1) {
      s.addText('▼', { x: 8.6, y: y + 0.78, w: 4.18, h: 0.14, fontSize: 7, color: C.RULE, align: 'center', valign: 'middle' });
    }
  });

  ctx.nota(s, {
    x: PAGE.M, y: 6.38, w: 7.6,
    text: 'Una misma CVE alimenta varias tácticas, así que la suma de la columna supera el total de vulnerabilidades. La cifra mide soporte de la táctica en el inventario, no incidentes observados.',
  });

  ctx.footer(s);
}

// ════════════════════════════════════════════════════════════════════════════
// GOBIERNO DOCUMENTAL Y RESPONSABILIDADES
// ════════════════════════════════════════════════════════════════════════════
export function gobiernoDocumental(ctx, D, gob) {
  const s = ctx.slide();
  ctx.head(s, {
    fase: 'Fase 4 · Monitorización',
    titulo: 'Gobierno documental y responsabilidades',
    subtitulo: 'Estado del marco normativo interno que respalda el proceso descrito en este informe',
    control: 'SP 800-53r4 · PM-1 · PL-1',
  });

  const pol = gob.politicas || [];
  const vigentes = pol.filter(p => p.status === 'active').length;
  const enRevision = pol.filter(p => p.status === 'in_review').length;
  const obsoletas = pol.filter(p => p.status === 'obsolete').length;

  const kw = (CW - 0.18 * 3) / 4;
  [
    { label: 'Políticas vigentes', value: `${vigentes}/${pol.length}`, sub: 'Documentos aprobados y en fecha', accent: C.OK, color: C.TEXT },
    { label: 'En revisión', value: enRevision, sub: enRevision ? 'Pendientes de aprobación' : 'Ninguna pendiente', accent: enRevision ? C.WARN : C.RULE, color: enRevision ? C.WARN : C.MUTE },
    { label: 'Revisión vencida', value: obsoletas, sub: obsoletas ? 'No invocables como control vigente' : 'Ninguna vencida', accent: obsoletas ? C.BAD : C.RULE, color: obsoletas ? C.BAD : C.MUTE },
    { label: 'Procedimientos', value: (gob.procedimientos || []).length, sub: `${(gob.raci || []).length} actividades en la matriz RACI`, accent: C.ACCENT, color: C.TEXT },
  ].forEach((k, i) => ctx.kpi(s, { ...k, x: PAGE.M + i * (kw + 0.18), y: 1.7, w: kw, h: 1.28 }));

  // Matriz RACI
  s.addText('MATRIZ RACI — ACTIVIDADES DEL CICLO DE PARCHEO', {
    x: PAGE.M, y: 3.2, w: 8, h: 0.24, fontSize: 8, fontFace: F.MONO, color: C.MUTE, charSpacing: 1.2,
  });

  const roles = (gob.roles || []).slice(0, 4);
  const actividades = [...(gob.raci || [])].sort((a, b) => (a.order || 0) - (b.order || 0)).slice(0, 8);
  const RACI_COL = { R: C.OK, A: C.CRIT, C: C.MED, I: C.MUTE };

  if (roles.length && actividades.length) {
    const anchosRoles = {
      'CISO': 0.90,
      'Equipo SOC': 1.15,
      'Equipo Infraestructura': 1.75,
      'Dueño del Activo': 1.25,
    };
    const colRoles = roles.map(r => anchosRoles[r.name] || 1.10);
    const anchoActividad = Math.max(2.0, 7.5 - colRoles.reduce((a, b) => a + b, 0));
    const colW = [anchoActividad, ...colRoles];

    const header = [ctx.th('ACTIVIDAD'), ...roles.map(r => ctx.th(r.name, { align: 'center' }))];
    const rows = actividades.map((a, i) => {
      const bg = i % 2 === 0 ? C.PANEL : C.PANEL_2;
      return [
        ctx.td(a.name, { color: C.TEXT_2, fill: bg }),
        ...roles.map(r => {
          const v = (a.roles || {})[r.id] || '—';
          return ctx.td(v, { align: 'center', color: RACI_COL[v] || C.MUTE, bold: true, mono: true, fill: bg });
        }),
      ];
    });
    s.addTable([header, ...rows], {
      x: PAGE.M, y: 3.46, w: 7.5,
      colW,
      rowH: 0.29,
      border: { type: 'solid', pt: 0.4, color: C.RULE },
      autoPage: false,
    });
    s.addText('R responsable de ejecutar   ·   A rinde cuentas   ·   C consultado   ·   I informado', {
      x: PAGE.M, y: 6.48, w: 7.5, h: 0.22, fontSize: 8, fontFace: F.MONO, color: C.MUTE,
    });
  } else {
    s.addText('Matriz RACI no definida para este proyecto.', {
      x: PAGE.M, y: 3.6, w: 7.5, h: 0.4, fontSize: 10, fontFace: F.SANS, italic: true, color: C.MUTE,
    });
  }

  // Alertas documentales: se muestran las que de verdad requieren atención
  s.addShape(ctx.pres.ShapeType.roundRect, {
    x: 8.3, y: 3.48, w: 4.48, h: 2.9, fill: { color: C.PANEL }, line: { color: C.RULE, width: 0.9 }, rectRadius: 0.08,
  });
  s.addText('ATENCIÓN DOCUMENTAL', {
    x: 8.55, y: 3.68, w: 4, h: 0.25, fontSize: 8.5, fontFace: F.MONO, bold: true, color: C.WARN, charSpacing: 1.3,
  });

  const orden = { obsolete: 0, in_review: 1, pending: 2, invalid: 2, active: 3 };
  const colorEstado = { obsolete: C.BAD, in_review: C.WARN, pending: C.WARN, invalid: C.BAD, active: C.OK };
  const destacadas = [...pol].sort((a, b) => (orden[a.status] ?? 4) - (orden[b.status] ?? 4)).slice(0, 3);

  if (destacadas.length) {
    destacadas.forEach((p, i) => {
      const y = 4.0 + i * 0.82;
      const col = colorEstado[p.status] || C.MUTE;
      s.addShape(ctx.pres.ShapeType.rect, { x: 8.55, y: y + 0.04, w: 0.05, h: 0.62, fill: { color: col } });
      s.addText(`${p.name} ${p.version || ''}`.trim(), {
        x: 8.72, y, w: 3.85, h: 0.26, fontSize: 9, fontFace: F.SANS, bold: true, color: C.TEXT, valign: 'middle',
      });
      s.addText(`${p.status_label || p.status} · revisión ${p.next_review_date || 'sin fecha'} · ${p.owner || 'sin responsable'}`, {
        x: 8.72, y: y + 0.24, w: 3.85, h: 0.46, fontSize: 8.5, fontFace: F.SANS, color: C.MUTE, lineSpacingMultiple: 1.2,
      });
    });
  } else {
    s.addText('Sin documentos registrados en el marco normativo de este proyecto.', {
      x: 8.55, y: 4.1, w: 3.9, h: 0.6, fontSize: 9, fontFace: F.SANS, italic: true, color: C.MUTE, lineSpacingMultiple: 1.25,
    });
  }

  ctx.footer(s);
}

// ════════════════════════════════════════════════════════════════════════════
// ACCIONES DEL PERIODO
// ════════════════════════════════════════════════════════════════════════════
export function acciones(ctx, D, gob) {
  const s = ctx.slide();
  ctx.head(s, {
    fase: 'Cierre',
    titulo: 'Acciones para el próximo periodo',
    subtitulo: 'Compromisos derivados de los indicadores de este informe, con responsable propuesto',
    control: 'SP 800-53r4 · PM-4',
  });

  // Las acciones se derivan del propio dato: no se listan si el indicador está en verde.
  const lista = [];
  const incumplidos = D.cumplimiento.Server.incumplidos + D.cumplimiento.Workstation.incumplidos;
  const obsoletas = (gob.politicas || []).filter(p => p.status === 'obsolete');

  if (incumplidos > 0) {
    lista.push({
      t: `Escalar los ${incumplidos} hallazgos fuera de plazo`,
      d: 'PROC-06 exige escalado a Responsable de Infraestructura al vencer, y al CISO a los 15 días para aceptación formal o priorización forzada.',
      r: 'Equipo SOC', c: C.CRIT,
    });
  }
  if (D.inventario.sinClasificar > 0) {
    lista.push({
      t: `Reclasificar los ${D.inventario.sinClasificar} endpoints sin tipo válido`,
      d: `Asignar Server o Workstation en el inventario. Incorpora ${D.porGrupo.sinClasificar.total} hallazgos a la medición de SLA y eleva la cobertura desde el ${D.inventario.coberturaClasificacion}%.`,
      r: 'Equipo Infraestructura', c: C.CRIT,
    });
  }
  if (D.cola.length > 0) {
    const hosts = [...new Set(D.cola.slice(0, 10).map(r => r.host))];
    const sws = [...new Set(D.cola.slice(0, 10).map(r => r.sw))];
    lista.push({
      t: `Actualizar ${sws.slice(0, 3).join(', ')}`,
      d: `Cierra la cabecera de la cola de remediación, concentrada en ${hosts.length} ${hosts.length === 1 ? 'activo' : 'activos'}. Convierte diez tareas de parcheo en ${hosts.length} ${hosts.length === 1 ? 'ventana' : 'ventanas'} de mantenimiento.`,
      r: 'Equipo Infraestructura', c: C.CRIT,
    });
  }
  // Severidades cuyo tiempo medio de cierre no cabe en el plazo acordado: el problema no
  // es un hallazgo concreto sino la capacidad de cierre, y se corrige con capacidad o
  // renegociando el plazo, no escalando caso a caso.
  const lentas = SEV_ORDER.filter(sev => {
    const b = D.remediacion.mttr.porSeveridad[sev];
    return b.n > 0 && Number.isFinite(b.slaDias) && b.media > b.slaDias;
  });
  if (lentas.length > 0) {
    const peor = D.remediacion.mttr.porSeveridad[lentas[0]];
    lista.push({
      t: `Recuperar el ritmo de cierre en severidad ${SEV_ES[lentas[0]].toLowerCase()}`,
      d: `El tiempo medio de remediación es de ${peor.media} días frente a los ${peor.slaDias} acordados. Mientras la media siga por encima del plazo, cada tanda nueva de hallazgos de esa severidad nace condenada a vencer: procede ampliar la ventana de mantenimiento o revisar el plazo con el Comité.`,
      r: 'Equipo Infraestructura', c: C.CRIT,
    });
  }
  if (D.remediacion.disponibilidad.abiertosSinParche > 0) {
    lista.push({
      t: `Decidir sobre los ${D.remediacion.disponibilidad.abiertosSinParche} hallazgos sin parche disponible`,
      d: 'No son accionables por parcheo: el fabricante no ha publicado arreglo. Cada uno necesita mitigación compensatoria o aceptación formal con caducidad, y hasta entonces envejece en el backlog consumiendo plazo de SLA.',
      r: 'CISO', c: C.HIGH,
    });
  }
  if (D.remediacion.aplicados.total === 0 && D.remediacion.disponibilidad.abiertosConParche > 0) {
    lista.push({
      t: 'Registrar los parches aplicados en la ventana de mantenimiento',
      d: `No consta ninguna declaración de parche, y hay ${D.remediacion.disponibilidad.abiertosConParche} hallazgos abiertos con arreglo ya publicado. Sin la declaración el hallazgo no se cierra, el riesgo del activo no baja y el trabajo hecho no queda acreditado como evidencia de SI-2.`,
      r: 'Equipo Infraestructura', c: C.HIGH,
    });
  }
  if (D.enriquecimiento.epss === 0 && D.enriquecimiento.total > 0) {
    lista.push({
      t: 'Ejecutar el enriquecimiento EPSS y KEV',
      d: 'Sin probabilidad de explotación la cola se ordena solo por CVSS y criticidad del activo. Es el mayor retorno por esfuerzo sobre la calidad de la priorización.',
      r: 'Equipo SOC', c: C.HIGH,
    });
  }
  obsoletas.slice(0, 1).forEach(p => {
    lista.push({
      t: `Cerrar la revisión de «${p.name}»`,
      d: `Revisión vencida el ${p.next_review_date || 'sin fecha'}. Mientras siga obsoleta no puede citarse como control vigente en una auditoría.`,
      r: p.owner || 'CISO', c: C.MED,
    });
  });
  if (D.cumplimiento.Workstation.total === 0) {
    lista.push({
      t: 'Dar de alta el parque de puestos de trabajo',
      d: 'El segundo acuerdo de nivel de servicio está definido pero no se aplica a ningún activo, así que no se puede evidenciar su cumplimiento.',
      r: 'Equipo Infraestructura', c: C.MED,
    });
  }

  if (lista.length === 0) {
    ctx.vacio(s, 'Ningún indicador del periodo requiere acción correctiva. Se mantiene la operativa habitual.');
    ctx.footer(s);
    return;
  }

  lista.slice(0, 5).forEach((a, i) => {
    const y = 1.72 + i * 0.98;
    s.addShape(ctx.pres.ShapeType.roundRect, {
      x: PAGE.M, y, w: CW, h: 0.86, fill: { color: C.PANEL }, line: { color: C.RULE, width: 0.6 }, rectRadius: 0.06,
    });
    s.addShape(ctx.pres.ShapeType.rect, { x: PAGE.M, y, w: 0.05, h: 0.86, fill: { color: a.c } });
    s.addText(String(i + 1), {
      x: PAGE.M + 0.16, y, w: 0.5, h: 0.86, fontSize: 17, fontFace: F.MONO, bold: true, color: a.c, align: 'center', valign: 'middle',
    });
    s.addText(a.t, {
      x: PAGE.M + 0.76, y: y + 0.13, w: 8.6, h: 0.3, fontSize: 11, fontFace: F.SANS, bold: true, color: C.TEXT, valign: 'middle',
    });
    s.addText(a.d, {
      x: PAGE.M + 0.76, y: y + 0.42, w: 8.6, h: 0.38, fontSize: 8.5, fontFace: F.SANS, color: C.MUTE, lineSpacingMultiple: 1.2,
    });
    s.addText('RESPONSABLE', {
      x: PAGE.M + 9.55, y: y + 0.16, w: 2.4, h: 0.2, fontSize: 7, fontFace: F.MONO, color: C.MUTE, charSpacing: 1, align: 'right',
    });
    s.addText(a.r, {
      x: PAGE.M + 9.55, y: y + 0.36, w: 2.4, h: 0.3, fontSize: 9.5, fontFace: F.SANS, color: C.TEXT_2, align: 'right', valign: 'middle',
    });
  });

  ctx.nota(s, {
    x: PAGE.M, y: 6.62, w: CW,
    text: 'Las acciones se derivan automáticamente de los indicadores del periodo: si un indicador vuelve a verde, su acción desaparece del informe siguiente. Las fechas límite las fija el Comité en la revisión.',
  });

  ctx.footer(s);
}

// ════════════════════════════════════════════════════════════════════════════
// TRAZABILIDAD DE CONTROLES Y METODOLOGÍA
// ════════════════════════════════════════════════════════════════════════════
export function trazabilidad(ctx) {
  const s = ctx.slide();
  ctx.head(s, {
    fase: 'Anexo',
    titulo: 'Trazabilidad de controles y metodología',
    subtitulo: 'Qué sección acredita qué control, y con qué fórmula se calcula cada indicador',
  });

  const filas = [
    ['CM-8', 'Inventario de componentes del sistema', 'Inventario y grupos de mantenimiento', '1'],
    ['RA-5', 'Escaneo de vulnerabilidades', 'Cobertura del análisis y calidad del dato', '1'],
    ['RA-3', 'Evaluación de riesgos', 'Panorama por severidad · Matriz de decisión · Concentración por táctica', '2'],
    ['SI-2', 'Corrección de errores (flaw remediation)', 'Cumplimiento de SLA · Cola priorizada · Parches de software · Remediación de contenedores (NIST SP 800-190)', '3'],
    ['CM-3', 'Control de cambios de configuración', 'Procedimiento de despliegue por anillos · Declaración y verificación de parches en software y runtime', '3'],
    ['CA-7', 'Monitorización continua', 'Cadencia semanal y mensual del informe · Recálculo periódico de riesgo · Ritmo de remediación (MTTR)', '4'],
    ['SI-5', 'Alertas y avisos de seguridad', 'Inteligencia de amenazas · Matriz ATT&CK · Actores correlacionados', '4'],
    ['PM-1', 'Programa de seguridad de la información', 'Gobierno documental y matriz RACI', '4'],
    ['PM-4', 'Plan de acción e hitos', 'Acciones para el próximo periodo', '—'],
  ];

  const header = [ctx.th('CONTROL'), ctx.th('DENOMINACIÓN'), ctx.th('EVIDENCIA EN ESTE INFORME'), ctx.th('FASE', { align: 'center' })];
  const rows = filas.map((r, i) => {
    const bg = i % 2 === 0 ? C.PANEL : C.PANEL_2;
    return [
      ctx.td(r[0], { color: C.NIST, bold: true, mono: true, fill: bg }),
      ctx.td(r[1], { color: C.TEXT, fill: bg }),
      ctx.td(r[2], { color: C.TEXT_2, fill: bg }),
      ctx.td(r[3], { align: 'center', color: C.MUTE, mono: true, fill: bg }),
    ];
  });

  s.addTable([header, ...rows], {
    x: PAGE.M, y: 1.7, w: CW,
    colW: [1.1, 3.9, 6.13, 1.1],
    rowH: 0.36,
    border: { type: 'solid', pt: 0.4, color: C.RULE },
    autoPage: false,
  });

  s.addShape(ctx.pres.ShapeType.roundRect, {
    x: PAGE.M, y: 5.42, w: CW, h: 1.18, fill: { color: C.PANEL }, line: { color: C.RULE, width: 0.6 }, rectRadius: 0.06,
  });
  s.addText('MÉTODO DE CÁLCULO', {
    x: PAGE.M + 0.26, y: 5.56, w: 5, h: 0.22, fontSize: 8, fontFace: F.MONO, bold: true, color: C.ACCENT, charSpacing: 1.2,
  });
  s.addText(
    'riesgo = probabilidad × exposición × factor de remediación × impacto     ·     prioridad = riesgo × criticidad del activo × urgencia / máximo teórico\n' +
    'fecha límite = fecha de detección + días del par (grupo de mantenimiento, severidad)     ·     cumplimiento = hallazgos en plazo ÷ hallazgos del grupo\n' +
    'MTTR = media de (fecha de cierre − fecha de detección) sobre los hallazgos cerrados     ·     backlog accionable = hallazgos abiertos con parche publicado ÷ hallazgos abiertos',
    { x: PAGE.M + 0.26, y: 5.8, w: CW - 0.55, h: 0.7, fontSize: 8.5, fontFace: F.MONO, color: C.TEXT_2, lineSpacingMultiple: 1.45 }
  );

  ctx.footer(s);
}

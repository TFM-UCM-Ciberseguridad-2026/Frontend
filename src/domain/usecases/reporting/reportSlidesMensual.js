/**
 * reportSlidesMensual — láminas exclusivas del informe mensual.
 *
 * El semanal es operativo: qué hay que cerrar y en qué plazo. El mensual es de gobierno:
 * bajo qué marco se decide, quién responde de cada actividad y de qué control es evidencia
 * cada cifra. Estas secciones cambian de mes a mes como mucho, así que repetirlas cada semana
 * solo conseguiría que se dejara de leer el informe.
 */

import { C, F, PAGE, CW } from './reportKit.js';

// ════════════════════════════════════════════════════════════════════════════
// ÍNDICE
// ════════════════════════════════════════════════════════════════════════════
export function indice(ctx, secciones) {
  const s = ctx.slide();
  ctx.head(s, {
    fase: 'Índice',
    titulo: 'Contenido del informe',
    subtitulo: 'El marco normativo, la situación del periodo, la eficacia del parcheo y el gobierno del proceso',
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
// TRAZABILIDAD DE CONTROLES
// ════════════════════════════════════════════════════════════════════════════
export function trazabilidad(ctx) {
  const s = ctx.slide();
  ctx.head(s, {
    fase: 'Anexo',
    titulo: 'Trazabilidad de controles',
    subtitulo: 'Qué sección acredita cada control SP 800-53',
  });

  const filas = [
    ['CM-8', 'Inventario de componentes del sistema', 'Inventario y grupos de mantenimiento', '1'],
    ['RA-5', 'Escaneo de vulnerabilidades', 'Cobertura del análisis y calidad del dato', '1'],
    ['RA-3', 'Evaluación de riesgos', 'Panorama por severidad · Concentración por táctica', '2'],
    ['SI-2', 'Corrección de errores (flaw remediation)', 'Cumplimiento de SLA · Cola priorizada · Parches de software · Remediación de contenedores (NIST SP 800-190)', '3'],
    ['CM-3', 'Control de cambios de configuración', 'Procedimiento de despliegue por anillos · Declaración y verificación de parches en software y runtime', '3'],
    ['CA-7', 'Monitorización continua', 'Cadencia semanal y mensual del informe · Recálculo periódico de riesgo · Ritmo de remediación (MTTR)', '4'],
    ['SI-5', 'Alertas y avisos de seguridad', 'Inteligencia de amenazas · Actores correlacionados', '4'],
    ['PM-1', 'Programa de seguridad de la información', 'Gobierno documental y matriz RACI', '4'],
    ['PM-4', 'Plan de acción e hitos', 'Situación del mes: valoración y puntos de decisión', '—'],
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

  ctx.footer(s);
}

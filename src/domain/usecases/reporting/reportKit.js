/**
 * reportKit — sistema visual y componentes comunes de los informes PPTX.
 *
 * El informe semanal y el mensual comparten identidad, retícula y piezas: separarlos aquí
 * evita que el diseño se bifurque en cuanto alguien retoque uno de los dos.
 *
 * Dos reglas de color que conviene no romper:
 *   · el violeta de marca NUNCA codifica severidad;
 *   · el turquesa se reserva a la capa normativa (fases NIST, etiquetas de control),
 *     para que el marco de cumplimiento se lea como un sistema distinto del de los datos.
 */

export const C = {
  INK: '0B0C12',       // fondo de lámina
  PANEL: '14161F',     // tarjeta
  PANEL_2: '1B1E29',   // fila alterna / relleno secundario
  RULE: '2A2E3D',      // filetes
  RULE_SOFT: '1F2230',
  TEXT: 'E8EAF2',
  TEXT_2: 'B4BACB',
  MUTE: '7F8699',

  ACCENT: '7973FF',    // violeta de marca
  ACCENT_D: '211E3F',

  NIST: '00BFD1',      // capa normativa
  NIST_D: '0A2B31',

  CONT: '6E9BFF',      // grupo de contenedores

  CRIT: 'E5484D',
  HIGH: 'F76B15',
  MED: 'E5B700',
  LOW: '30A46C',
  OK: '30A46C',
  WARN: 'E5B700',
  BAD: 'E5484D',

  // Fondos tenues para avisos
  BG_CRIT: '2A1114',
  BG_WARN: '241C05',
  BG_OK: '0C2117',
  BG_HIGH: '281405',
};

// PPTX no admite pilas de respaldo de fuente: se usan dos que existen en Windows y macOS.
// La monoespaciada queda solo para identificadores y cifras; el texto corrido va en Arial,
// porque con sustitución de fuente la monoespaciada se degrada de forma muy visible.
export const F = { SANS: 'Arial', MONO: 'Consolas' };

export const PAGE = { W: 13.33, H: 7.5, M: 0.55 };
export const CW = PAGE.W - PAGE.M * 2;

/**
 * Convierte los "\n" de una lista de runs en `breakLine` explícitos. pptxgenjs 4.0.1 marca
 * con salto todos los trozos de un texto partido, también el último, así que el run
 * siguiente acababa en un párrafo aparte.
 */
function partirSaltos(runs) {
  if (!Array.isArray(runs)) return runs;
  const out = [];
  runs.forEach(r => {
    const trozos = String(r.text ?? '').split('\n');
    trozos.forEach((t, i) => {
      if (i > 0) {
        const prev = out[out.length - 1];
        if (prev) prev.options = { ...prev.options, breakLine: true };
        else out.push({ text: '', options: { ...r.options, breakLine: true } });
      }
      if (t !== '' || i === trozos.length - 1) out.push({ text: t, options: { ...r.options } });
    });
  });
  return out;
}

export const SEV_COLOR = { Critical: C.CRIT, High: C.HIGH, Medium: C.MED, Low: C.LOW };
export const SEV_ES = { Critical: 'Crítica', High: 'Alta', Medium: 'Media', Low: 'Baja' };
export const SEV_ORDER = ['Critical', 'High', 'Medium', 'Low'];

export const CAT_LABEL = { Server: 'Servidores', Workstation: 'Puestos de trabajo', Container: 'Contenedores' };
export const CAT_COLOR = { Server: C.NIST, Workstation: C.ACCENT, Container: C.CONT };

/**
 * Grupos con acuerdo de nivel de servicio propio, en orden de presentación. Los contenedores
 * van aparte de los endpoints porque su ciclo de vida es otro (NIST SP 800-190): la imagen no
 * se parchea, se reconstruye y se redespliega.
 */
export const GRUPOS_SLA = ['Server', 'Workstation', 'Container'];

/**
 * Contexto de construcción del informe. Lleva la presentación, el contador de páginas y los
 * metadatos de cabecera y pie, para que cada lámina no tenga que recibirlos por separado.
 */
export class ReportCtx {
  constructor(pres, meta) {
    this.pres = pres;
    this.meta = meta;      // { proyecto, periodo, ciclo, emitido, ... }
    this.pageNo = 0;
  }

  slide() {
    const s = this.pres.addSlide();
    s.background = { color: C.INK };
    return s;
  }

  /** Pie con marca de clasificación, contexto y número de lámina. */
  footer(s) {
    this.pageNo += 1;
    const { pres, meta } = this;
    s.addShape(pres.ShapeType.rect, { x: PAGE.M, y: 6.92, w: CW, h: 0.012, fill: { color: C.RULE_SOFT } });
    s.addText('TLP:AMBER — Distribución restringida al Comité de Seguridad', {
      x: PAGE.M, y: 7.02, w: 7.5, h: 0.28,
      fontSize: 8, fontFace: F.SANS, color: C.MUTE, valign: 'middle',
    });
    s.addText(`${meta.proyecto}  ·  ${meta.ciclo}`, {
      x: PAGE.M + 7.5, y: 7.02, w: CW - 8.0, h: 0.28,
      fontSize: 8, fontFace: F.SANS, color: C.MUTE, align: 'right', valign: 'middle',
    });
    s.addText(String(this.pageNo).padStart(2, '0'), {
      x: PAGE.W - PAGE.M - 0.45, y: 7.02, w: 0.45, h: 0.28,
      fontSize: 9, fontFace: F.MONO, bold: true, color: C.ACCENT, align: 'right', valign: 'middle',
    });
  }

  /** Cabecera de lámina de contenido. */
  head(s, { fase, titulo, subtitulo, control }) {
    const { pres } = this;
    if (fase) {
      s.addText(String(fase).toUpperCase(), {
        x: PAGE.M, y: 0.38, w: 8, h: 0.24,
        fontSize: 9, fontFace: F.MONO, bold: true, color: C.NIST, charSpacing: 1.6, valign: 'middle',
      });
    }
    s.addText(titulo, {
      x: PAGE.M, y: 0.63, w: 9.2, h: 0.46,
      fontSize: 22, fontFace: F.SANS, bold: true, color: C.TEXT, valign: 'middle',
    });
    if (subtitulo) {
      s.addText(subtitulo, {
        x: PAGE.M, y: 1.08, w: 9.2, h: 0.3,
        fontSize: 10.5, fontFace: F.SANS, color: C.MUTE, valign: 'middle',
      });
    }
    if (control) this.controlTag(s, control);

    const ruleY = subtitulo ? 1.46 : 1.22;
    s.addShape(pres.ShapeType.rect, { x: PAGE.M, y: ruleY, w: CW, h: 0.018, fill: { color: C.RULE } });
    s.addShape(pres.ShapeType.rect, { x: PAGE.M, y: ruleY, w: 1.1, h: 0.018, fill: { color: C.ACCENT } });
  }

  /** Píldora que identifica de qué control SP 800-53 es evidencia la lámina. */
  controlTag(s, texto) {
    const w = 3.15;
    const x = PAGE.W - PAGE.M - w;
    s.addShape(this.pres.ShapeType.roundRect, {
      x, y: 0.52, w, h: 0.42,
      fill: { color: C.NIST_D }, line: { color: C.NIST, width: 0.75 }, rectRadius: 0.06,
    });
    s.addText(texto, {
      x, y: 0.52, w, h: 0.42,
      fontSize: 8.5, fontFace: F.MONO, color: C.NIST, align: 'center', valign: 'middle',
    });
  }

  /**
   * Tarjeta de indicador. El cuerpo se ajusta al largo del valor: cifras de texto como
   * "CRITICAL" partían la palabra en dos líneas y tapaban la etiqueta.
   */
  kpi(s, { x, y, w, h = 1.32, label, value, sub, color = C.TEXT, accent }) {
    const { pres } = this;
    s.addShape(pres.ShapeType.roundRect, {
      x, y, w, h, fill: { color: C.PANEL }, line: { color: C.RULE, width: 0.75 }, rectRadius: 0.07,
    });
    if (accent) s.addShape(pres.ShapeType.rect, { x, y, w: 0.045, h, fill: { color: accent } });

    s.addText(String(label).toUpperCase(), {
      x: x + 0.22, y: y + 0.14, w: w - 0.4, h: 0.24,
      fontSize: 8, fontFace: F.MONO, color: C.MUTE, charSpacing: 1.1, valign: 'middle',
    });

    const txt = String(value);
    const size = txt.length <= 4 ? 30 : txt.length <= 6 ? 25 : txt.length <= 9 ? 19 : 15;
    s.addText(txt, {
      x: x + 0.2, y: y + 0.36, w: w - 0.38, h: 0.56,
      fontSize: size, fontFace: F.SANS, bold: true, color, valign: 'middle', wrap: false,
    });

    if (sub) {
      s.addText(sub, {
        x: x + 0.22, y: y + 0.94, w: w - 0.4, h: 0.28,
        fontSize: 8.5, fontFace: F.SANS, color: C.TEXT_2, valign: 'top',
      });
    }
  }

  /** Píldora de estado. */
  chip(s, { x, y, w, h = 0.3, text, color, dim }) {
    s.addShape(this.pres.ShapeType.roundRect, {
      x, y, w, h, fill: { color: dim }, line: { color, width: 0.75 }, rectRadius: 0.05,
    });
    s.addText(text, {
      x, y, w, h, fontSize: 8.5, fontFace: F.MONO, bold: true,
      color, align: 'center', valign: 'middle',
    });
  }

  /** Recuadro de lectura: el párrafo que explica qué significa el dato de la lámina. */
  callout(s, { x, y, w, h, titulo, runs, color = C.ACCENT, fill = C.PANEL, borde = C.RULE }) {
    const { pres } = this;
    s.addShape(pres.ShapeType.roundRect, {
      x, y, w, h, fill: { color: fill }, line: { color: borde, width: 0.75 }, rectRadius: 0.08,
    });
    s.addShape(pres.ShapeType.rect, { x, y, w: 0.045, h, fill: { color } });
    if (titulo) {
      s.addText(titulo.toUpperCase(), {
        x: x + 0.26, y: y + 0.14, w: w - 0.5, h: 0.24,
        fontSize: 8.5, fontFace: F.MONO, bold: true, color, charSpacing: 1.3,
      });
    }
    s.addText(partirSaltos(runs), {
      x: x + 0.26, y: y + (titulo ? 0.4 : 0.16), w: w - 0.55, h: h - (titulo ? 0.55 : 0.32),
      fontSize: 9.5, fontFace: F.SANS, lineSpacingMultiple: 1.3, valign: 'top',
    });
  }

  /** Nota al pie de lámina, en cursiva y tono apagado. */
  nota(s, { x, y, w, text }) {
    s.addText(text, {
      x, y, w, h: 0.5,
      fontSize: 8.5, fontFace: F.SANS, italic: true, color: C.MUTE, valign: 'top',
    });
  }

  /** Barra horizontal dibujada a mano: da control exacto sobre escala y etiquetas. */
  bar(s, { x, y, w, h = 0.17, value, max, color, bg = C.PANEL_2 }) {
    const { pres } = this;
    s.addShape(pres.ShapeType.rect, { x, y, w, h, fill: { color: bg } });
    if (value > 0 && max > 0) {
      s.addShape(pres.ShapeType.rect, {
        x, y, w: Math.max((w * value) / max, 0.03), h, fill: { color },
      });
    }
  }

  /** Franja apilada por severidad, normalizada al total. */
  severityStrip(s, { x, y, w, h = 0.4, counts }) {
    const total = SEV_ORDER.reduce((a, k) => a + (counts[k] || 0), 0);
    if (total === 0) {
      s.addShape(this.pres.ShapeType.rect, { x, y, w, h, fill: { color: C.PANEL_2 } });
      s.addText('Sin hallazgos', {
        x, y, w, h, fontSize: 9, fontFace: F.SANS, italic: true, color: C.MUTE,
        align: 'center', valign: 'middle',
      });
      return;
    }
    let cx = x;
    SEV_ORDER.forEach(sev => {
      const n = counts[sev] || 0;
      if (n === 0) return;
      const sw = (w * n) / total;
      s.addShape(this.pres.ShapeType.rect, { x: cx, y, w: sw, h, fill: { color: SEV_COLOR[sev] } });
      if (sw > 0.9) {
        s.addText(`${SEV_ES[sev]}  ${n}`, {
          x: cx, y, w: sw, h, fontSize: 9, fontFace: F.SANS, bold: true,
          color: sev === 'Medium' ? '1A1400' : 'FFFFFF', align: 'center', valign: 'middle',
        });
      }
      cx += sw;
    });
  }

  // ── Celdas de tabla ────────────────────────────────────────────────────
  th(text, { align = 'left' } = {}) {
    return {
      text,
      options: {
        bold: true, color: C.NIST, fill: { color: C.NIST_D },
        fontSize: 9, fontFace: F.MONO, align, valign: 'middle',
      },
    };
  }

  td(text, { align = 'left', color = C.TEXT_2, bold = false, mono = false, fill } = {}) {
    return {
      text,
      options: {
        color, bold, fontSize: 9.5, fontFace: mono ? F.MONO : F.SANS,
        align, valign: 'middle', fill: { color: fill },
      },
    };
  }

  /** Portada común a los dos informes. Cuenta como página pero no lleva pie. */
  portada(s, { titulo, eyebrow, riesgoTier }) {
    const { pres, meta } = this;

    s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: PAGE.W, h: 0.07, fill: { color: C.ACCENT } });

    s.addText('CONFORME A', {
      x: 8.4, y: 0.62, w: 4.38, h: 0.22,
      fontSize: 8, fontFace: F.MONO, color: C.MUTE, charSpacing: 1.4, align: 'right',
    });
    s.addText('NIST SP 800-40 Rev. 4', {
      x: 8.4, y: 0.84, w: 4.38, h: 0.3,
      fontSize: 13, fontFace: F.SANS, bold: true, color: C.NIST, align: 'right',
    });
    s.addText('Guide to Enterprise Patch Management Planning\nEvidencia de controles SP 800-53 Rev. 4', {
      x: 8.4, y: 1.14, w: 4.38, h: 0.6,
      fontSize: 8.5, fontFace: F.SANS, color: C.MUTE, align: 'right', lineSpacingMultiple: 1.3,
    });

    s.addText(eyebrow.toUpperCase(), {
      x: PAGE.M, y: 2.35, w: 8, h: 0.34,
      fontSize: 12, fontFace: F.MONO, color: C.ACCENT, charSpacing: 3.2, valign: 'middle',
    });
    s.addText(titulo, {
      x: PAGE.M, y: 2.72, w: 9.5, h: 1.9,
      fontSize: 46, fontFace: F.SANS, bold: true, color: C.TEXT,
      lineSpacingMultiple: 1.06, valign: 'top',
    });
    s.addShape(pres.ShapeType.rect, { x: PAGE.M, y: 4.78, w: 2.6, h: 0.035, fill: { color: C.ACCENT } });
    s.addText(meta.proyecto, {
      x: PAGE.M, y: 5.0, w: 8, h: 0.4,
      fontSize: 17, fontFace: F.SANS, color: C.TEXT_2, valign: 'middle',
    });

    const campos = [
      ['Periodo', meta.periodo], ['Emitido', meta.emitido],
      ['Elaborado por', meta.autor], ['Dirigido a', meta.destinatario],
    ];
    campos.forEach(([k, v], i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const mx = PAGE.M + col * 4.3, my = 5.55 + row * 0.52;
      s.addText(k.toUpperCase(), {
        x: mx, y: my, w: 4.1, h: 0.2, fontSize: 7.5, fontFace: F.MONO, color: C.MUTE, charSpacing: 1.2,
      });
      s.addText(v, {
        x: mx, y: my + 0.19, w: 4.1, h: 0.26, fontSize: 10.5, fontFace: F.SANS, color: C.TEXT, valign: 'middle',
      });
    });

    if (riesgoTier) {
      const col = riesgoTier === 'CRITICAL' ? C.CRIT : riesgoTier === 'HIGH' ? C.HIGH
        : riesgoTier === 'MEDIUM' ? C.MED : C.LOW;
      const dim = riesgoTier === 'CRITICAL' ? C.BG_CRIT : riesgoTier === 'HIGH' ? C.BG_HIGH
        : riesgoTier === 'MEDIUM' ? C.BG_WARN : C.BG_OK;
      this.chip(s, { x: 10.55, y: 5.62, w: 2.23, h: 0.62, text: `RIESGO ${riesgoTier}`, color: col, dim });
    }

    s.addShape(pres.ShapeType.rect, { x: 0, y: 7.43, w: PAGE.W, h: 0.07, fill: { color: C.ACCENT } });
    this.pageNo += 1;
  }

  /** Divisor de fase del ciclo NIST SP 800-40 Rev. 4. Solo lo usa el informe mensual. */
  divisor(s, { n, titulo, cita, controles }) {
    const { pres } = this;
    s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 0.14, h: PAGE.H, fill: { color: C.NIST } });

    s.addText(`FASE ${n}`, {
      x: 1.1, y: 2.55, w: 6, h: 0.34,
      fontSize: 11, fontFace: F.MONO, bold: true, color: C.NIST, charSpacing: 3,
    });
    s.addText(titulo, {
      x: 1.1, y: 2.95, w: 8.6, h: 1.5,
      fontSize: 34, fontFace: F.SANS, bold: true, color: C.TEXT, lineSpacingMultiple: 1.1, valign: 'top',
    });
    s.addShape(pres.ShapeType.rect, { x: 1.1, y: 4.55, w: 1.9, h: 0.03, fill: { color: C.ACCENT } });
    s.addText(cita, {
      x: 1.1, y: 4.8, w: 8.2, h: 0.85,
      fontSize: 11.5, fontFace: F.SANS, italic: true, color: C.MUTE, lineSpacingMultiple: 1.35,
    });
    s.addText(`NIST SP 800-40 Rev. 4  ·  Evidencia de ${controles}`, {
      x: 1.1, y: 5.8, w: 8.2, h: 0.3, fontSize: 9, fontFace: F.MONO, color: C.NIST,
    });

    for (let i = 1; i <= 4; i++) {
      const x = 10.4 + (i - 1) * 0.62;
      const activa = i === n;
      s.addShape(pres.ShapeType.roundRect, {
        x, y: 3.35, w: 0.46, h: 0.46,
        fill: { color: activa ? C.NIST : C.PANEL },
        line: { color: activa ? C.NIST : C.RULE, width: 0.75 }, rectRadius: 0.08,
      });
      s.addText(String(i), {
        x, y: 3.35, w: 0.46, h: 0.46, fontSize: 10, fontFace: F.MONO, bold: true,
        color: activa ? C.INK : C.MUTE, align: 'center', valign: 'middle',
      });
    }
    this.footer(s);
  }

  /** Mensaje centrado para una lámina cuyo conjunto de datos viene vacío. */
  vacio(s, mensaje) {
    s.addText(mensaje, {
      x: PAGE.M, y: 3.2, w: CW, h: 1,
      fontSize: 14, fontFace: F.SANS, italic: true, color: C.MUTE, align: 'center', valign: 'middle',
    });
  }
}

/**
 * Recorta un texto a `max` caracteres. Las celdas de las tablas no ajustan de línea: un
 * nombre largo se comería la columna de al lado, y es mejor perder la cola que la vecina.
 */
export function recortar(texto, max) {
  const t = String(texto ?? '');
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** Formatea una fecha ISO o Date como "2 sep 2026". */
export function fechaCorta(d) {
  const f = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(f.getTime())) return '—';
  return f.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Formatea una fecha como "2 de septiembre de 2026". */
export function fechaLarga(d) {
  const f = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(f.getTime())) return '—';
  return f.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

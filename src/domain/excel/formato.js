/**
 * Helpers de construcción de hojas para el informe técnico en Excel.
 *
 * Dos reglas que gobiernan todo este módulo:
 *
 * 1. Una celda sin dato se queda VACÍA. Nada de 'N/A', 'LAN', 'Running' ni
 *    'Activo': un relleno inventado es indistinguible de un dato medido, y quien
 *    lee la hoja no puede saber cuál es cuál. El hueco es información; el relleno
 *    falso, no.
 * 2. Lo que es un número viaja como número, y lo que es una fecha como fecha. Si
 *    la puntuación CVSS llega como texto, Excel no la ordena ni la filtra por
 *    rango, que es justo para lo que sirve una hoja de cálculo.
 *
 * Se escribe con ExcelJS y no con SheetJS community porque esta última no emite
 * ni paneles congelados ni rellenos de color: comprobado inspeccionando el XML
 * generado, styles.xml salía con los dos únicos fills por defecto.
 */

import ExcelJS from 'exceljs';

/** Tipos de columna admitidos. */
export const T = {
  TEXTO: 'texto',
  ENTERO: 'entero',
  DECIMAL: 'decimal',   // 1 decimal: CVSS, días
  DECIMAL2: 'decimal2', // 2 decimales: scores de riesgo y prioridad
  PORCENTAJE: 'porcentaje',
  FECHA: 'fecha',
  BOOL: 'bool',
};

const FORMATO_NUMERO = {
  [T.ENTERO]: '0',
  [T.DECIMAL]: '0.0',
  [T.DECIMAL2]: '0.00',
  [T.PORCENTAJE]: '0.0%',
  [T.FECHA]: 'yyyy-mm-dd hh:mm',
};

/**
 * Paleta del libro. La cabecera es oscura y el cuerpo claro para que se
 * distingan de un vistazo aunque la fila esté congelada; las severidades y los
 * tiers usan la misma escala en todas las hojas, de modo que un CRITICAL se
 * reconozca igual en Endpoints que en la cola de remediación.
 */
export const PALETA = {
  cabeceraFondo: 'FF1F3864',
  cabeceraTexto: 'FFFFFFFF',
  bandaFondo: 'FFF4F6F9',
  tituloTexto: 'FF1F3864',
  seccionFondo: 'FFDCE3EF',
  borde: 'FFB8C2D0',
};

/** Escala de severidad y de tier de riesgo, compartida por todas las hojas. */
const ESCALA = {
  critical: { fondo: 'FFF8CBCB', texto: 'FF8B0000', negrita: true },
  high: { fondo: 'FFFDE0C8', texto: 'FF9C4400', negrita: true },
  medium: { fondo: 'FFFFF3C4', texto: 'FF7A5C00', negrita: false },
  low: { fondo: 'FFDDEFD6', texto: 'FF2E6B2E', negrita: false },
  none: { fondo: 'FFECEFF3', texto: 'FF5A6472', negrita: false },
};

function estiloDeValor(valor) {
  if (typeof valor !== 'string') return null;
  return ESCALA[valor.trim().toLowerCase()] || null;
}

/** Nombres de hoja: Excel corta en 31 caracteres y prohíbe : \ / ? * [ ] */
export function nombreDeHoja(nombre) {
  return String(nombre).replace(/[:\\/?*[\]]/g, '-').slice(0, 31);
}

/**
 * Convierte a número. Devuelve null —celda vacía— si no lo es, en vez del 0 que
 * disfrazaría de "sin riesgo" un dato que en realidad falta.
 */
export function aNumero(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

/**
 * Convierte a Date. El grafo devuelve fechas de tres formas: ISO con precisión de
 * nanosegundos ("2026-08-21T09:05:33.763196388Z"), epoch en milisegundos
 * (1788525161840) y, en algunas rutas del driver, ISO con sufijo de zona entre
 * corchetes ("...Z[UTC]"), que Date no sabe parsear y hay que limpiar.
 */
export function aFecha(v) {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === 'number') {
    // Por debajo de ~1e12 es epoch en segundos, no en milisegundos.
    const ms = v > 1e12 ? v : v * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const limpio = String(v).replace(/\[[^\]]*\]$/, '').trim();
  if (!limpio) return null;
  const d = new Date(limpio);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Centinelas de "no hay dato" que llegan como texto desde el backend. El origen
 * conocido es `coalesce(s.version, 'N/A')` en la consulta de la cola de parcheo
 * (risk.go), que mete 173 celdas con la cadena "N/A" en el proyecto de validación.
 * Se normalizan a celda vacía aquí, en la conversión, en lugar de cambiar el
 * contrato de la API: ninguno de estos textos es un valor legítimo en las columnas
 * donde aparecen, y una celda vacía dice lo mismo sin fingir contenido.
 */
const CENTINELAS_VACIO = new Set(['n/a', 'na', 'null', 'undefined', 'nil', 'none', '-', '--']);

/** Texto. Las listas se unen con coma; el vacío queda vacío, no como 'N/A'. */
export function aTexto(v) {
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) {
    const partes = v.map(x => aTexto(x)).filter(Boolean);
    return partes.length > 0 ? partes.join(', ') : null;
  }
  const s = String(v).trim();
  if (s === '' || CENTINELAS_VACIO.has(s.toLowerCase())) return null;
  return s;
}

/** Booleano legible. Un campo ausente no es "No": se queda vacío. */
export function aBool(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  const s = String(v).trim().toLowerCase();
  if (['true', '1', 'sí', 'si', 'yes'].includes(s)) return 'Sí';
  if (['false', '0', 'no'].includes(s)) return 'No';
  return null;
}

function convertir(valor, tipo) {
  switch (tipo) {
    case T.ENTERO:
    case T.DECIMAL:
    case T.DECIMAL2:
    case T.PORCENTAJE:
      return aNumero(valor);
    case T.FECHA:
      return aFecha(valor);
    case T.BOOL:
      return aBool(valor);
    default:
      return aTexto(valor);
  }
}

/** Ancho por contenido, acotado para que ninguna columna se coma la pantalla. */
function anchoDeColumna(columna, celdas) {
  if (columna.ancho) return columna.ancho;
  let max = String(columna.titulo).length;
  for (const c of celdas) {
    if (c === null || c === undefined) continue;
    const largo = c instanceof Date ? 16 : String(c).length;
    if (largo > max) max = largo;
    if (max >= 60) break;
  }
  return Math.min(Math.max(max + 2, 9), 60);
}

function pintarCabecera(hoja, nColumnas) {
  const fila = hoja.getRow(1);
  fila.height = 22;
  for (let c = 1; c <= nColumnas; c += 1) {
    const celda = fila.getCell(c);
    celda.font = { bold: true, color: { argb: PALETA.cabeceraTexto }, size: 11 };
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA.cabeceraFondo } };
    celda.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    celda.border = { bottom: { style: 'thin', color: { argb: PALETA.borde } } };
  }
  fila.commit?.();
}

/** Crea el libro. Se expone para que el caso de uso no importe ExcelJS. */
export function crearLibro() {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'Orquestador de Infraestructura';
  libro.created = new Date();
  return libro;
}

/** Serializa el libro a Blob listo para descargar. */
export async function libroABlob(libro) {
  const buffer = await libro.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Construye una hoja tabular a partir de una especificación de columnas.
 *
 * @param {Object} libro     libro de ExcelJS
 * @param {string} nombre    nombre de la pestaña
 * @param {Array}  columnas  [{ clave, titulo, tipo, ancho? }]
 * @param {Array}  filas     objetos con las claves de `columnas`
 */
export function construirHoja(libro, nombre, columnas, filas) {
  const hoja = libro.addWorksheet(nombreDeHoja(nombre), {
    // La cabecera queda fija al desplazarse: con 751 hallazgos y 29 columnas, sin
    // esto se pierde de vista a las tres filas y las columnas dejan de tener nombre.
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  const cuerpo = filas.map(f => columnas.map(c => convertir(f[c.clave], c.tipo)));

  hoja.columns = columnas.map((c, i) => ({
    header: c.titulo,
    key: c.clave,
    width: anchoDeColumna(c, cuerpo.map(f => f[i])),
  }));

  pintarCabecera(hoja, columnas.length);

  cuerpo.forEach((valores, iFila) => {
    const fila = hoja.addRow(valores);
    const bandeada = iFila % 2 === 1;

    valores.forEach((valor, iCol) => {
      const celda = fila.getCell(iCol + 1);
      const formato = FORMATO_NUMERO[columnas[iCol].tipo];
      if (formato) celda.numFmt = formato;

      const escala = estiloDeValor(valor);
      if (escala) {
        celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: escala.fondo } };
        celda.font = { color: { argb: escala.texto }, bold: escala.negrita };
      } else if (bandeada) {
        celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA.bandaFondo } };
      }
    });
  });

  // El autofiltro solo tiene sentido si hay algo que filtrar.
  if (filas.length > 0) {
    hoja.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: filas.length + 1, column: columnas.length },
    };
  }

  return hoja;
}

/**
 * Hoja libre de pares etiqueta/valor, para portada y dashboard, donde la
 * estructura no es tabular y el autofiltro estorbaría.
 *
 * Una fila con texto solo en la primera celda se trata como encabezado de sección
 * y se pinta como tal: es lo que da estructura visible a un dashboard que por
 * dentro no es más que una lista de pares.
 */
export function construirHojaLibre(libro, nombre, filas, anchos = [42, 26, 60]) {
  const hoja = libro.addWorksheet(nombreDeHoja(nombre));
  hoja.columns = anchos.map(w => ({ width: w }));

  filas.forEach((valores, i) => {
    const fila = hoja.addRow(valores);
    const soloPrimera = valores.length === 1 && valores[0];
    const esTitulo = i === 0;
    const esSeccion = soloPrimera && !esTitulo;
    const esCabeceraDeBloque = valores.length > 1 && typeof valores[1] === 'string'
      && ['Valor', 'Nº', 'Riesgo'].includes(valores[1]);

    if (esTitulo) {
      fila.height = 26;
      fila.getCell(1).font = { bold: true, size: 15, color: { argb: PALETA.tituloTexto } };
      return;
    }

    if (esSeccion || esCabeceraDeBloque) {
      fila.height = 20;
      for (let c = 1; c <= Math.max(anchos.length, valores.length); c += 1) {
        const celda = fila.getCell(c);
        celda.font = { bold: true, color: { argb: PALETA.tituloTexto } };
        celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA.seccionFondo } };
        celda.border = { bottom: { style: 'thin', color: { argb: PALETA.borde } } };
      }
      return;
    }

    // Sin columnas tipadas no hay forma de saber qué es cada celda, así que se
    // deduce del propio valor: las fechas con formato de fecha y los decimales a
    // dos cifras, para que un score no se lea como 0.9719947092335482.
    valores.forEach((valor, iCol) => {
      const celda = fila.getCell(iCol + 1);
      if (valor instanceof Date) {
        celda.numFmt = 'yyyy-mm-dd hh:mm';
      } else if (typeof valor === 'number') {
        celda.numFmt = Number.isInteger(valor) ? '0' : '0.00';
      }
      if (iCol === 0) celda.font = { bold: true };

      const escala = estiloDeValor(valor);
      if (escala) {
        celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: escala.fondo } };
        celda.font = { color: { argb: escala.texto }, bold: escala.negrita };
      }
    });
  });

  return hoja;
}

/** Severidad CVSS v3. Mismo corte que domain.ScoreToSeverity en el backend. */
export function severidadDeScore(score) {
  const n = aNumero(score);
  if (n === null) return null;
  if (n >= 9.0) return 'Critical';
  if (n >= 7.0) return 'High';
  if (n >= 4.0) return 'Medium';
  if (n > 0.0) return 'Low';
  return 'None';
}

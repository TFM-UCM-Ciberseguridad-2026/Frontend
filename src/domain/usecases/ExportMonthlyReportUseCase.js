import PptxGenJS from 'pptxgenjs';
import { ReportCtx, C, fechaCorta, fechaLarga } from './reporting/reportKit.js';
import { recopilarDatos } from './reporting/reportData.js';
import { situacionDelPeriodo, parches, ritmoDeRemediacion } from './reporting/reportSlides.js';
import {
  indice, marcoDeReferencia, concentracionPorTactica, gobiernoDocumental, trazabilidad,
} from './reporting/reportSlidesMensual.js';

/** Lee el marco normativo del proyecto. Ninguna de las tres fuentes es obligatoria. */
async function recopilarGobierno(projectId) {
  const pedir = async (ruta) => {
    try {
      const res = await fetch(`${ruta}?project_id=${projectId}`);
      if (!res.ok) return [];
      const d = await res.json();
      return Array.isArray(d) ? d : [];
    } catch (e) {
      console.warn(`[informe mensual] no se pudo leer ${ruta}:`, e);
      return [];
    }
  };

  const [politicas, procedimientos, roles, raci] = await Promise.all([
    pedir('/api/governance/policies'),
    pedir('/api/governance/procedures'),
    pedir('/api/governance/roles'),
    pedir('/api/governance/raci'),
  ]);
  return { politicas, procedimientos, roles, raci };
}

/**
 * ExportMonthlyReportUseCase — informe MENSUAL de gestión de vulnerabilidades (.pptx).
 *
 * Es el informe de gobierno: lo lee el Comité de Seguridad. Contiene lo que no cambia de una
 * semana a otra —el marco normativo, el gobierno documental y la trazabilidad de controles—
 * más la situación agregada del mes. El detalle operativo
 * (SLA, cola, vencimientos) vive en el informe semanal.
 *
 * Láminas:
 *   1 Portada
 *   2 Índice
 *   3 Marco de referencia y alcance
 *   4 Situación del mes
 *   5 Parches: disponibilidad y aplicación
 *   6 Ritmo de remediación (MTTR)
 *   7 Concentración por táctica y cadena de ataque
 *   8 Gobierno documental y responsabilidades
 *   9 Trazabilidad de controles
 */
export class ExportMonthlyReportUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute(projectId, projectName = 'Proyecto') {
    if (!projectId) {
      throw new Error('No se ha seleccionado ningún proyecto para generar el informe.');
    }

    const [D, gob] = await Promise.all([
      recopilarDatos(this.infrastructureRepository, projectId, 30),
      recopilarGobierno(projectId),
    ]);

    const hasta = D.generadoEn;
    const desde = new Date(hasta.getTime() - 29 * 24 * 60 * 60 * 1000);
    const mes = hasta.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    const pres = new PptxGenJS();
    pres.layout = 'LAYOUT_WIDE';
    pres.author = 'Orquestador TFM — UCM Ciberseguridad';
    pres.company = 'UCM · Máster en Ciberseguridad';
    pres.title = `Informe mensual de gestión de vulnerabilidades — ${projectName}`;
    pres.subject = `${fechaCorta(desde)} a ${fechaCorta(hasta)}`;

    const ctx = new ReportCtx(pres, {
      proyecto: D.proyecto.nombre || projectName,
      periodo: `${fechaCorta(desde)} — ${fechaCorta(hasta)}`,
      ciclo: `Informe mensual · ${mes}`,
      emitido: fechaLarga(hasta),
      autor: 'Equipo SOC',
      destinatario: 'CISO · Comité de Seguridad',
    });

    ctx.portada(ctx.slide(), {
      titulo: 'Gestión de\nVulnerabilidades',
      eyebrow: 'Informe mensual',
      riesgoTier: D.proyecto.riskTier,
    });

    // El índice se declara aquí porque conoce la composición concreta de este informe.
    indice(ctx, [
      { g: 'Apertura', c: C.ACCENT, items: [
        ['03', 'Marco de referencia y alcance', 'Norma aplicada, fuentes de datos y exclusiones', '—'],
        ['04', 'Situación del mes', 'Resumen ejecutivo, valoración y puntos de decisión', 'PM-4'],
      ]},
      { g: 'Eficacia del parcheo', c: C.NIST, items: [
        ['05', 'Parches: disponibilidad y aplicación', 'Qué backlog es parcheable y qué se ha declarado aplicado', 'SI-2'],
        ['06', 'Ritmo de remediación', 'Tiempo medio de cierre (MTTR) frente al plazo acordado', 'SI-2'],
      ]},
      { g: 'Inteligencia de amenazas', c: C.NIST, items: [
        ['07', 'Concentración por táctica y cadena de ataque', 'Dónde se acumula la superficie explotable', 'RA-3'],
      ]},
      { g: 'Gobierno', c: C.NIST, items: [
        ['08', 'Gobierno documental y responsabilidades', 'Estado del marco normativo interno y matriz RACI', 'PM-1'],
      ]},
      { g: 'Anexos', c: C.ACCENT, items: [
        ['09', 'Trazabilidad de controles', 'Qué sección acredita cada control SP 800-53', '—'],
      ]},
    ]);

    marcoDeReferencia(ctx, D);
    situacionDelPeriodo(ctx, D, { titulo: 'Situación del mes', etiquetaPeriodo: 'el mes' });
    parches(ctx, D, { etiquetaPeriodo: 'el mes' });
    ritmoDeRemediacion(ctx, D, { etiquetaPeriodo: 'el mes' });
    concentracionPorTactica(ctx, D);
    gobiernoDocumental(ctx, D, gob);
    trazabilidad(ctx);

    const slug = String(D.proyecto.nombre || projectName).toLowerCase().replace(/[^a-z0-9]+/gi, '_');
    const sello = hasta.toISOString().slice(0, 7);
    await pres.writeFile({ fileName: `${slug}_informe_mensual_${sello}.pptx` });
  }
}

import PptxGenJS from 'pptxgenjs';
import { ReportCtx, fechaCorta, fechaLarga } from './reporting/reportKit.js';
import { recopilarDatos } from './reporting/reportData.js';
import {
  situacionDelPeriodo, inventarioYGrupos, coberturaYCalidad, panoramaVulnerabilidades,
  cumplimientoSLA, colaRemediacion, colaContenedores, envejecimiento, inteligenciaAmenazas,
  actoresAmenaza, vencimientosProximos, ritmoDeRemediacion, parches,
} from './reporting/reportSlides.js';

/**
 * ExportWeeklyReportUseCase — informe SEMANAL de gestión de vulnerabilidades (.pptx).
 *
 * Es el informe operativo: lo lee el equipo para saber qué cerrar esta semana. Contiene solo
 * lo que se mueve de una semana a otra. El marco normativo, la política de priorización y el
 * gobierno documental viven en el informe mensual, porque repetirlos cada siete días haría
 * que se dejara de leer el conjunto.
 *
 * Láminas:
 *   1 Portada
 *   2 Situación de la semana
 *   3 Inventario y grupos de mantenimiento
 *   4 Cobertura del análisis y calidad del dato
 *   5 Panorama de vulnerabilidades
 *   6 Cumplimiento de los acuerdos de nivel de servicio
 *   7 Vencimientos en los próximos 7 días
 *   8 Cola de remediación priorizada (software del host)
 *   9 Cola de remediación · contenedores
 *  10 Envejecimiento del backlog
 *  11 Parches: disponibilidad y aplicación
 *  12 Ritmo de remediación (MTTR)
 *  13 Inteligencia de amenazas
 *  14 Actores de amenaza correlacionados
 */
export class ExportWeeklyReportUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute(projectId, projectName = 'Proyecto') {
    if (!projectId) {
      throw new Error('No se ha seleccionado ningún proyecto para generar el informe.');
    }

    const D = await recopilarDatos(this.infrastructureRepository, projectId, 7);

    const hasta = D.generadoEn;
    const desde = new Date(hasta.getTime() - 6 * 24 * 60 * 60 * 1000);

    const pres = new PptxGenJS();
    pres.layout = 'LAYOUT_WIDE';
    pres.author = 'Orquestador TFM — UCM Ciberseguridad';
    pres.company = 'UCM · Máster en Ciberseguridad';
    pres.title = `Informe semanal de gestión de vulnerabilidades — ${projectName}`;
    pres.subject = `${fechaCorta(desde)} a ${fechaCorta(hasta)}`;

    const ctx = new ReportCtx(pres, {
      proyecto: D.proyecto.nombre || projectName,
      periodo: `${fechaCorta(desde)} — ${fechaCorta(hasta)}`,
      ciclo: 'Informe semanal',
      emitido: fechaLarga(hasta),
      autor: 'Equipo SOC',
      destinatario: 'Responsable de Infraestructura · CISO',
    });

    ctx.portada(ctx.slide(), {
      titulo: 'Gestión de\nVulnerabilidades',
      eyebrow: 'Informe semanal',
      riesgoTier: D.proyecto.riskTier,
    });

    situacionDelPeriodo(ctx, D, { titulo: 'Situación de la semana', etiquetaPeriodo: 'la semana' });
    inventarioYGrupos(ctx, D);
    coberturaYCalidad(ctx, D);
    panoramaVulnerabilidades(ctx, D);
    cumplimientoSLA(ctx, D, { etiquetaPeriodo: 'esta semana' });
    vencimientosProximos(ctx, D);
    colaRemediacion(ctx, D);
    colaContenedores(ctx, D);
    envejecimiento(ctx, D);
    parches(ctx, D, { etiquetaPeriodo: 'la semana' });
    ritmoDeRemediacion(ctx, D, { etiquetaPeriodo: 'la semana' });
    inteligenciaAmenazas(ctx, D);
    actoresAmenaza(ctx, D);

    const slug = String(D.proyecto.nombre || projectName).toLowerCase().replace(/[^a-z0-9]+/gi, '_');
    const sello = hasta.toISOString().slice(0, 10);
    await pres.writeFile({ fileName: `${slug}_informe_semanal_${sello}.pptx` });
  }
}

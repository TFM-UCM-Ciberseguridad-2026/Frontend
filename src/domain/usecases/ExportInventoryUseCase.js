import { recopilarCrudos } from './reporting/reportData';
import { indexarGrafo } from '../excel/grafo';
import { construirEspecificaciones } from '../excel/hojasInforme';
import { crearLibro, construirHoja, construirHojaLibre, libroABlob } from '../excel/formato';

export class ExportInventoryUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  /**
   * Genera el informe técnico completo del proyecto en un libro de Excel.
   *
   * Se alimenta de `recopilarCrudos`, el mismo recolector que usan los dos
   * informes PPTX: el grafo del proyecto más las métricas de TTP, la matriz de
   * técnicas, los actores de amenaza, el SLA y la cola de parcheo. Compartir el
   * recolector es deliberado — si el Excel y el PowerPoint leyeran de sitios
   * distintos podrían dar cifras distintas del mismo proyecto.
   *
   * @param {string|number} selectedProjectId
   * @param {string} projectName
   * @returns {Promise<{filename: string, blob: Blob}>}
   */
  async execute(selectedProjectId, projectName = 'Proyecto') {
    if (!selectedProjectId) {
      throw new Error('No se ha seleccionado ningún proyecto para exportar el informe.');
    }

    const datos = await recopilarCrudos(this.infrastructureRepository, selectedProjectId, {
      limiteCola: 5000,   // el Excel lleva la cola entera, no las 15 primeras del PPTX
      incluirRutas: true,
    });

    if (!datos.grafo || !Array.isArray(datos.grafo.nodes)) {
      throw new Error('El backend devolvió un grafo vacío o con formato inválido.');
    }

    datos.projectId = selectedProjectId;
    datos.nombreProyecto = projectName;
    datos.generadoEn = new Date();

    const idx = indexarGrafo(datos.grafo);
    const especificaciones = construirEspecificaciones(datos, idx);

    const libro = crearLibro();
    for (const esp of especificaciones) {
      if (esp.tipo === 'libre') {
        construirHojaLibre(libro, esp.nombre, esp.filas, esp.anchos);
      } else {
        construirHoja(libro, esp.nombre, esp.columnas, esp.filas);
      }
    }

    return {
      filename: `${projectName.toLowerCase().replace(/[^a-z0-9]/gi, '_')}_informe_tecnico.xlsx`,
      blob: await libroABlob(libro),
    };
  }
}

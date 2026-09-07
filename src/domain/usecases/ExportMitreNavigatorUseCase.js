export class ExportMitreNavigatorUseCase {
  /**
   * @param {Object} repository - InfrastructureRepository (fuente autorizada de la matriz TTP)
   */
  constructor(repository) {
    this.repository = repository;
  }

  /**
   * Genera el JSON de capa compatible con MITRE ATT&CK Navigator v4.5.
   *
   * La capa se construye EXCLUSIVAMENTE con la matriz TTP que devuelve el backend
   * para el proyecto (el mismo endpoint que pinta la pantalla de TTPs). No hay
   * respaldo de técnicas de demostración: un fichero que se abre en el Navigator
   * oficial no puede contener técnicas que nadie ha detectado, así que si no hay
   * datos se lanza un error en lugar de exportar una capa inventada.
   *
   * @param {string|number} projectId - ID del proyecto a exportar
   * @param {string} projectName - Nombre del proyecto (para el título de la capa)
   * @returns {Promise<Object>} { filename, content }
   */
  /**
   * Versión de ATT&CK que se declara si el backend no sabe decir cuál tiene
   * cargada (grafo poblado antes de que la versión se registrara). Es la mínima
   * que reconoce las tácticas actuales, incluida TA0112.
   */
  static VERSION_ATTACK_POR_DEFECTO = '19';

  /**
   * Lee del backend la versión del catálogo realmente cargado y devuelve su
   * componente mayor, que es lo que espera versions.attack.
   *
   * Estaba fijada a mano en '14' mientras el catálogo iba por la 19.2, así que el
   * Navigator interpretaba las técnicas con un mapa de cinco versiones de
   * antigüedad. Consultarla evita que se vuelva a desfasar en silencio.
   */
  async _versionATTACK() {
    try {
      const info = await this.repository.getMitreCatalogInfo();
      const version = String(info?.attack_version || '').trim();
      if (version) {
        const mayor = version.split('.')[0];
        if (mayor) return mayor;
      }
    } catch {
      // La versión es un dato accesorio: si no se puede consultar, la capa se
      // exporta igual con el valor por defecto en lugar de fallar la descarga.
    }
    return ExportMitreNavigatorUseCase.VERSION_ATTACK_POR_DEFECTO;
  }

  async execute(projectId, projectName = 'Proyecto') {
    const raw = await this.repository.getTTPMatrix(projectId);
    const matriz = Array.isArray(raw) ? raw : (raw?.data || raw?.ttps || []);

    const techniques = matriz
      .map(t => {
        const id = String(t.id || t.ID || '').trim().toUpperCase();
        const cves = t.cves || t.CVEs || [];
        return { id, cves };
      })
      .filter(t => /^T\d{4}(\.\d{3})?$/.test(t.id))
      .map(t => ({
        techniqueID: t.id,
        // La intensidad es el número real de CVE asociadas, no un 1 fijo:
        // así el degradado del Navigator refleja dónde se concentra el riesgo.
        score: t.cves.length,
        color: '#e63946',
        comment: `${t.cves.length} CVE asociadas en el proyecto "${projectName}"`,
        enabled: true,
      }));

    if (techniques.length === 0) {
      throw new Error(
        'No hay TTPs correlacionadas en este proyecto. Ejecuta el mapeo de TTPs antes de exportar la capa de MITRE ATT&CK Navigator.'
      );
    }

    const maxScore = techniques.reduce((max, t) => (t.score > max ? t.score : max), 0);
    const versionATTACK = await this._versionATTACK();

    // Construir la capa oficial de MITRE ATT&CK Navigator (v4.5 / Navigator 4.9.1)
    const layer = {
      name: `Capa MITRE ATT&CK - ${projectName}`,
      versions: {
        attack: versionATTACK,
        navigator: '4.9.1',
        layer: '4.5'
      },
      domain: 'enterprise-attack',
      description: `TTPs correlacionadas en la infraestructura del proyecto "${projectName}" (Orquestador de Infraestructura)`,
      filters: {
        platforms: ['Windows', 'Linux', "macOS", 'Containers']
      },
      sorting: 0,
      layout: {
        layout: 'flat',
        aggregateFunction: 'average',
        showID: true,
        showName: true,
        showWhiteTechniques: false
      },
      hideDisabled: false,
      techniques: techniques,
      gradient: {
        colors: ['#ffeae6', '#e63946'],
        minValue: 0,
        maxValue: maxScore > 0 ? maxScore : 1
      },
      legendItems: [
        {
          label: 'TTP Detectada / Correlacionada',
          color: '#e63946'
        }
      ],
      metadata: [],
      links: [],
      showTacticRowBackground: false,
      tacticRowBackground: '#dddddd',
      selectTechniquesAcrossTactics: true,
      selectSubtechniquesWithParent: false
    };

    return {
      filename: `${projectName.replace(/[^\w\sáéíóúÁÉÍÓÚñÑ-]/gi, '_').replace(/\s+/g, '_')}_mitre_attack_navigator.json`,
      content: JSON.stringify(layer, null, 2)
    };
  }
}

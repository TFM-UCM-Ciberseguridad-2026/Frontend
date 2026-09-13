/**
 * Parches de todas las CVE de un proyecto, agrupados por CVE.
 *
 * Lo consume la ficha de una técnica ATT&CK, que puede reunir más de cien CVE: resolverlas
 * de una en una contra /api/vulnerabilities/{cve}/patches dispararía una petición por CVE
 * cada vez que se abre una técnica.
 */
export class GetPatchesForProjectUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  /**
   * @returns {Promise<Map<string, Array>>} cve_id -> lista de parches
   */
  async execute(projectId) {
    if (!projectId) {
      throw new Error('project_id es obligatorio');
    }

    const data = await this.infrastructureRepository.getPatchesForProject(projectId);
    const items = Array.isArray(data?.items) ? data.items : [];

    return new Map(
      items
        .filter(item => item?.cve_id)
        .map(item => [item.cve_id, Array.isArray(item.patches) ? item.patches : []])
    );
  }
}

export class GetPatchQueueUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute(query = {}) {
    // Si se pasan argumentos estilo posicional antiguo (e.g. projectId, page, limit)
    let queryObj = query;
    if (typeof query === 'number' || typeof query === 'string') {
      const [projectId, page = 1, limit = 20] = arguments;
      queryObj = { projectId, page, limit };
    }

    const result = await this.infrastructureRepository.getPatchQueue(queryObj);
    return {
      total: result?.total || 0,
      page: result?.page || queryObj.page || 1,
      limit: result?.limit || queryObj.limit || 20,
      totalPages: result?.total_pages || 1,
      queue: Array.isArray(result?.queue) ? result.queue : [],
      priorityTierCounts: result?.priority_tier_counts || {}
    };
  }
}
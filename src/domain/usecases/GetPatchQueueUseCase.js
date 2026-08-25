export class GetPatchQueueUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute(projectId, page = 1, limit = 20) {
    const result = await this.infrastructureRepository.getPatchQueue(projectId, page, limit);
    return {
      total: result?.total || 0,
      page: result?.page || page,
      limit: result?.limit || limit,
      totalPages: result?.total_pages || 1,
      queue: Array.isArray(result?.queue) ? result.queue : []
    };
  }
}
export class GetPatchQueueUseCase {
  constructor(infrastructureRepository) {
    this.infrastructureRepository = infrastructureRepository;
  }

  async execute(projectId, limit = 20) {
    const result = await this.infrastructureRepository.getPatchQueue(projectId, limit);
    return {
      count: result?.count || 0,
      queue: Array.isArray(result?.queue) ? result.queue : []
    };
  }
}
export class AptActor {
  constructor({
    actor_id,
    actor_name,
    origin,
    motivation,
    coverage_percent,
    matched_ttp_count,
    total_infra_ttps,
    matched_ttp_ids,
    matched_ttp_names,
    matched_ttp_cves
  }) {
    this.id = actor_id;
    this.name = actor_name || `Actor #${actor_id}`;
    this.origin = origin || 'Unknown';
    this.motivation = motivation || 'Unknown';
    this.coveragePercent = coverage_percent || 0;
    this.matchedTtpCount = matched_ttp_count || 0;
    this.totalInfraTtps = total_infra_ttps || 0;
    this.matchedTtpIds = matched_ttp_ids || [];
    this.matchedTtpNames = matched_ttp_names || [];
    this.matchedTtpCves = matched_ttp_cves || [];
  }
}

export function normalizeScore(score) {
  const value = Number(score);
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(1, value));
}

export function toPercent(score) {
  const normalized = normalizeScore(score);
  if (normalized === null) return null;
  return Math.round(normalized * 100);
}

// Mismos umbrales que ClassifyRiskTier en el backend. Sirve de respaldo para los nodos
// calculados antes de que se persistiera el tier: el score está, la etiqueta no.
export function tierFromScore(score) {
  if (score === null || score === undefined || score === '') return null;
  const normalized = normalizeScore(score);
  if (normalized === null) return null;
  if (normalized >= 0.9) return 'CRITICAL';
  if (normalized >= 0.7) return 'HIGH';
  if (normalized >= 0.4) return 'MEDIUM';
  return 'LOW';
}

export function resolveTier(tier, score) {
  if (tier) return String(tier).toUpperCase();
  return tierFromScore(score);
}

export function tierColor(tier) {
  switch ((tier || '').toUpperCase()) {
    case 'CRITICAL': return '#ef4444';
    case 'HIGH': return '#f97316';
    case 'MEDIUM': return '#eab308';
    case 'LOW': return '#22c55e';
    default: return 'var(--c400)';
  }
}

export function displayTier(tier, score) {
  return resolveTier(tier, score) || 'UNKNOWN';
}


export function formatPercent(score) {
  const normalized = normalizeScore(score);

  if (normalized === null) return 'N/A';
  if (normalized > 0 && normalized < 0.005) return '<0%';

  return `${Math.round(normalized * 100)}%`;
}

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

export function tierColor(tier) {
  switch ((tier || '').toUpperCase()) {
    case 'CRITICAL': return '#ef4444';
    case 'HIGH': return '#f97316';
    case 'MEDIUM': return '#eab308';
    case 'LOW': return '#22c55e';
    default: return 'var(--c400)';
  }
}

export function displayTier(tier) {
  return tier || 'UNKNOWN';
}
import React from 'react';
import { normalizeScore, tierColor, displayTier, resolveTier, formatPercent } from './riskFormat';

export function RiskScoreGauge({ score, tier, label }) {
  const normalized = normalizeScore(score);
  if (normalized === null) return null;

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const color = tierColor(resolveTier(tier, score));

  return (
    <div className="risk-gauge">
      <svg width="92" height="92" viewBox="0 0 92 92">
        <circle cx="46" cy="46" r={radius} stroke="var(--c900)" strokeWidth="6" fill="none" />
        <circle
          cx="46"
          cy="46"
          r={radius}
          stroke={color}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference * normalized} ${circumference}`}
        />
      </svg>
      <div className="risk-gauge-value">
        <b>{formatPercent(score)}</b>
        <span>{label}</span>
        <small style={{ color }}>{displayTier(tier, score)}</small>
      </div>
    </div>
  );
}
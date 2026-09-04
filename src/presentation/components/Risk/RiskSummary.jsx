import React from 'react';
import { RiskScoreGauge } from './RiskScoreGauge';
import './Risk.css';

const hasAnyRisk = (props = {}) => (
  props.risk_score !== undefined ||
  props.priority_score !== undefined ||
  props.risk_tier ||
  props.priority_tier
);

function RiskFact({ label, value }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="risk-fact">
      <span>{label}</span>
      <strong>{String(value)}</strong>
    </div>
  );
}

export function RiskSummary({ node }) {
  if (!node) return null;

  const props = node.properties || {};
  const label = node.primaryLabel || node.labels?.[0] || '';
  const isContainer =
    node.primaryLabel === 'Container' ||
    node.labels?.includes('Container');

  if (!hasAnyRisk(props) && label !== 'Vulnerability') {
    return null;
  }

  if (label === 'Project') {
    return (
      <section className="risk-summary-card">
        <div className="risk-gauge-row">
          <RiskScoreGauge score={props.risk_score} tier={props.risk_tier} label="RISK" />
          <RiskScoreGauge score={props.priority_score} tier={props.priority_tier} label="PRIORITY" />
        </div>
        <RiskFact label="Risky endpoints" value={props.risky_endpoint_count} />
        <RiskFact label="Technical driver" value={[props.technical_driver_endpoint_hostname, props.technical_driver_software_name, props.technical_driver_cve_id].filter(Boolean).join(' · ')} />
        <RiskFact label="Priority driver" value={[props.priority_driver_endpoint_hostname, props.priority_driver_software_name, props.priority_driver_cve_id].filter(Boolean).join(' · ')} />
        <RiskFact label="Computed at" value={props.risk_computed_at} />
      </section>
    );
  }

  if (label === 'Endpoint') {
    return (
      <section className="risk-summary-card">
        <div className="risk-gauge-row">
          <RiskScoreGauge score={props.risk_score} tier={props.risk_tier} label="RISK" />
          <RiskScoreGauge score={props.priority_score} tier={props.priority_tier} label="PRIORITY" />
        </div>
        <RiskFact label="Risky software" value={props.risky_software_count} />
        <RiskFact label="Technical driver" value={[props.technical_driver_software_name, props.technical_driver_cve_id].filter(Boolean).join(' · ')} />
        <RiskFact label="Priority driver" value={[props.priority_driver_software_name, props.priority_driver_cve_id].filter(Boolean).join(' · ')} />
      </section>
    );
  }

  if (label === 'SoftwareInstallation') {
    return (
      <section className="risk-summary-card">
        <div className="risk-gauge-row">
          <RiskScoreGauge score={props.risk_score} tier={props.risk_tier} label="RISK" />
          <RiskScoreGauge score={props.priority_score} tier={props.priority_tier} label="PRIORITY" />
        </div>
        <RiskFact label="Software criticality" value={props.criticality_level || 'STANDARD'} />
        <RiskFact label="Driver CVE" value={props.driver_cve_id} />
      </section>
    );
  }

  if (isContainer) {
    return (
      <section className="risk-summary-card">
        <div className="risk-gauge-row">
          <RiskScoreGauge
            score={props.risk_score}
            tier={props.risk_tier}
            label="RISK"
          />
          <RiskScoreGauge
            score={props.priority_score}
            tier={props.priority_tier}
            label="PRIORITY"
          />
        </div>

        <RiskFact
          label="State"
          value={props.state || 'UNKNOWN'}
        />
        <RiskFact
          label="Image"
          value={props.image_id || props.image_name}
        />
        <RiskFact
          label="Direct findings"
          value={props.direct_finding_count}
        />
        <RiskFact
          label="Risky installations"
          value={props.risky_installation_count}
        />
        <RiskFact
          label="Technical driver"
          value={[
            props.technical_driver_asset_name,
            props.technical_driver_cve_id
          ].filter(Boolean).join(' · ')}
        />
        <RiskFact
          label="Priority driver"
          value={[
            props.priority_driver_asset_name,
            props.priority_driver_cve_id
          ].filter(Boolean).join(' · ')}
        />
        <RiskFact
          label="Computed at"
          value={props.risk_computed_at}
        />
      </section>
    );
  }

  if (label === 'Finding') {
    return (
      <section className="risk-summary-card">
        <div className="risk-gauge-row">
          <RiskScoreGauge score={props.risk_score} tier={props.risk_tier} label="RISK" />
          <RiskScoreGauge score={props.priority_score} tier={props.priority_tier} label="PRIORITY" />
        </div>
        <RiskFact label="Impact" value={props.impact_score} />
        <RiskFact label="Likelihood" value={props.likelihood} />
        <RiskFact label="Exposure" value={props.exposure_factor} />
        <RiskFact label="Remediation" value={props.remediation_factor} />
      </section>
    );
  }

  return null;
}

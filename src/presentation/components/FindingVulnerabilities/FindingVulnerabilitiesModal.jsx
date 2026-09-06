import React from 'react';

export function FindingVulnerabilitiesModal({
  showFindingVulnsModal,
  closeFindingVulnsModal,
  findingVulnsData,
  findingVulnsLoading,
  findingVulnsError,
  findingVulnsSourceNode,
  fetchFindingVulnerabilities
}) {
  if (!showFindingVulnsModal) return null;

  const getScoreTierClass = (score) => {
    if (score >= 9.0) return 'path-critical';
    if (score >= 7.0) return 'path-high';
    if (score >= 4.0) return 'path-medium';
    return 'path-low';
  };

  const getScoreLabel = (score) => {
    if (score >= 9.0) return 'CRÍTICA';
    if (score >= 7.0) return 'ALTA';
    if (score >= 4.0) return 'MEDIA';
    return 'BAJA';
  };

  const findingLabel = findingVulnsSourceNode?.name || 'Finding';

  const displayVulns = (findingVulnsData && findingVulnsData.length > 0) ? findingVulnsData : (() => {
    const props = findingVulnsSourceNode?.properties || {};
    const cveId = props.cve_id || props.cve || (findingVulnsSourceNode?.name && String(findingVulnsSourceNode.name).toUpperCase().startsWith('CVE') ? findingVulnsSourceNode.name : null);
    if (cveId) {
      return [{
        cveId: String(cveId),
        baseScore: Number(props.risk_score || props.cvss || 7.5),
        description: props.title || props.description || `Vulnerabilidad identificada en el hallazgo (${cveId}).`,
        kev: Boolean(props.kev || props.exploitable),
        exploit: Boolean(props.has_exploit || props.exploit),
        cvssVector: props.cvss_vector || props.vector || ''
      }];
    }
    return [];
  })();

  return (
    <div
      className="apt-panel-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) closeFindingVulnsModal(); }}
    >
      <div className="apt-panel finding-vulns-panel">
        <div className="apt-panel-header">
          <div>
            <h2>🛡️ CVEs del Hallazgo</h2>
            <div className="apt-panel-subtitle">
              Vulnerabilidades asociadas a: <strong>{findingLabel}</strong>
            </div>
          </div>
          <button className="apt-panel-close" onClick={closeFindingVulnsModal}>✕</button>
        </div>

        <div className="apt-panel-body">
          {findingVulnsLoading && (
            <div className="apt-panel-loading">
              <div className="spinner"></div>
              <p>Recuperando CVEs asociados al hallazgo...</p>
            </div>
          )}

          {findingVulnsError && (
            <div className="apt-panel-empty">
              <p style={{ color: '#f87171' }}>⚠️ {findingVulnsError}</p>
              {findingVulnsSourceNode && (
                <button
                  className="btn btn-secondary"
                  onClick={() => fetchFindingVulnerabilities(findingVulnsSourceNode)}
                  style={{ marginTop: '1rem' }}
                >
                  Reintentar
                </button>
              )}
            </div>
          )}

          {!findingVulnsLoading && !findingVulnsError && displayVulns.length === 0 && (
            <div className="apt-panel-empty">
              <p>No hay CVEs registrados para este hallazgo.</p>
            </div>
          )}

          {!findingVulnsLoading && !findingVulnsError && displayVulns.map((vuln, idx) => (
            <div key={vuln.cveId || idx} className={`path-card ${getScoreTierClass(vuln.baseScore)}`}>
              <div className="path-card-header">
                <div className="path-title-group">
                  <span className="cve-chip"><span className="cve-id">{vuln.cveId}</span></span>
                  {vuln.cwes.map(cwe => (
                    <span className="software-chip" key={cwe}>{cwe}</span>
                  ))}
                </div>
                <div className="path-risk-badge">
                  <div className="path-risk-score">{vuln.baseScore.toFixed(1)}</div>
                  <div className="path-risk-tier">{getScoreLabel(vuln.baseScore)}</div>
                </div>
              </div>

              {vuln.description && (
                <p style={{ color: 'var(--c100)', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
                  {vuln.description}
                </p>
              )}

              <div className="step-tags-row">
                {vuln.kev && (
                  <span className="tag-chip tag-rce" title="Explotación activa confirmada (CISA KEV)">KEV</span>
                )}
                {vuln.exploit && (
                  <span className="tag-chip tag-exploit" title="Exploit conocido">EXPLOIT</span>
                )}
                {vuln.epssScore > 0 && (
                  <span className="tag-chip tag-cvss">
                    EPSS: {Math.round(vuln.epssScore * 100)}%
                  </span>
                )}
                {vuln.cvssVector && (
                  <span className="tag-chip tag-cvss">{vuln.cvssVector}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
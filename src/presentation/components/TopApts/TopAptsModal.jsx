import React from 'react';

export function TopAptsModal({
  showAPTPanel,
  setShowAPTPanel,
  aptData,
  aptLoading,
  aptError,
  fetchTopAPTs,
  onSelectTTP
}) {
  if (!showAPTPanel) return null;

  const getRankClass = (index) => {
    if (index === 0) return 'rank-1';
    if (index === 1) return 'rank-2';
    if (index === 2) return 'rank-3';
    return 'rank-other';
  };

  return (
    <div className="apt-panel-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAPTPanel(false) }}>
      <div className="apt-panel">
        <div className="apt-panel-header">
          <div>
            <h2>🎯 TOP APTs — Correlación por Infraestructura</h2>
            <div className="apt-panel-subtitle">
              Actores de amenaza rankeados por cobertura de TTPs vinculadas a las CVEs de tu infraestructura
            </div>
          </div>
          <button className="apt-panel-close" onClick={() => setShowAPTPanel(false)}>✕</button>
        </div>

        <div className="apt-panel-body">
          {aptLoading && (
            <div className="apt-panel-loading">
              <div className="spinner"></div>
              <p>Traversando grafo: Project → Endpoint → Finding → CVE ← TTP ← APT...</p>
            </div>
          )}

          {aptError && (
            <div className="apt-panel-empty">
              <p style={{ color: '#f87171' }}>⚠️ {aptError}</p>
              <button className="btn btn-secondary" onClick={fetchTopAPTs} style={{ marginTop: '1rem' }}>Reintentar</button>
            </div>
          )}

          {!aptLoading && !aptError && aptData.length === 0 && (
            <div className="apt-panel-empty">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              <p>No se encontraron correlaciones APT. Asegúrate de que la base de datos contenga TTPs vinculadas a las vulnerabilidades.</p>
            </div>
          )}

          {!aptLoading && !aptError && aptData.map((apt, index) => (
            <div key={apt.id || apt.actor_id || index} className={`apt-card ${getRankClass(index)}`}>
              <div className="apt-card-top">
                <div className="apt-card-rank">#{index + 1}</div>
                <div className="apt-card-info">
                  <h3 className="apt-card-name">{apt.name || apt.actor_name}</h3>
                  <div className="apt-card-meta">
                    <span className="apt-origin-badge">🌍 {apt.origin}</span>
                    <span className="apt-motivation-badge">🎯 {apt.motivation}</span>
                  </div>
                </div>
                <div className="apt-card-coverage">
                  <div className="apt-coverage-value">{apt.coveragePercent || apt.coverage_percent}%</div>
                  <div className="apt-coverage-label">{apt.matchedTtpCount || apt.matched_ttp_count} / {apt.totalInfraTtps || apt.total_infra_ttps} TTPs</div>
                </div>
              </div>

              <div className="apt-progress-bar">
                <div className="apt-progress-fill" style={{ width: `${apt.coveragePercent || apt.coverage_percent}%` }}></div>
              </div>

              <div className="apt-ttp-chips">
                {(apt.matchedTtpIds || apt.matched_ttp_ids) && (apt.matchedTtpIds || apt.matched_ttp_ids).map((ttpId, i) => {
                  const ttpNames = apt.matchedTtpNames || apt.matched_ttp_names || [];

                  return (
                    <span
                      key={ttpId + i}
                      className="apt-ttp-chip"
                      style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                      title={`Filtrar TTP en el grafo: ${ttpId}`}
                      onClick={() => onSelectTTP && onSelectTTP(ttpId)}
                    >
                      <span className="chip-id">{ttpId}</span>
                      {ttpNames[i]}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

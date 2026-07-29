import React from 'react';
import { RiskSummary } from '../Risk/RiskSummary';


export function NodeInspector({ selectedNode }) {
  if (!selectedNode) {
    return (
      <aside className="detail-panel">
        <p className="eyebrow">Propiedades del activo</p>
        <div className="detail-empty">
          ◌<br />
          SELECCIONA UN NODO<br />
          DEL GRAFO PARA VER<br />
          SUS PROPIEDADES
        </div>
      </aside>
    );
  }

  const categoryLabel = selectedNode.primaryLabel;

  const arcDasharray = (fraction, radius) => {
    const circumference = 2 * Math.PI * radius;
    return `${circumference * fraction} ${circumference}`;
  };

  const isVuln = selectedNode.categoryId === 'vulnerabilidad';
  const baseScore = parseFloat(selectedNode.properties.base_score || selectedNode.properties.cvss_score || 0);
  const epssScore = parseFloat(selectedNode.properties.epss_score || 0);

  return (
    <aside className="detail-panel">
      <p className="eyebrow">Propiedades del activo</p>
      <div style={{ padding: '10px 0' }}>
        <span className="badge">{categoryLabel.toUpperCase()}</span>
        <h2 className="node-title">{selectedNode.name}</h2>

        <RiskSummary node={selectedNode} />

        {isVuln && (baseScore > 0 || epssScore > 0) && (
          <div className="gauge-row">
            {baseScore > 0 && (
              <div className="gauge-big">
                <svg width="112" height="112" viewBox="0 0 112 112">
                  <circle cx="56" cy="56" r="48" stroke="var(--c900)" strokeWidth="7" fill="none" />
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    stroke="var(--c50)"
                    strokeWidth="7"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={arcDasharray(baseScore / 10, 48)}
                  />
                </svg>
                <div className="val">
                  <b>{baseScore}</b>
                  <span>BASE SCORE</span>
                </div>
              </div>
            )}

            {epssScore > 0 && (
              <div className="gauge-small">
                <svg width="72" height="72" viewBox="0 0 72 72">
                  <circle cx="36" cy="36" r="30" stroke="var(--c900)" strokeWidth="5" fill="none" />
                  <circle
                    cx="36"
                    cy="36"
                    r="30"
                    stroke="var(--c400)"
                    strokeWidth="5"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={arcDasharray(epssScore, 30)}
                  />
                </svg>
                <div className="val">
                  <b>{Math.round(epssScore * 100)}%</b>
                  <span>EPSS</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="props">
          <div className="prop-row">
            <div className="k">ID Interno Neo4j</div>
            <div className="v">{selectedNode.id}</div>
          </div>
          {Object.entries(selectedNode.properties || {}).map(([k, v]) => {
            let display;
            if (typeof v === 'boolean') {
              display = <span className={`pill ${v ? 'true' : 'false'}`}>{v ? 'TRUE' : 'FALSE'}</span>;
            } else {
              display = String(v);
            }
            return (
              <div className="prop-row" key={k}>
                <div className="k">{k.replace(/_/g, ' ')}</div>
                <div className="v">{display}</div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

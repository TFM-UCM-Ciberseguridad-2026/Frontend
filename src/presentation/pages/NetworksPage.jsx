import React, { useState } from 'react';
import { NetworksView } from '../components/NetworksView/NetworksView';
import { AssetDetails } from '../components/Inventory/AssetDetails';

export function NetworksPage({ graphData, categories }) {
  const [selectedNode, setSelectedNode] = useState(null);

  return (
    <>
      {/* PANEL IZQUIERDO: LEYENDA HUD — grid column 1 (250px) */}
      <aside className="sidebar">
        <p className="eyebrow" style={{ marginBottom: '12px' }}>Leyenda de Categorías</p>
        <div id="legendList">
          {categories.slice(1).map(c => (
            <div className="legend-item" key={c.key}>
              <span
                className="legend-dot"
                style={{
                  background: c.color,
                  boxShadow: `0 0 6px ${c.color}`
                }}
              />
              {c.label}
            </div>
          ))}
        </div>
      </aside>

      {/* VISTA CENTRAL: AUDITORÍA DE SUBREDES — grid column 2 (1fr) */}
      <main className="graph-stage">
        <NetworksView
          graphData={graphData}
          setSelectedNode={setSelectedNode}
        />
      </main>

      {/* PANEL DERECHO: DETALLES — grid column 3 (300px) */}
      <AssetDetails
        selectedNode={selectedNode}
      />
    </>
  );
}

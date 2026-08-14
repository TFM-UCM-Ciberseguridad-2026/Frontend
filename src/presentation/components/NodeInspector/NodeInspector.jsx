import React, { useState, useEffect } from 'react';
import { RiskSummary } from '../Risk/RiskSummary';
import { EditNodeModal } from './EditNodeModal';

export function NodeInspector({ selectedNode, updateNode, deleteNode, fetchFindingVulnerabilities }) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setConfirmDelete(false);
    setShowEditModal(false);
  }, [selectedNode?.id]);
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
  const isManageableAsset = ['Endpoint', 'Network', 'Hardware', 'Container'].includes(categoryLabel);
  const canEdit = isManageableAsset && typeof updateNode === 'function';
  const canDelete = isManageableAsset && typeof deleteNode === 'function';

  const arcDasharray = (fraction, radius) => {
    const circumference = 2 * Math.PI * radius;
    return `${circumference * fraction} ${circumference}`;
  };

  const isVuln = selectedNode.categoryId === 'vulnerabilidad';
  const isFinding = selectedNode.primaryLabel === 'Finding';
  const hasVulns = Boolean(selectedNode.properties?.has_vulnerabilities);

  const baseScore = parseFloat(selectedNode.properties.base_score || selectedNode.properties.cvss_score || 0);
  const epssScore = parseFloat(selectedNode.properties.epss_score || 0);

  return (
    <aside className="detail-panel">
      <p className="eyebrow">Propiedades del activo</p>
      <div style={{ padding: '10px 0' }}>
        <span className="badge">{categoryLabel.toUpperCase()}</span>
        <h2 className="node-title">{selectedNode.name}</h2>

        {/* ACCIONES DE GESTIÓN DE NODO (EDITAR / ELIMINAR) */}
        {(canDelete || canEdit) && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            {canEdit && (
              <button
                className="btn btn-secondary"
                style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', background: 'var(--c900)', border: '1px solid var(--line)' }}
                onClick={() => setShowEditModal(true)}
                title="Editar propiedades y enlaces de red de este activo"
              >
                ✏️ Editar Activo
              </button>
            )}

            {canDelete && (
              !confirmDelete ? (
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.75rem', color: '#ff8585', background: 'var(--c900)', border: '1px solid rgba(255, 107, 107, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                  onClick={() => setConfirmDelete(true)}
                  title="Eliminar este nodo del grafo"
                >
                  🗑️ Eliminar
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '6px', width: '100%', marginTop: '4px', background: 'rgba(224, 49, 49, 0.15)', padding: '8px', borderRadius: '6px', border: '1px dashed #e03131', flexDirection: 'column' }}>
                  <div style={{ fontSize: '0.72rem', color: '#ffaaaa', textAlign: 'center', fontWeight: 600 }}>
                    ⚠️ ¿Eliminar de forma permanente?
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      className="btn"
                      style={{ flex: 1, padding: '0.35rem', fontSize: '0.75rem', background: '#e03131', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
                      onClick={() => {
                        setConfirmDelete(false);
                        const idToDelete = selectedNode.domainId || selectedNode.properties?.id || selectedNode.id;
                        deleteNode(selectedNode.primaryLabel, idToDelete);
                      }}
                    >
                      Sí, Eliminar
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', background: 'transparent', border: '1px solid var(--line)' }}
                      onClick={() => setConfirmDelete(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}

        <RiskSummary node={selectedNode} />

      {isFinding && (
        <button
          type="button"
          style={{
            width: '100%',
            marginBottom: '1rem',
            padding: '0.6rem',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: !hasVulns ? 'not-allowed' : 'pointer',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            background: !hasVulns ? 'rgba(239, 68, 68, 0.1)' : 'linear-gradient(135deg, #ef4444, #b91c1c)',
            color: !hasVulns ? '#f87171' : '#ffffff',
            opacity: !hasVulns ? 0.6 : 1,
            boxShadow: !hasVulns ? 'none' : '0 4px 15px rgba(239, 68, 68, 0.35)'
          }}
          disabled={!hasVulns}
          onClick={() => fetchFindingVulnerabilities?.(selectedNode)}
        >
          {hasVulns ? 'Ver CVEs' : 'Sin CVEs asociados'}
        </button>
      )}
        
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
          {selectedNode.properties?.image_id && (
            <div className="prop-row">
              <div className="k">ID de Imagen</div>
              <div className="v">{selectedNode.properties.image_id}</div>
            </div>
          )}
          {Object.entries(selectedNode.properties || {})
            .filter(([k]) => k !== 'image_id')
            .map(([k, v]) => {
            let display;
            if (typeof v === 'boolean') {
              display = <span className={`pill ${v ? 'true' : 'false'}`}>{v ? 'TRUE' : 'FALSE'}</span>;
            } else if (k === 'ips' && Array.isArray(v)) {
              display = (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {v.map((ipObj, idx) => {
                    const ipStr = typeof ipObj === 'string' ? ipObj : ipObj.ip;
                    const vlanStr = (ipObj.vlan_id !== undefined && ipObj.vlan_id !== null) ? ` (VLAN: ${ipObj.vlan_id})` : '';
                    return <span key={idx} className="pill" style={{ background: 'var(--c800)', color: 'var(--c50)' }}>{ipStr}{vlanStr}</span>;
                  })}
                </div>
              );
            } else if (typeof v === 'object' && v !== null) {
              display = JSON.stringify(v);
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

      {showEditModal && (
        <EditNodeModal
          node={selectedNode}
          onClose={() => setShowEditModal(false)}
          updateNode={updateNode}
        />
      )}
    </aside>
  );
}

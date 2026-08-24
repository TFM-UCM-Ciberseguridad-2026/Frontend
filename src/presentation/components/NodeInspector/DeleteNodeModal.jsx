import React, { useState, useEffect } from 'react';
import '../AddAssets/AddAssetsButton.css';

export function DeleteNodeModal({ node, isOpen, onClose, onDelete }) {
  const [justification, setJustification] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setJustification('');
      setFormError(null);
    }
  }, [isOpen]);

  if (!isOpen || !node) return null;
  const label = node.primaryLabel || node.labels?.[0] || 'Activo';
  const nodeName = node.name || node.properties?.title || node.properties?.hostname || node.properties?.nombre || node.id;
  const nodeId = node.properties?.id ?? node.id;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!justification.trim()) {
      setFormError('La justificación técnica de la baja es obligatoria.');
      return;
    }
    setLoading(true);
    setFormError(null);
    try {
      await onDelete(label, nodeId, justification.trim());
      onClose();
    } catch (err) {
      setFormError(err.message || 'Error al eliminar el activo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="asset-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}>
      <div
        className="asset-modal"
        style={{
          maxWidth: '520px',
          border: '1px solid rgba(239, 68, 68, 0.5)',
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.85), 0 0 25px rgba(239, 68, 68, 0.25)'
        }}
      >
        <div className="asset-modal-header" style={{ borderBottomColor: 'rgba(239, 68, 68, 0.3)' }}>
          <div>
            <h2 style={{ color: '#f87171', textShadow: '0 0 12px rgba(239, 68, 68, 0.6)' }}>
              ELIMINAR {label.toUpperCase()}
            </h2>
            <div className="asset-modal-subtitle">
              Confirma la eliminación de: <strong style={{ color: '#ffffff' }}>{nodeName}</strong>
            </div>
          </div>
          <button className="asset-modal-close" onClick={onClose} disabled={loading}>×</button>
        </div>

        <div className="asset-modal-body">
          <form onSubmit={handleSubmit} className="asset-form">
            {/* BLOQUE HUD OBLIGATORIO DE JUSTIFICACIÓN */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(30, 4, 15, 0.25))',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              borderRadius: '8px',
              padding: '12px',
              boxShadow: '0 0 15px rgba(239, 68, 68, 0.15)'
            }}>
              <div className="asset-field-label" style={{ color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📝</span> JUSTIFICACIÓN DE LA ELIMINACIÓN (OBLIGATORIO)
              </div>
              <textarea
                className="asset-input asset-textarea"
                placeholder="Motivo técnico, ticket o justificación de la baja..."
                rows={2}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                required
                autoFocus
                style={{ marginTop: '4px', borderColor: 'rgba(239, 68, 68, 0.4)' }}
              />
            </div>

            {/* AVISO PERMANENTE PREVIO */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px dashed rgba(239, 68, 68, 0.4)',
              borderRadius: '6px',
              color: '#fca5a5',
              fontSize: '13.5px',
              fontFamily: 'Rajdhani, sans-serif'
            }}>
              <span style={{ fontSize: '16px' }}>⚠️</span>
              <span><strong>¿Eliminar de forma permanente?</strong> Esta acción no se puede deshacer y se desvinculará de la topología.</span>
            </div>

            {formError && <p className="asset-error-text" style={{ color: '#f87171' }}>⚠️ {formError}</p>}

            <div className="asset-form-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                Cancelar
              </button>
              <button
                type="submit"
                className="btn"
                disabled={!justification.trim() || loading}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #ef4444, #991b1b)',
                  color: '#ffffff',
                  border: 'none',
                  fontFamily: 'Orbitron, sans-serif',
                  fontSize: '11.5px',
                  letterSpacing: '1px',
                  cursor: justification.trim() && !loading ? 'pointer' : 'not-allowed',
                  opacity: justification.trim() && !loading ? 1 : 0.45,
                  boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)'
                }}
              >
                {loading ? 'Eliminando...' : 'Confirmar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
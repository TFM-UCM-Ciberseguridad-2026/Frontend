import React, { useState, useEffect } from 'react';
import '../AddAssets/AddAssetsButton.css';
import { validateNetworkForm, validateAssetIps } from '../../../domain/entities/networkValidation';
import { validateHardwareForm, legacyCpuCores, ARQUITECTURAS, LIMITES } from '../../../domain/entities/hardwareValidation';

// Los cinco roles que acepta el backend (domain.IsValidEndpointType). De este tipo depende
// la categoría del activo y, con ella, el SLA de parcheo que se le exige.
const ENDPOINT_TYPES = [
  { value: 'Server', label: 'Servidor (Server)' },
  { value: 'Workstation', label: 'Estación de Trabajo (Workstation)' },
  { value: 'Domain Controller', label: 'Controlador de Dominio (Domain Controller)' },
  { value: 'Firewall', label: 'Firewall' },
  { value: 'Router', label: 'Router' }
];

// Activos antiguos pueden traer un tipo libre ('Linux', 'Linux Server'…) de antes de que se
// validara. No se sustituye en silencio por 'Server': eso reclasificaría el activo sin que
// nadie lo decida. Se muestra tal cual, marcado como inválido, para forzar una elección
// consciente antes de guardar.
const isKnownEndpointType = (value) => ENDPOINT_TYPES.some(t => t.value === value);

const normalizeLegacyEndpointType = (rawTipo) => {
  if (!rawTipo) return 'Server';
  const lower = String(rawTipo).toLowerCase().trim();
  if (lower.includes('workstation') || lower.includes('puesto') || lower.includes('pc') || lower.includes('laptop')) {
    return 'Workstation';
  }
  if (lower.includes('domain') || lower.includes('dc') || lower.includes('ad')) {
    return 'Domain Controller';
  }
  if (lower.includes('firewall') || lower.includes('fw')) {
    return 'Firewall';
  }
  if (lower.includes('router') || lower.includes('switch')) {
    return 'Router';
  }
  return 'Server';
};

export function EditNodeModal({ node, onClose, updateNode, allNodes = [] }) {
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({ justification: '' });
  const [originalRawTipo, setOriginalRawTipo] = useState(null);
  const label = node.primaryLabel || node.labels?.[0];

  useEffect(() => {
    if (!node || !node.properties) return;
    const props = { ...node.properties };

    if (label === 'Endpoint') {
      const rawTipo = props.tipo || props.type;
      const isUnrecognized = Boolean(rawTipo && !isKnownEndpointType(rawTipo));
      const initialTipo = isKnownEndpointType(rawTipo) ? rawTipo : normalizeLegacyEndpointType(rawTipo);
      setOriginalRawTipo(isUnrecognized ? rawTipo : null);

      const fetchIPs = async () => {
        let initialIps = [];
        try {
          const res = await fetch(`/api/endpoints/${props.id || node.id}/ips`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.ips)) {
              initialIps = data.ips.map(entry => {
                if (typeof entry === 'string') return { ip: entry, vlan_id: '' };
                return { ip: entry.ip || '', vlan_id: entry.vlan_id ?? '' };
              });
            }
          } else {
            if (Array.isArray(props.ips)) {
              initialIps = props.ips.map(entry => {
                if (typeof entry === 'string') return { ip: entry, vlan_id: '' };
                return { ip: entry.ip || '', vlan_id: entry.vlan_id ?? '' };
              });
            }
          }
        } catch (e) {
          console.error('Failed to fetch IPs:', e);
        }

        setFormData(prev => ({
          ...prev,
          hostname: props.hostname || '',
          tipo: initialTipo,
          status: props.status || 'active',
          environment: props.environment || '',
          internet_exposed: Boolean(props.internet_exposed),
          confidentiality_req: props.confidentiality_req || props.confidentiality_requirement || 'HIGH',
          integrity_req: props.integrity_req || props.integrity_requirement || 'HIGH',
          availability_req: props.availability_req || props.availability_requirement || 'HIGH',
          justification: '',
          ips: initialIps
        }));
      };

      setFormData({
        hostname: props.hostname || '',
        tipo: initialTipo,
        status: props.status || 'active',
        environment: props.environment || '',
        internet_exposed: Boolean(props.internet_exposed),
        confidentiality_req: props.confidentiality_req || props.confidentiality_requirement || 'HIGH',
        integrity_req: props.integrity_req || props.integrity_requirement || 'HIGH',
        availability_req: props.availability_req || props.availability_requirement || 'HIGH',
        justification: '',
        ips: []
      });

      fetchIPs();
    } else if (label === 'Container') {
      let initialIps = [];
      if (Array.isArray(props.ips)) {
        initialIps = props.ips.map(entry => {
          if (typeof entry === 'string') return { ip: entry, vlan_id: '' };
          return { ip: entry.ip || '', vlan_id: entry.vlan_id ?? '' };
        });
      }
      setFormData({
        name: props.name || '',
        state: props.state || 'running',
        image_id: props.image_id || '',
        internet_exposed: Boolean(props.internet_exposed),
        privileged: Boolean(props.privileged),
        justification: '',
        ips: initialIps
      });
    } else if (label === 'Network') {
      setFormData({
        nombre: props.nombre || props.name || '',
        cidr: props.cidr || '',
        gateway: props.gateway || '',
        vlan_id: props.vlan_id ?? 0,
        descripcion: props.descripcion || props.description || '',
        justification: ''
      });
    } else if (label === 'Hardware') {
      // Sin valores por defecto: lo que no está medido se muestra vacío. Antes se rellenaba
      // con 4 núcleos, 8 GB, 100 GB y x86_64, y bastaba abrir y guardar para que esas cifras
      // inventadas quedaran escritas como si fueran reales.
      const arquitectura = (props.architecture || props.type || '').toLowerCase();
      setFormData({
        manufacturer: props.manufacturer || '',
        modelo: props.model || props.modelo || '',
        serial_number: props.serial_number || '',
        cpu: props.cpu_cores ?? legacyCpuCores(props.cpu),
        ram_gb: props.ram ?? props.ram_gb ?? '',
        storage_gb: props.storage ?? props.storage_gb ?? '',
        // El valor antiguo podía ser un rol ("virtual-server"); solo se conserva si es
        // una arquitectura reconocida, para que se corrija a mano en vez de colarse.
        tipo: ARQUITECTURAS.some(a => a.value === arquitectura) ? arquitectura : '',
        justification: ''
      });
    } else if (label === 'SoftwareInstallation') {
      setFormData({
        ...props,
        install_path: props.install_path || '',
        status: props.status || 'active',
        detected_by: props.detected_by || '',
        package_manager: props.package_manager || '',
        criticality_level: props.criticality_level || 'STANDARD',
        justification: ''
      });
    } else if (label === 'Software') {
      setFormData({
        ...props,
        name: props.name || '',
        vendor: props.vendor || '',
        version: props.version || '',
        type: props.type || 'a',
        cpe: props.cpe || '',
        justification: ''
      });
    } else {
      setFormData({ ...props, justification: '' });
    }
  }, [node, label]);

  if (!node) return null;

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addIp = () => {
    setFormData(prev => ({ ...prev, ips: [...(prev.ips || []), { ip: '', vlan_id: '' }] }));
  };

  const updateIp = (idx, field, value) => {
    setFormData(prev => {
      const newIps = [...(prev.ips || [])];
      newIps[idx] = { ...newIps[idx], [field]: value };
      return { ...prev, ips: newIps };
    });
  };

  const removeIp = (idx) => {
    setFormData(prev => ({ ...prev, ips: (prev.ips || []).filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.justification || formData.justification.trim() === '') {
      setFormError('El motivo/justificación técnica es obligatorio para registrar la modificación.');
      return;
    }

    const currentIdStr = String(node.properties?.id || node.domainId || node.id || '');

    // Endpoints y contenedores comparten espacio de direcciones: una IP no puede repetirse
    // entre ellos, así que la comprobación se hace contra los dos tipos a la vez.
    const otherAssets = (allNodes || [])
      .filter(n => {
        const cat = n.primaryLabel || n.labels?.[0];
        return cat === 'Endpoint' || cat === 'Container' ||
          (n.labels || []).some(l => l === 'Endpoint' || l === 'Container');
      })
      .map(n => ({
        id: String(n.properties?.id ?? n.domainId ?? n.id ?? ''),
        name: n.properties?.hostname || n.properties?.name || n.name || '',
        ips: n.properties?.ips || []
      }));

    if (label === 'Endpoint') {
      const newName = (formData.hostname || '').toLowerCase().trim();
      if (newName) {
        const isDuplicate = (allNodes || []).some(n => {
          const nIdStr = String(n.properties?.id || n.domainId || n.id || '');
          if (nIdStr === currentIdStr) return false;
          const nCat = n.primaryLabel || n.labels?.[0];
          if (nCat !== 'Endpoint' && nCat !== 'Container' && !(n.labels || []).some(l => l === 'Endpoint' || l === 'Container')) return false;
          const nName = (n.properties?.hostname || n.properties?.name || n.name || '').toLowerCase().trim();
          return nName === newName;
        });
        if (isDuplicate) {
          setFormError('Ya existe un activo con este nombre. Por favor, elige un nombre único.');
          return;
        }
      }
      const ipError = validateAssetIps(formData.ips, otherAssets, currentIdStr);
      if (ipError) {
        setFormError(ipError);
        return;
      }
    } else if (label === 'Container') {
      const newName = (formData.name || '').toLowerCase().trim();
      if (newName) {
        const isDuplicate = (allNodes || []).some(n => {
          const nIdStr = String(n.properties?.id || n.domainId || n.id || '');
          if (nIdStr === currentIdStr) return false;
          const nCat = n.primaryLabel || n.labels?.[0];
          if (nCat !== 'Endpoint' && nCat !== 'Container' && !(n.labels || []).some(l => l === 'Endpoint' || l === 'Container')) return false;
          const nName = (n.properties?.hostname || n.properties?.name || n.name || '').toLowerCase().trim();
          return nName === newName;
        });
        if (isDuplicate) {
          setFormError('Ya existe un activo con este nombre. Por favor, elige un nombre único.');
          return;
        }
      }
      const ipError = validateAssetIps(formData.ips, otherAssets, currentIdStr);
      if (ipError) {
        setFormError(ipError);
        return;
      }
    } else if (label === 'Network') {
      // Las demás redes conocidas, en el mismo formato que espera validateNetworkForm.
      const otherNetworks = (allNodes || [])
        .filter(n => {
          const cat = n.primaryLabel || n.labels?.[0];
          return cat === 'Network' || (n.labels || []).some(l => l === 'Network');
        })
        .map(n => ({
          id: String(n.properties?.id ?? n.domainId ?? n.id ?? ''),
          nombre: n.properties?.nombre || n.properties?.name || n.name || '',
          cidr: n.properties?.cidr || '',
          vlan_id: n.properties?.vlan_id ?? n.vlan_id ?? 0
        }));

      const validationError = validateNetworkForm(formData, otherNetworks, currentIdStr);
      if (validationError) {
        setFormError(validationError);
        return;
      }
    } else if (label === 'Hardware') {
      const hwError = validateHardwareForm(formData);
      if (hwError) {
        setFormError(hwError);
        return;
      }
    }

    setLoading(true);
    setFormError(null);

    try {
      const nodeId = node.properties?.id || node.domainId || node.id;
      await updateNode(label, nodeId, formData);
      onClose();
    } catch (err) {
      console.error('Error al editar:', err);
      setFormError(err.message || 'Error desconocido al actualizar el activo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="asset-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}>
      <div className="asset-modal">
        <div className="asset-modal-header">
          <div>
            <h2>EDITAR {label.toUpperCase()}</h2>
            <div className="asset-modal-subtitle">
              {['Endpoint', 'Network', 'Container'].includes(label)
                ? 'Modifica las propiedades y reevalúa los enlaces de red de este activo'
                : 'Modifica las propiedades de este activo en la topología'}
            </div>
          </div>
          <button className="asset-modal-close" onClick={onClose} disabled={loading}>×</button>
        </div>

        <div className="asset-modal-body">
          <form onSubmit={handleSubmit} className="asset-form">
            {/* BLOQUE HUD OBLIGATORIO: JUSTIFICACIÓN */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(77, 59, 255, 0.12), rgba(17, 0, 119, 0.25))',
              border: '1px solid var(--c500)',
              borderRadius: '8px',
              padding: '12px',
              boxShadow: '0 0 15px rgba(77, 59, 255, 0.15)'
            }}>
              <div className="asset-field-label" style={{ color: 'var(--c200)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📝</span> JUSTIFICACIÓN DEL CAMBIO (OBLIGATORIO)
              </div>
              <textarea
                className="asset-input asset-textarea"
                placeholder="Motivo técnico, ticket de cambio o justificación del ajuste..."
                rows={2}
                value={formData.justification || ''}
                onChange={(e) => updateField('justification', e.target.value)}
                required
                style={{ marginTop: '4px', borderColor: 'var(--c600)' }}
              />
            </div>

            {/* CAMPOS PARA ENDPOINT */}
            {label === 'Endpoint' && (
              <>
                <div>
                  <div className="asset-field-label">Hostname</div>
                  <input
                    type="text"
                    className="asset-input"
                    value={formData.hostname || ''}
                    onChange={(e) => updateField('hostname', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <div className="asset-field-label">Tipo de Equipo</div>
                  <select
                    className="asset-input"
                    value={formData.tipo || 'Server'}
                    onChange={(e) => updateField('tipo', e.target.value)}
                  >
                    {ENDPOINT_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="asset-field-label">Estado</div>
                  <select
                    className="asset-input"
                    value={formData.status || 'active'}
                    onChange={(e) => updateField('status', e.target.value)}
                  >
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                    <option value="decommissioned">decommissioned</option>
                  </select>
                </div>

                <div>
                  <div className="asset-field-label">Entorno</div>
                  <select
                    className="asset-input"
                    value={(() => {
                      const env = (formData.environment || '').toLowerCase().trim();
                      if (env === 'production' || env === 'prod') return 'production';
                      if (env === 'development' || env === 'dev') return 'development';
                      if (env === 'staging') return 'staging';
                      return 'production';
                    })()}
                    onChange={(e) => updateField('environment', e.target.value)}
                  >
                    <option value="production">Production</option>
                    <option value="development">Development</option>
                    <option value="staging">Staging</option>
                  </select>
                </div>

                <div className="asset-checkbox-row">
                  <input
                    type="checkbox"
                    id="edit-internet-exposed"
                    checked={Boolean(formData.internet_exposed)}
                    onChange={(e) => updateField('internet_exposed', e.target.checked)}
                  />
                  <label htmlFor="edit-internet-exposed" className="asset-field-label asset-checkbox-label">
                    Expuesto a Internet
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <div className="asset-field-label">Confidencialidad</div>
                    <select
                      className="asset-input"
                      value={formData.confidentiality_req || 'HIGH'}
                      onChange={(e) => updateField('confidentiality_req', e.target.value)}
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                    </select>
                  </div>
                  <div>
                    <div className="asset-field-label">Integridad</div>
                    <select
                      className="asset-input"
                      value={formData.integrity_req || 'HIGH'}
                      onChange={(e) => updateField('integrity_req', e.target.value)}
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                    </select>
                  </div>
                  <div>
                    <div className="asset-field-label">Disponibilidad</div>
                    <select
                      className="asset-input"
                      value={formData.availability_req || 'HIGH'}
                      onChange={(e) => updateField('availability_req', e.target.value)}
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="asset-field-label">Direcciones IP y VLANs asociadas</div>
                  {(formData.ips || []).length > 0 && (
                    <div className="ip-rows">
                      {(formData.ips || []).map((ipRow, idx) => (
                        <div className="ip-row" key={idx}>
                          <input
                            type="text"
                            className="asset-input"
                            placeholder="Ej: 10.0.1.25"
                            value={ipRow.ip || ''}
                            onChange={(e) => updateIp(idx, 'ip', e.target.value)}
                          />
                          <input
                            type="number"
                            min="0"
                            className="asset-input ip-row-vlan"
                            placeholder="VLAN ID"
                            value={ipRow.vlan_id ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateIp(idx, 'vlan_id', val === '' ? '' : Number(val));
                            }}
                          />
                          <button
                            type="button"
                            className="ip-row-remove-btn"
                            onClick={() => removeIp(idx)}
                            title="Quitar IP"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button type="button" className="btn btn-secondary asset-add-ip-btn" onClick={addIp}>
                    + Añadir Dirección IP
                  </button>
                </div>
              </>
            )}

            {/* CAMPOS PARA CONTAINER */}
            {label === 'Container' && (
              <>
                <div>
                  <div className="asset-field-label">Nombre del contenedor</div>
                  <input
                    type="text"
                    className="asset-input"
                    value={formData.name || ''}
                    onChange={(e) => updateField('name', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <div className="asset-field-label">Estado</div>
                  <select
                    className="asset-input"
                    value={formData.state || 'running'}
                    onChange={(e) => updateField('state', e.target.value)}
                  >
                    <option value="running">running</option>
                    <option value="stopped">stopped</option>
                    <option value="paused">paused</option>
                  </select>
                </div>

                <div>
                  <div className="asset-field-label">Nombre de la Imagen</div>
                  <input
                    type="text"
                    className="asset-input"
                    value={formData.image_id || ''}
                    onChange={(e) => updateField('image_id', e.target.value)}
                  />
                </div>

                <div className="asset-checkbox-row">
                  <input
                    type="checkbox"
                    id="edit_cont_internet"
                    checked={Boolean(formData.internet_exposed)}
                    onChange={(e) => updateField('internet_exposed', e.target.checked)}
                  />
                  <label htmlFor="edit_cont_internet" className="asset-field-label asset-checkbox-label">
                    Expuesto a Internet
                  </label>
                </div>

                <div className="asset-checkbox-row">
                  <input
                    type="checkbox"
                    id="edit_cont_privileged"
                    checked={Boolean(formData.privileged)}
                    onChange={(e) => updateField('privileged', e.target.checked)}
                  />
                  <label htmlFor="edit_cont_privileged" className="asset-field-label asset-checkbox-label">
                    Ejecución en modo Privilegiado (Privileged)
                  </label>
                </div>

                <div>
                  <div className="asset-field-label">Direcciones IP y VLANs asociadas</div>
                  {(formData.ips || []).length > 0 && (
                    <div className="ip-rows">
                      {(formData.ips || []).map((ipRow, idx) => (
                        <div className="ip-row" key={idx}>
                          <input
                            type="text"
                            className="asset-input"
                            placeholder="Ej: 10.0.1.25"
                            value={ipRow.ip || ''}
                            onChange={(e) => updateIp(idx, 'ip', e.target.value)}
                          />
                          <input
                            type="number"
                            min="0"
                            className="asset-input ip-row-vlan"
                            placeholder="VLAN ID"
                            value={ipRow.vlan_id ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateIp(idx, 'vlan_id', val === '' ? '' : Number(val));
                            }}
                          />
                          <button
                            type="button"
                            className="ip-row-remove-btn"
                            onClick={() => removeIp(idx)}
                            title="Quitar IP"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button type="button" className="btn btn-secondary asset-add-ip-btn" onClick={addIp}>
                    + Añadir IP
                  </button>
                </div>
              </>
            )}

            {/* CAMPOS PARA RED */}
            {label === 'Network' && (
              <>
                <div>
                  <div className="asset-field-label">Nombre del segmento de red</div>
                  <input
                    type="text"
                    className="asset-input"
                    value={formData.nombre || ''}
                    onChange={(e) => updateField('nombre', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <div className="asset-field-label">Rango CIDR</div>
                  <input
                    type="text"
                    className="asset-input"
                    placeholder="10.0.1.0/24"
                    value={formData.cidr || ''}
                    onChange={(e) => updateField('cidr', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <div className="asset-field-label">Gateway IP</div>
                  <input
                    type="text"
                    className="asset-input"
                    placeholder="10.0.1.1"
                    value={formData.gateway || ''}
                    onChange={(e) => updateField('gateway', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <div className="asset-field-label">VLAN ID</div>
                  <input
                    type="number"
                    min="0"
                    className="asset-input"
                    value={formData.vlan_id ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateField('vlan_id', val === '' ? '' : Number(val));
                    }}
                  />
                </div>

                <div>
                  <div className="asset-field-label">Descripción</div>
                  <textarea
                    className="asset-input"
                    style={{ height: '70px', paddingTop: '8px' }}
                    value={formData.descripcion || ''}
                    onChange={(e) => updateField('descripcion', e.target.value)}
                  />
                </div>
              </>
            )}

            {/* CAMPOS PARA HARDWARE */}
            {label === 'Hardware' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <div className="asset-field-label">Fabricante</div>
                    <input
                      type="text"
                      className="asset-input"
                      value={formData.manufacturer || ''}
                      onChange={(e) => updateField('manufacturer', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <div className="asset-field-label">Modelo</div>
                    <input
                      type="text"
                      className="asset-input"
                      value={formData.modelo || ''}
                      onChange={(e) => updateField('modelo', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <div className="asset-field-label">Núcleos de CPU</div>
                    <input
                      type="number"
                      min="0"
                      max={LIMITES.cpuCores}
                      className="asset-input"
                      value={formData.cpu ?? ''}
                      onChange={(e) => updateField('cpu', e.target.value)}
                    />
                  </div>
                  <div>
                    <div className="asset-field-label">RAM (GB)</div>
                    <input
                      type="number"
                      min="1"
                      className="asset-input"
                      value={formData.ram_gb ?? ''}
                      onChange={(e) => updateField('ram_gb', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <div className="asset-field-label">Disco (GB)</div>
                    <input
                      type="number"
                      min="1"
                      className="asset-input"
                      value={formData.storage_gb ?? ''}
                      onChange={(e) => updateField('storage_gb', Number(e.target.value))}
                    />
                  </div>
                </div>

                <div>
                  <div className="asset-field-label">Número de serie</div>
                  <input
                    type="text"
                    className="asset-input"
                    placeholder="SN-8839201AB"
                    value={formData.serial_number || ''}
                    onChange={(e) => updateField('serial_number', e.target.value)}
                  />
                </div>

                <div>
                  <div className="asset-field-label">Arquitectura</div>
                  <select
                    className="asset-input"
                    value={formData.tipo || ''}
                    onChange={(e) => updateField('tipo', e.target.value)}
                  >
                    <option value="">Sin especificar</option>
                    {ARQUITECTURAS.map(a => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                  <div className="asset-field-help">
                    El rol del equipo (servidor, router, firewall...) se define en el endpoint, no aquí.
                  </div>
                </div>
              </>
            )}

            {/* CAMPOS PARA SOFTWARE INSTALLATION */}
            {label === 'SoftwareInstallation' && (
              <>
                <div>
                  <div className="asset-field-label">Endpoint Asociado</div>
                  <input
                    type="text"
                    className="asset-input"
                    value={formData.associated_endpoint || 'N/A'}
                    disabled
                  />
                </div>

                <div>
                  <div className="asset-field-label">Software Asociado</div>
                  <input
                    type="text"
                    className="asset-input"
                    value={formData.associated_software || 'N/A'}
                    disabled
                  />
                </div>

                <div>
                  <div className="asset-field-label">Ruta de Instalación / Identificador</div>
                  <input
                    type="text"
                    className="asset-input"
                    value={formData.install_path || ''}
                    onChange={(e) => updateField('install_path', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <div className="asset-field-label">Estado</div>
                  <select
                    className="asset-input"
                    value={formData.status || 'active'}
                    onChange={(e) => updateField('status', e.target.value)}
                  >
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                    <option value="deprecated">deprecated</option>
                    <option value="decommissioned">decommissioned</option>
                  </select>
                </div>
              </>
            )}

            {/* CAMPOS PARA SOFTWARE */}
            {label === 'Software' && (
              <>
                <div>
                  <div className="asset-field-label">Nombre del Software</div>
                  <input
                    type="text"
                    className="asset-input"
                    value={formData.name || ''}
                    onChange={(e) => updateField('name', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <div className="asset-field-label">Fabricante (Vendor)</div>
                  <input
                    type="text"
                    className="asset-input"
                    value={formData.vendor || ''}
                    onChange={(e) => updateField('vendor', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <div className="asset-field-label">Versión</div>
                  <input
                    type="text"
                    className="asset-input"
                    value={formData.version || ''}
                    onChange={(e) => updateField('version', e.target.value)}
                  />
                </div>

                <div>
                  <div className="asset-field-label">CPE</div>
                  <input
                    type="text"
                    className="asset-input"
                    value={formData.cpe || ''}
                    onChange={(e) => updateField('cpe', e.target.value)}
                  />
                </div>
              </>
            )}

            {formError && <p className="asset-error-text">⚠️ {formError}</p>}

            <div className="asset-form-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-accent asset-submit-btn" disabled={loading}>
                {loading
                  ? 'Guardando Cambios...'
                  : ['Endpoint', 'Network'].includes(label)
                    ? 'Guardar y Re-enlazar'
                    : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import '../AddAssets/AddAssetsButton.css';

export function EditNodeModal({ node, onClose, updateNode }) {
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (!node || !node.properties) return;
    const props = { ...node.properties };
    const label = node.primaryLabel;
    console.debug('[EditNodeModal] Abriendo nodo:', label, 'props.ips=', props.ips, 'props.id=', props.id);

    if (label === 'Endpoint') {
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
            // Fallback to props.ips if API fails
            if (Array.isArray(props.ips)) {
              initialIps = props.ips.map(entry => {
                if (typeof entry === 'string') return { ip: entry, vlan_id: '' };
                return { ip: entry.ip || '', vlan_id: entry.vlan_id ?? '' };
              });
            }
          }
        } catch (e) {
          console.error("Failed to fetch IPs:", e);
        }

        setFormData(prev => ({
          ...prev,
          hostname: props.hostname || '',
          tipo: props.tipo || props.type || 'Server',
          status: props.status || 'active',
          environment: props.environment || '',
          internet_exposed: Boolean(props.internet_exposed),
          confidentiality_req: props.confidentiality_req || props.confidentiality_requirement || 'HIGH',
          integrity_req: props.integrity_req || props.integrity_requirement || 'HIGH',
          availability_req: props.availability_req || props.availability_requirement || 'HIGH',
          ips: initialIps
        }));
      };

      // Initialize without IPs while loading
      setFormData({
        hostname: props.hostname || '',
        tipo: props.tipo || props.type || 'Server',
        status: props.status || 'active',
        environment: props.environment || '',
        internet_exposed: Boolean(props.internet_exposed),
        confidentiality_req: props.confidentiality_req || props.confidentiality_requirement || 'HIGH',
        integrity_req: props.integrity_req || props.integrity_requirement || 'HIGH',
        availability_req: props.availability_req || props.availability_requirement || 'HIGH',
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
        ips: initialIps
      });
    } else if (label === 'Network') {
      setFormData({
        nombre: props.nombre || props.name || '',
        cidr: props.cidr || '',
        gateway: props.gateway || '',
        vlan_id: props.vlan_id ?? 0,
        descripcion: props.descripcion || props.description || ''
      });
    } else if (label === 'Hardware') {
      setFormData({
        manufacturer: props.manufacturer || '',
        modelo: props.model || '',
        cpu: props.cpu || '4',
        ram_gb: props.ram ?? 8,
        storage_gb: props.storage ?? 100,
        tipo: props.type || 'x86_64'
      });
    } else if (label === 'SoftwareInstallation') {
      setFormData({
        ...props,
        install_path: props.install_path || '',
        status: props.status || 'active',
        detected_by: props.detected_by || '',
        package_manager: props.package_manager || ''
      });
    } else if (label === 'Software') {
      setFormData({
        ...props,
        name: props.name || '',
        vendor: props.vendor || '',
        version: props.version || '',
        type: props.type || 'a',
        cpe: props.cpe || ''
      });
    } else {
      setFormData(props);
    }
  }, [node]);

  if (!node) return null;
  const label = node.primaryLabel;

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Gestión de array de IPs para Endpoints
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
                : 'Modifica las propiedades de este activo en la topología'
              }
            </div>
          </div>
          <button className="asset-modal-close" onClick={onClose} disabled={loading}>×</button>
        </div>

        <div className="asset-modal-body">
          <form onSubmit={handleSubmit} className="asset-form">
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
                    <option value="Server">Servidor (Server)</option>
                    <option value="Workstation">Estación de Trabajo (Workstation)</option>
                    <option value="Domain Controller">Controlador de Dominio (Domain Controller)</option>
                    <option value="Firewall">Firewall</option>
                    <option value="Router">Router</option>
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
                  <input
                    type="text"
                    className="asset-input"
                    placeholder="production, staging, dev..."
                    value={formData.environment || ''}
                    onChange={(e) => updateField('environment', e.target.value)}
                  />
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
                            placeholder="VLAN ID (opcional)"
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
                  <div className="asset-field-help">
                    Al guardar, el sistema actualizará los nodos IP y re-enlazará el Endpoint con las redes cuyo rango CIDR coincida y compartan VLAN.
                  </div>
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

                <div className="asset-checkbox-row" style={{marginBottom: '1rem'}}>
                  <input
                    type="checkbox"
                    id="edit_cont_internet"
                    checked={formData.internet_exposed || false}
                    onChange={(e) => updateField('internet_exposed', e.target.checked)}
                  />
                  <label htmlFor="edit_cont_internet" className="asset-field-label asset-checkbox-label">
                    Expuesto a Internet
                  </label>
                </div>

                <div className="asset-checkbox-row" style={{marginBottom: '1rem'}}>
                  <input
                    type="checkbox"
                    id="edit_cont_privileged"
                    checked={formData.privileged || false}
                    onChange={(e) => updateField('privileged', e.target.checked)}
                  />
                  <label htmlFor="edit_cont_privileged" className="asset-field-label asset-checkbox-label" title="Si el contenedor corre en modo Privilegiado, las vulnerabilidades locales (LPE) podrán escapar al host">
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
                <div className="asset-field-help">
                  Al actualizar, se recalcularán los enlaces y los Endpoints que entren en el nuevo rango CIDR/VLAN quedarán automáticamente asociados.
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
                    />
                  </div>
                  <div>
                    <div className="asset-field-label">Modelo</div>
                    <input
                      type="text"
                      className="asset-input"
                      value={formData.modelo || ''}
                      onChange={(e) => updateField('modelo', e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <div className="asset-field-label">CPU Cores</div>
                    <input
                      type="text"
                      className="asset-input"
                      value={formData.cpu || ''}
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
                  <div className="asset-field-label">Arquitectura</div>
                  <select
                    className="asset-input"
                    value={formData.tipo || 'x86_64'}
                    onChange={(e) => updateField('tipo', e.target.value)}
                  >
                    <option value="x86_64">x86_64</option>
                    <option value="arm64">arm64 (AArch64)</option>
                    <option value="i386">i386 (x86 32-bit)</option>
                    <option value="riscv64">riscv64</option>
                  </select>
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
                    title="Esta propiedad se define mediante los enlaces del grafo y no se puede editar aquí"
                  />
                </div>

                <div>
                  <div className="asset-field-label">Software Asociado</div>
                  <input
                    type="text"
                    className="asset-input"
                    value={formData.associated_software || 'N/A'}
                    disabled
                    title="Esta propiedad se define mediante los enlaces del grafo y no se puede editar aquí"
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
                  <div className="asset-field-label">Estado (status)</div>
                  <input
                    type="text"
                    className="asset-input"
                    placeholder="active, deprecated, disabled..."
                    value={formData.status || ''}
                    onChange={(e) => updateField('status', e.target.value)}
                  />
                </div>

                <div>
                  <div className="asset-field-label">Detectado por (detected_by)</div>
                  <input
                    type="text"
                    className="asset-input"
                    placeholder="agent, nmap, manual..."
                    value={formData.detected_by || ''}
                    onChange={(e) => updateField('detected_by', e.target.value)}
                  />
                </div>

                <div>
                  <div className="asset-field-label">Gestor de Paquetes (package_manager)</div>
                  <input
                    type="text"
                    className="asset-input"
                    placeholder="dpkg, rpm, apt, npm, pip..."
                    value={formData.package_manager || ''}
                    onChange={(e) => updateField('package_manager', e.target.value)}
                  />
                </div>
              </>
            )}

            {/* CAMPOS PARA SOFTWARE (CATÁLOGO) */}
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
                  <div className="asset-field-label">Tipo (a: app, o: OS, h: hardware)</div>
                  <select
                    className="asset-input"
                    value={formData.type || 'a'}
                    onChange={(e) => updateField('type', e.target.value)}
                  >
                    <option value="a">Aplicación (a)</option>
                    <option value="o">Sistema Operativo (o)</option>
                    <option value="h">Hardware (h)</option>
                  </select>
                </div>

                <div>
                  <div className="asset-field-label">CPE</div>
                  <input
                    type="text"
                    className="asset-input"
                    placeholder="cpe:2.3:a:vendor:name:version..."
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
                    : 'Guardar Cambios'
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

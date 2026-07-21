import React, { useState } from 'react';

const ASSET_TYPES = [
  { key: 'endpoint', label: 'Endpoint', icon: '💻', description: 'Equipo, servidor o dispositivo de red' },
  { key: 'hardware', label: 'Hardware', icon: '🖥️', description: 'Componente físico asociado a un endpoint' },
  { key: 'software', label: 'Software', icon: '📦', description: 'Aplicación o sistema instalado' },
  { key: 'network', label: 'Red', icon: '🌐', description: 'Subred o segmento de red' }
];

const INITIAL_FORMS = {
  endpoint: {
    project_id: '',
    hostname: '',
    tipo: 'o',
    status: 'active',
    internet_exposed: false,
    environment: '',
    confidentiality_req: 'MEDIUM',
    integrity_req: 'MEDIUM',
    availability_req: 'MEDIUM'
  },
  hardware: {
    endpoint_id: '',
    modelo: '',
    tipo: '',
    manufacturer: '',
    serial_number: '',
    cpu: '',
    ram_gb: '',
    storage_gb: ''
  },
  software: {
    endpoint_id: '',
    name: '',
    version: '',
    type: '',
    cpe: '',
    vendor: '',
    release_date: '',
    install_path: '',
    status: 'active'
  },
  network: {
    endpoint_id: '',
    nombre: '',
    cidr: '',
    gateway: '',
    vlan_id: '',
    descripcion: ''
  }
};

const cloneInitialForm = (typeKey) => JSON.parse(JSON.stringify(INITIAL_FORMS[typeKey]));

export function AddAssetButton({ projects = [], endpoints = [], onCreated, showToast }) {
  const [showTypeSelect, setShowTypeSelect] = useState(false);
  const [activeType, setActiveType] = useState(null);
  const [forms, setForms] = useState(() => ({
    endpoint: cloneInitialForm('endpoint'),
    hardware: cloneInitialForm('hardware'),
    software: cloneInitialForm('software'),
    network: cloneInitialForm('network')
  }));
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  const openTypeSelect = () => {
    setShowTypeSelect(true);
    setFormError(null);
  };

  const closeAll = () => {
    setShowTypeSelect(false);
    setActiveType(null);
    setFormError(null);
  };

  const chooseType = (typeKey) => {
    setActiveType(typeKey);
    setShowTypeSelect(false);
  };

  const backToTypeSelect = () => {
    setActiveType(null);
    setShowTypeSelect(true);
  };

  const updateField = (typeKey, field, value) => {
    setForms(prev => ({
      ...prev,
      [typeKey]: { ...prev[typeKey], [field]: value }
    }));
  };

  const resetForm = (typeKey) => {
    setForms(prev => ({ ...prev, [typeKey]: cloneInitialForm(typeKey) }));
  };

  const submitAsset = async (typeKey) => {
    const data = forms[typeKey];
    let url = '';
    let payload = {};

    switch (typeKey) {
      case 'endpoint': {
        if (!data.project_id) {
          setFormError('Selecciona un proyecto.');
          return;
        }
        const { project_id, ...rest } = data;
        url = `/api/projects/${project_id}/endpoints`;
        payload = rest;
        break;
      }
      case 'hardware': {
        if (!data.endpoint_id) {
          setFormError('Selecciona un endpoint.');
          return;
        }
        const { endpoint_id, ram_gb, storage_gb, ...rest } = data;
        url = `/api/endpoints/${endpoint_id}/hardware`;
        payload = {
          ...rest,
          ram_gb: ram_gb === '' ? 0 : Number(ram_gb),
          storage_gb: storage_gb === '' ? 0 : Number(storage_gb)
        };
        break;
      }
      case 'software': {
        if (!data.endpoint_id) {
          setFormError('Selecciona un endpoint.');
          return;
        }
        const { endpoint_id, install_path, status, release_date, ...softwareFields } = data;

        // FIX: el struct Go domain.Software.ReleaseDate es *time.Time.
        // Un <input type="date"> manda "YYYY-MM-DD", que Go NO puede
        // parsear como time.Time (necesita RFC3339 completo). Si además
        // se manda como string vacío "", el json.Decode del backend falla
        // igualmente. Por eso: se omite el campo si está vacío, y si tiene
        // valor se completa a formato RFC3339 con hora a medianoche UTC.
        const softwarePayload = { ...softwareFields };
        if (release_date) {
          softwarePayload.release_date = `${release_date}T00:00:00Z`;
        }

        url = `/api/endpoints/${endpoint_id}/installations`;
        payload = {
          software: softwarePayload,
          installation: {
            install_path,
            status
          }
        };
        break;
      }
      case 'network': {
        if (!data.endpoint_id) {
          setFormError('Selecciona un endpoint.');
          return;
        }
        const { endpoint_id, vlan_id, ...rest } = data;
        url = `/api/endpoints/${endpoint_id}/networks`;
        payload = {
          ...rest,
          vlan_id: vlan_id === '' ? 0 : Number(vlan_id)
        };
        break;
      }
      default:
        return;
    }

    setLoading(true);
    setFormError(null);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        let backendMessage = res.statusText;
        try {
          const errBody = await res.json();
          backendMessage = errBody.error || errBody.message || JSON.stringify(errBody);
        } catch {
          // el cuerpo no era JSON parseable; nos quedamos con statusText
        }
        throw new Error(backendMessage);
      }

      showToast?.(`¡${ASSET_TYPES.find(t => t.key === typeKey)?.label} añadido correctamente!`);
      resetForm(typeKey);
      closeAll();
      await onCreated?.();
    } catch (err) {
      console.error(err);
      setFormError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e, typeKey) => {
    e.preventDefault();
    submitAsset(typeKey);
  };

  return (
    <>
      <button className="fab-add-asset" onClick={openTypeSelect} title="Añadir Activo">
        +
      </button>

      {showTypeSelect && (
        <div className="asset-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeAll(); }}>
          <div className="asset-modal asset-modal--narrow">
            <div className="asset-modal-header">
              <div>
                <h2>➕ Añadir Activo</h2>
                <div className="asset-modal-subtitle">Selecciona el tipo de activo que quieres registrar</div>
              </div>
              <button className="asset-modal-close" onClick={closeAll}>✕</button>
            </div>

            <div className="asset-type-grid">
              {ASSET_TYPES.map(t => (
                <button key={t.key} className="asset-type-card" onClick={() => chooseType(t.key)}>
                  <span className="asset-type-icon">{t.icon}</span>
                  <span className="asset-type-label">{t.label}</span>
                  <span className="asset-type-desc">{t.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ENDPOINT */}
      {activeType === 'endpoint' && (
        <div className="asset-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeAll(); }}>
          <div className="asset-modal">
            <div className="asset-modal-header">
              <div>
                <h2>💻 Nuevo Endpoint</h2>
                <div className="asset-modal-subtitle">Registra un equipo dentro de un proyecto existente</div>
              </div>
              <button className="asset-modal-close" onClick={closeAll}>✕</button>
            </div>

            <form onSubmit={(e) => handleSubmit(e, 'endpoint')} className="asset-form">
              <div>
                <div className="asset-field-label">Proyecto</div>
                <select
                  className="asset-input"
                  value={forms.endpoint.project_id}
                  onChange={(e) => updateField('endpoint', 'project_id', e.target.value)}
                  required
                >
                  <option value="">-- Selecciona un proyecto --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="asset-field-label">Hostname</div>
                <input
                  type="text"
                  className="asset-input"
                  placeholder="web-gateway-01"
                  value={forms.endpoint.hostname}
                  onChange={(e) => updateField('endpoint', 'hostname', e.target.value)}
                  required
                />
              </div>

              <div>
                <div className="asset-field-label">Tipo (convención CPE)</div>
                <select
                  className="asset-input"
                  value={forms.endpoint.tipo}
                  onChange={(e) => updateField('endpoint', 'tipo', e.target.value)}
                >
                  <option value="a">Aplicación / Servicio (a)</option>
                  <option value="o">Sistema Operativo (o)</option>
                  <option value="h">Hardware / Dispositivo (h)</option>
                </select>
              </div>

              <div>
                <div className="asset-field-label">Estado</div>
                <select
                  className="asset-input"
                  value={forms.endpoint.status}
                  onChange={(e) => updateField('endpoint', 'status', e.target.value)}
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
                  value={forms.endpoint.environment}
                  onChange={(e) => updateField('endpoint', 'environment', e.target.value)}
                />
              </div>

              <div className="asset-checkbox-row">
                <input
                  type="checkbox"
                  id="asset-internet-exposed"
                  checked={forms.endpoint.internet_exposed}
                  onChange={(e) => updateField('endpoint', 'internet_exposed', e.target.checked)}
                />
                <label htmlFor="asset-internet-exposed" className="asset-field-label asset-checkbox-label">
                  Expuesto a Internet
                </label>
              </div>

              <div>
                <div className="asset-field-label">Requisito de Confidencialidad</div>
                <select
                  className="asset-input"
                  value={forms.endpoint.confidentiality_req}
                  onChange={(e) => updateField('endpoint', 'confidentiality_req', e.target.value)}
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                </select>
              </div>

              <div>
                <div className="asset-field-label">Requisito de Integridad</div>
                <select
                  className="asset-input"
                  value={forms.endpoint.integrity_req}
                  onChange={(e) => updateField('endpoint', 'integrity_req', e.target.value)}
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                </select>
              </div>

              <div>
                <div className="asset-field-label">Requisito de Disponibilidad</div>
                <select
                  className="asset-input"
                  value={forms.endpoint.availability_req}
                  onChange={(e) => updateField('endpoint', 'availability_req', e.target.value)}
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                </select>
              </div>

              {formError && <p className="asset-error-text">⚠️ {formError}</p>}

              <div className="asset-form-actions">
                <button type="button" className="btn btn-secondary" onClick={backToTypeSelect}>
                  ← Cambiar tipo
                </button>
                <button type="submit" className="btn btn-accent asset-submit-btn" disabled={loading}>
                  {loading ? 'Guardando...' : 'Guardar Endpoint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HARDWARE */}
      {activeType === 'hardware' && (
        <div className="asset-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeAll(); }}>
          <div className="asset-modal">
            <div className="asset-modal-header">
              <div>
                <h2>🖥️ Nuevo Hardware</h2>
                <div className="asset-modal-subtitle">Asocia un componente físico a un endpoint existente</div>
              </div>
              <button className="asset-modal-close" onClick={closeAll}>✕</button>
            </div>

            <form onSubmit={(e) => handleSubmit(e, 'hardware')} className="asset-form">
              <div>
                <div className="asset-field-label">Endpoint</div>
                <select
                  className="asset-input"
                  value={forms.hardware.endpoint_id}
                  onChange={(e) => updateField('hardware', 'endpoint_id', e.target.value)}
                  required
                >
                  <option value="">-- Selecciona un endpoint --</option>
                  {endpoints.map(ep => (
                    <option key={ep.id} value={ep.id}>{ep.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="asset-field-label">Modelo</div>
                <input
                  type="text"
                  className="asset-input"
                  placeholder="PowerEdge R740"
                  value={forms.hardware.modelo}
                  onChange={(e) => updateField('hardware', 'modelo', e.target.value)}
                  required
                />
              </div>

              <div>
                <div className="asset-field-label">Tipo</div>
                <input
                  type="text"
                  className="asset-input"
                  placeholder="server, router, switch..."
                  value={forms.hardware.tipo}
                  onChange={(e) => updateField('hardware', 'tipo', e.target.value)}
                />
              </div>

              <div>
                <div className="asset-field-label">Fabricante</div>
                <input
                  type="text"
                  className="asset-input"
                  placeholder="Dell, HPE, Cisco..."
                  value={forms.hardware.manufacturer}
                  onChange={(e) => updateField('hardware', 'manufacturer', e.target.value)}
                  required
                />
              </div>

              <div>
                <div className="asset-field-label">Serial Number</div>
                <input
                  type="text"
                  className="asset-input"
                  placeholder="SN-8839201AB"
                  value={forms.hardware.serial_number}
                  onChange={(e) => updateField('hardware', 'serial_number', e.target.value)}
                />
              </div>

              <div>
                <div className="asset-field-label">CPU</div>
                <input
                  type="text"
                  className="asset-input"
                  placeholder="Intel Xeon Platinum 8380"
                  value={forms.hardware.cpu}
                  onChange={(e) => updateField('hardware', 'cpu', e.target.value)}
                />
              </div>

              <div className="asset-field-row">
                <div>
                  <div className="asset-field-label">RAM (GB)</div>
                  <input
                    type="number"
                    min="0"
                    className="asset-input"
                    value={forms.hardware.ram_gb}
                    onChange={(e) => updateField('hardware', 'ram_gb', e.target.value)}
                  />
                </div>
                <div>
                  <div className="asset-field-label">Almacenamiento (GB)</div>
                  <input
                    type="number"
                    min="0"
                    className="asset-input"
                    value={forms.hardware.storage_gb}
                    onChange={(e) => updateField('hardware', 'storage_gb', e.target.value)}
                  />
                </div>
              </div>

              {formError && <p className="asset-error-text">⚠️ {formError}</p>}

              <div className="asset-form-actions">
                <button type="button" className="btn btn-secondary" onClick={backToTypeSelect}>
                  ← Cambiar tipo
                </button>
                <button type="submit" className="btn btn-accent asset-submit-btn" disabled={loading}>
                  {loading ? 'Guardando...' : 'Guardar Hardware'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SOFTWARE */}
      {activeType === 'software' && (
        <div className="asset-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeAll(); }}>
          <div className="asset-modal">
            <div className="asset-modal-header">
              <div>
                <h2>📦 Nuevo Software</h2>
                <div className="asset-modal-subtitle">Registra una aplicación y su instalación en un endpoint</div>
              </div>
              <button className="asset-modal-close" onClick={closeAll}>✕</button>
            </div>

            <form onSubmit={(e) => handleSubmit(e, 'software')} className="asset-form">
              <div>
                <div className="asset-field-label">Endpoint</div>
                <select
                  className="asset-input"
                  value={forms.software.endpoint_id}
                  onChange={(e) => updateField('software', 'endpoint_id', e.target.value)}
                  required
                >
                  <option value="">-- Selecciona un endpoint --</option>
                  {endpoints.map(ep => (
                    <option key={ep.id} value={ep.id}>{ep.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="asset-field-label">Nombre</div>
                <input
                  type="text"
                  className="asset-input"
                  placeholder="Nginx"
                  value={forms.software.name}
                  onChange={(e) => updateField('software', 'name', e.target.value)}
                  required
                />
              </div>

              <div>
                <div className="asset-field-label">Versión</div>
                <input
                  type="text"
                  className="asset-input"
                  placeholder="1.18.0"
                  value={forms.software.version}
                  onChange={(e) => updateField('software', 'version', e.target.value)}
                  required
                />
              </div>

              <div>
                <div className="asset-field-label">Tipo</div>
                <input
                  type="text"
                  className="asset-input"
                  placeholder="web server, database, runtime..."
                  value={forms.software.type}
                  onChange={(e) => updateField('software', 'type', e.target.value)}
                />
              </div>

              <div>
                <div className="asset-field-label">CPE</div>
                <input
                  type="text"
                  className="asset-input"
                  placeholder="cpe:2.3:a:nginx:nginx:1.18.0..."
                  value={forms.software.cpe}
                  onChange={(e) => updateField('software', 'cpe', e.target.value)}
                />
              </div>

              <div>
                <div className="asset-field-label">Fabricante</div>
                <input
                  type="text"
                  className="asset-input"
                  placeholder="F5, Inc."
                  value={forms.software.vendor}
                  onChange={(e) => updateField('software', 'vendor', e.target.value)}
                />
              </div>

              <div>
                <div className="asset-field-label">Fecha de Lanzamiento</div>
                <input
                  type="date"
                  className="asset-input"
                  value={forms.software.release_date}
                  onChange={(e) => updateField('software', 'release_date', e.target.value)}
                />
              </div>

              <div className="asset-form-divider">Instalación</div>

              <div>
                <div className="asset-field-label">Install Path</div>
                <input
                  type="text"
                  className="asset-input"
                  placeholder="/usr/local/nginx/sbin"
                  value={forms.software.install_path}
                  onChange={(e) => updateField('software', 'install_path', e.target.value)}
                  required
                />
              </div>

              <div>
                <div className="asset-field-label">Status</div>
                <select
                  className="asset-input"
                  value={forms.software.status}
                  onChange={(e) => updateField('software', 'status', e.target.value)}
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                  <option value="deprecated">deprecated</option>
                </select>
              </div>

              {formError && <p className="asset-error-text">⚠️ {formError}</p>}

              <div className="asset-form-actions">
                <button type="button" className="btn btn-secondary" onClick={backToTypeSelect}>
                  ← Cambiar tipo
                </button>
                <button type="submit" className="btn btn-accent asset-submit-btn" disabled={loading}>
                  {loading ? 'Guardando...' : 'Guardar Software'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RED */}
      {activeType === 'network' && (
        <div className="asset-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeAll(); }}>
          <div className="asset-modal">
            <div className="asset-modal-header">
              <div>
                <h2>🌐 Nueva Red</h2>
                <div className="asset-modal-subtitle">Asocia una subred a un endpoint existente</div>
              </div>
              <button className="asset-modal-close" onClick={closeAll}>✕</button>
            </div>

            <form onSubmit={(e) => handleSubmit(e, 'network')} className="asset-form">
              <div>
                <div className="asset-field-label">Endpoint</div>
                <select
                  className="asset-input"
                  value={forms.network.endpoint_id}
                  onChange={(e) => updateField('network', 'endpoint_id', e.target.value)}
                  required
                >
                  <option value="">-- Selecciona un endpoint --</option>
                  {endpoints.map(ep => (
                    <option key={ep.id} value={ep.id}>{ep.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="asset-field-label">Nombre</div>
                <input
                  type="text"
                  className="asset-input"
                  placeholder="Red Interna Producción"
                  value={forms.network.nombre}
                  onChange={(e) => updateField('network', 'nombre', e.target.value)}
                  required
                />
              </div>

              <div>
                <div className="asset-field-label">CIDR</div>
                <input
                  type="text"
                  className="asset-input"
                  placeholder="10.0.1.0/24"
                  value={forms.network.cidr}
                  onChange={(e) => updateField('network', 'cidr', e.target.value)}
                  required
                />
              </div>

              <div>
                <div className="asset-field-label">Gateway</div>
                <input
                  type="text"
                  className="asset-input"
                  placeholder="10.0.1.1"
                  value={forms.network.gateway}
                  onChange={(e) => updateField('network', 'gateway', e.target.value)}
                />
              </div>

              <div>
                <div className="asset-field-label">VLAN ID</div>
                <input
                  type="number"
                  min="0"
                  className="asset-input"
                  placeholder="100"
                  value={forms.network.vlan_id}
                  onChange={(e) => updateField('network', 'vlan_id', e.target.value)}
                />
              </div>

              <div>
                <div className="asset-field-label">Descripción</div>
                <textarea
                  className="asset-input asset-textarea"
                  placeholder="Qué función cumple esta red..."
                  rows={3}
                  value={forms.network.descripcion}
                  onChange={(e) => updateField('network', 'descripcion', e.target.value)}
                />
              </div>

              {formError && <p className="asset-error-text">⚠️ {formError}</p>}

              <div className="asset-form-actions">
                <button type="button" className="btn btn-secondary" onClick={backToTypeSelect}>
                  ← Cambiar tipo
                </button>
                <button type="submit" className="btn btn-accent asset-submit-btn" disabled={loading}>
                  {loading ? 'Guardando...' : 'Guardar Red'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
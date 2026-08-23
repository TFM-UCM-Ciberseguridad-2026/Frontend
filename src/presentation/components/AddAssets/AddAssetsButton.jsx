import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';

const ASSET_TYPES = [
  { key: 'endpoint', label: 'Endpoint', icon: '💻', description: 'Equipo, servidor o dispositivo de red' },
  { key: 'container', label: 'Contenedor', icon: '🐳', description: 'Contenedor alojado en un Endpoint' },
  { key: 'hardware', label: 'Hardware', icon: '🖥️', description: 'Componente físico asociado a un endpoint' },
  { key: 'software', label: 'Software', icon: '📦', description: 'Aplicación o sistema instalado' },
  { key: 'network', label: 'Red', icon: '🌐', description: 'Subred o segmento de red' }
];

const INITIAL_FORMS = {
  endpoint: {
    project_id: '',
    hostname: '',
    tipo: 'Server',
    status: 'active',
    internet_exposed: false,
    environment: '',
    confidentiality_req: 'MEDIUM',
    integrity_req: 'MEDIUM',
    availability_req: 'MEDIUM',
    ips: []
  },
  container: {
    host_id: '',
    name: '',
    image_id: '',
    state: 'running',
    risk_score: 0,
    internet_exposed: false,
    privileged: false,
    ips: []
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
    is_container: false,
    name: '',
    version: '',
    type: 'a',
    cpe: '',
    vendor: '',
    release_date: '',
    install_path: '',
    status: 'active',
    criticality_level: 'STANDARD'
  },
  network: {
    nombre: '',
    cidr: '',
    gateway: '',
    vlan_id: '',
    descripcion: ''
  }
};
const cloneInitialForm = (typeKey) => JSON.parse(JSON.stringify(INITIAL_FORMS[typeKey]));

export function AddAssetButton({
  projects = [],
  endpoints = [],
  containers = [],
  onCreated,
  createEndpoint,
  createContainer,
  createHardware,
  createSoftware,
  createContainerSoftware,
  createNetwork
}) {
  const toast = useToast();
  const [showTypeSelect, setShowTypeSelect] = useState(false);
  const [activeType, setActiveType] = useState(null);
  const [forms, setForms] = useState(() => ({
    endpoint: cloneInitialForm('endpoint'),
    container: cloneInitialForm('container'),
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

  // --- Manejo de IPs ---
  const addIp = (typeKey) => {
    setForms(prev => ({
      ...prev,
      [typeKey]: {
        ...prev[typeKey],
        ips: [...prev[typeKey].ips, { ip: '', vlan_id: '' }]
      }
    }));
  };

  const updateIp = (typeKey, index, field, value) => {
    setForms(prev => {
      const ips = prev[typeKey].ips.map((row, i) =>
        i === index ? { ...row, [field]: value } : row
      );
      return { ...prev, [typeKey]: { ...prev[typeKey], ips } };
    });
  };

  const removeIp = (typeKey, index) => {
    setForms(prev => ({
      ...prev,
      [typeKey]: {
        ...prev[typeKey],
        ips: prev[typeKey].ips.filter((_, i) => i !== index)
      }
    }));
  };

  const submitAsset = async (typeKey) => {
    const data = forms[typeKey];
    setLoading(true);
    setFormError(null);

    try {
      switch (typeKey) {
        case 'endpoint': {
          const { project_id, ...rest } = data;
          if (createEndpoint) {
            await createEndpoint(project_id, rest);
          }
          break;
        }
        case 'container': {
          const { host_id, ...rest } = data;
          if (createContainer) {
            await createContainer(host_id, rest);
          }
          break;
        }
        case 'hardware': {
          const { endpoint_id, ...rest } = data;
          if (createHardware) {
            await createHardware(endpoint_id, rest);
          }
          break;
        }
        case 'software': {
          const { endpoint_id, ...rest } = data;
          const is_container = containers.some(c => c.id === endpoint_id);
          
          if (is_container) {
            if (createContainerSoftware) {
              await createContainerSoftware(endpoint_id, rest);
            }
          } else {
            if (createSoftware) {
              await createSoftware(endpoint_id, rest);
            }
          }
          break;
        }
        case 'network': {
          // Ya no depende de un endpoint concreto: se crea la red con su
          // propio CIDR/gateway/VLAN y el backend enlaza automáticamente
          // los endpoints cuya IP caiga bajo esa máscara y compartan VLAN.
          if (createNetwork) {
            await createNetwork(data);
          }
          break;
        }
        default:
          return;
      }

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
                <div className="asset-field-label">Tipo de Equipo</div>
                <select
                  className="asset-input"
                  value={forms.endpoint.tipo}
                  onChange={(e) => updateField('endpoint', 'tipo', e.target.value)}
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

              <div>
                <div className="asset-field-label">Direcciones IP</div>

                {forms.endpoint.ips.length > 0 && (
                  <div className="ip-rows">
                    {forms.endpoint.ips.map((ipRow, idx) => (
                      <div className="ip-row" key={idx}>
                        <input
                          type="text"
                          className="asset-input"
                          placeholder="10.0.1.25"
                          value={ipRow.ip}
                          onChange={(e) => updateIp('endpoint', idx, 'ip', e.target.value)}
                        />
                        <input
                          type="number"
                          min="0"
                          className="asset-input ip-row-vlan"
                          placeholder="VLAN ID"
                          value={ipRow.vlan_id}
                          onChange={(e) => updateIp('endpoint', idx, 'vlan_id', e.target.value)}
                        />
                        <button
                          type="button"
                          className="ip-row-remove-btn"
                          onClick={() => removeIp('endpoint', idx)}
                          title="Quitar IP"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button type="button" className="btn btn-secondary asset-add-ip-btn" onClick={() => addIp('endpoint')}>
                  + Añadir IP
                </button>

                <div className="asset-field-help">
                  Cada IP puede asociarse a una VLAN. Al crear una red, los endpoints con IP dentro de su rango CIDR y misma VLAN se enlazarán automáticamente.
                </div>
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

      {/* CONTAINER */}
      {activeType === 'container' && (
        <div className="asset-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeAll(); }}>
          <div className="asset-modal">
            <div className="asset-modal-header">
              <div>
                <h2>🐳 Nuevo Contenedor</h2>
                <div className="asset-modal-subtitle">Despliega un contenedor en un endpoint host</div>
              </div>
              <button className="asset-modal-close" onClick={closeAll}>✕</button>
            </div>

            <form onSubmit={(e) => handleSubmit(e, 'container')} className="asset-form">
              <div>
                <div className="asset-field-label">Endpoint Host</div>
                <select
                  className="asset-input"
                  value={forms.container.host_id}
                  onChange={(e) => updateField('container', 'host_id', parseInt(e.target.value) || '')}
                  required
                >
                  <option value="">-- Selecciona el host --</option>
                  {endpoints.map(ep => (
                    <option key={ep.id} value={ep.id}>{ep.name || ep.hostname}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="asset-field-label">Nombre del contenedor</div>
                <input
                  type="text"
                  className="asset-input"
                  placeholder="nginx-frontend"
                  value={forms.container.name}
                  onChange={(e) => updateField('container', 'name', e.target.value)}
                  required
                />
              </div>

              <div>
                <div className="asset-field-label">Estado</div>
                <select
                  className="asset-input"
                  value={forms.container.state}
                  onChange={(e) => updateField('container', 'state', e.target.value)}
                >
                  <option value="running">running</option>
                  <option value="stopped">stopped</option>
                  <option value="paused">paused</option>
                </select>
              </div>

              <div>
                <div className="asset-field-label">Nombre de la imagen</div>
                <input
                  type="text"
                  className="asset-input"
                  placeholder="nginx:latest"
                  value={forms.container.image_id}
                  onChange={(e) => updateField('container', 'image_id', e.target.value)}
                />
              </div>

              <div className="asset-checkbox-row" style={{marginBottom: '1rem'}}>
                <input
                  type="checkbox"
                  id="cont_internet"
                  checked={forms.container.internet_exposed}
                  onChange={(e) => updateField('container', 'internet_exposed', e.target.checked)}
                />
                <label htmlFor="cont_internet" className="asset-field-label asset-checkbox-label">
                  Expuesto a Internet
                </label>
              </div>

              <div className="asset-checkbox-row" style={{marginBottom: '1rem'}}>
                <input
                  type="checkbox"
                  id="cont_privileged"
                  checked={forms.container.privileged}
                  onChange={(e) => updateField('container', 'privileged', e.target.checked)}
                />
                <label htmlFor="cont_privileged" className="asset-field-label asset-checkbox-label" title="Si el contenedor corre en modo Privilegiado, las vulnerabilidades locales (LPE) podrán escapar al host">
                  Ejecución en modo Privilegiado (Privileged)
                </label>
              </div>

              <div>
                <div className="asset-field-label">Direcciones IP (si aplican)</div>
                {forms.container.ips.length > 0 && (
                  <div className="ip-rows">
                    {forms.container.ips.map((ipRow, idx) => (
                      <div className="ip-row" key={idx}>
                        <input
                          type="text"
                          className="asset-input"
                          placeholder="10.0.1.25"
                          value={ipRow.ip}
                          onChange={(e) => updateIp('container', idx, 'ip', e.target.value)}
                        />
                        <input
                          type="number"
                          min="0"
                          className="asset-input ip-row-vlan"
                          placeholder="VLAN ID"
                          value={ipRow.vlan_id}
                          onChange={(e) => updateIp('container', idx, 'vlan_id', e.target.value)}
                        />
                        <button
                          type="button"
                          className="ip-row-remove-btn"
                          onClick={() => removeIp('container', idx)}
                          title="Quitar IP"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button type="button" className="btn btn-secondary asset-add-ip-btn" onClick={() => addIp('container')}>
                  + Añadir IP
                </button>
              </div>

              {formError && <p className="asset-error-text">⚠️ {formError}</p>}

              <div className="asset-form-actions">
                <button type="button" className="btn btn-secondary" onClick={backToTypeSelect}>
                  ← Cambiar tipo
                </button>
                <button type="submit" className="btn btn-accent asset-submit-btn" disabled={loading}>
                  {loading ? 'Guardando...' : 'Guardar Contenedor'}
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
                <div className="asset-field-label">Host / Contenedor</div>
                <select
                  className="asset-input"
                  value={forms.software.endpoint_id}
                  onChange={(e) => updateField('software', 'endpoint_id', e.target.value)}
                  required
                >
                  <option value="">-- Selecciona un Host o Contenedor --</option>
                  <optgroup label="Endpoints (Hosts)">
                    {endpoints.map(ep => (
                      <option key={ep.id} value={ep.id}>{ep.name || ep.hostname}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Contenedores">
                    {containers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </optgroup>
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
                <select
                  className="asset-input"
                  value={forms.software.type}
                  onChange={(e) => updateField('software', 'type', e.target.value)}
                >
                  <option value="a">Aplicación / Servicio (a)</option>
                  <option value="o">Sistema Operativo (o)</option>
                  <option value="h">Hardware / Firmware (h)</option>
                </select>
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
                <div className="asset-field-help">
                  * Si no se especifica este campo, se calculará automáticamente con los datos introducidos.
                </div>
              </div>

              <div>
                <div className="asset-field-label">Fabricante</div>
                <input
                  type="text"
                  className="asset-input"
                  placeholder="f5, nginx, apache..."
                  value={forms.software.vendor}
                  onChange={(e) => updateField('software', 'vendor', e.target.value)}
                  required
                />
                <div className="asset-field-help">
                  * Obligatorio para la búsqueda precisa de vulnerabilidades en la API de NIST NVD.
                </div>
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
                <div className="asset-field-label">Criticidad de la instalación</div>
                <select
                  className="asset-input"
                  value={forms.software.criticality_level || 'STANDARD'}
                  onChange={(e) => updateField('software', 'criticality_level', e.target.value)}
                >
                  <option value="LOW">LOW · utilidad menor</option>
                  <option value="STANDARD">STANDARD · por defecto</option>
                  <option value="HIGH">HIGH · servicio relevante</option>
                  <option value="CRITICAL">CRITICAL · BBDD, auth, secretos, pagos</option>
                </select>
                <div className="asset-field-help">
                  Afecta a la prioridad de parcheo, no al riesgo técnico de la vulnerabilidad.
                </div>
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
                <div className="asset-modal-subtitle">
                  Define una subred; los endpoints cuya IP caiga en su rango CIDR y compartan VLAN se enlazarán automáticamente
                </div>
              </div>
              <button className="asset-modal-close" onClick={closeAll}>✕</button>
            </div>

            <form onSubmit={(e) => handleSubmit(e, 'network')} className="asset-form">
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
                  required
                />
                <div className="asset-field-help">
                  Recuerde que el gateway debe estar dentro del rango definido por el CIDR.
                </div>
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
                <div className="asset-field-help">
                  Los endpoints con una IP dentro del CIDR y esta misma VLAN se enlazarán automáticamente a la red.
                </div>
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

export { AddAssetButton as AddAssetsButton };
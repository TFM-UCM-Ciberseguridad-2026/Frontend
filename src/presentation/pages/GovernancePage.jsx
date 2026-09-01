import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '../context/ToastContext';
import './TtpsPage.css';

const API_BASE = 'http://localhost:8080/api/governance';

const formatDateToEuropean = (isoString) => {
  if (!isoString || isoString === 'Pendiente') return isoString || 'Pendiente';
  const parts = isoString.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoString;
};

export function GovernancePage({ selectedProjectId }) {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('politicas');
  const [openProcs, setOpenProcs] = useState({});

  const [policies, setPolicies] = useState([]);
  const [roles, setRoles] = useState([]);
  const [activities, setActivities] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [slaConfig, setSLAConfig] = useState([]);
  const [slaBreaches, setSLABreaches] = useState([]);
  const [loading, setLoading] = useState(true);

  // SLA Filters state
  const [slaSearchText, setSlaSearchText] = useState('');
  const [slaSeverityFilter, setSlaSeverityFilter] = useState('Todas');
  const [slaStatusFilter, setSlaStatusFilter] = useState('Todos');

  const filteredSLABreaches = useMemo(() => {
    return slaBreaches.filter(b => {
      if (slaSearchText && !b.cve_id.toLowerCase().includes(slaSearchText.toLowerCase())) return false;
      if (slaSeverityFilter !== 'Todas' && b.severity !== slaSeverityFilter) return false;
      if (slaStatusFilter !== 'Todos') {
        let status = 'Dentro de plazo';
        if (b.days_remaining < 0) {
          status = 'Excedido';
        } else if (b.days_remaining <= (b.sla_days * 0.2)) {
          status = 'Próximo a vencer';
        }
        if (status !== slaStatusFilter) return false;
      }
      return true;
    });
  }, [slaBreaches, slaSearchText, slaSeverityFilter, slaStatusFilter]);

  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'policy', 'role', 'activity', 'procedure'
  const [formData, setFormData] = useState({});
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, type: null, title: '' });
  const [roleDetails, setRoleDetails] = useState({ open: false, role: null, isEditing: false });

  useEffect(() => {
    if (selectedProjectId) {
      fetchAll();
    } else {
      setPolicies([]);
      setRoles([]);
      setActivities([]);
      setProcedures([]);
      setSLAConfig([]);
      setSLABreaches([]);
    }
  }, [selectedProjectId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPolicies(),
        fetchRoles(),
        fetchActivities(),
        fetchProcedures(),
        fetchSLAConfig(),
        fetchSLABreaches()
      ]);
    } catch (err) {
      console.error("Error fetching governance data:", err);
      toast.error("Error al cargar algunos datos. Revisa la consola o el servidor.", "Error de carga");
    } finally {
      setLoading(false);
    }
  };

  const fetchPolicies = () => fetch(`${API_BASE}/policies?project_id=${selectedProjectId}`).then(r => r.json()).then(d => setPolicies(d || []));
  const fetchRoles = () => fetch(`${API_BASE}/roles?project_id=${selectedProjectId}`).then(r => r.json()).then(d => setRoles(d || []));
  const fetchActivities = () => fetch(`${API_BASE}/raci?project_id=${selectedProjectId}`).then(r => r.json()).then(d => setActivities(d || []));
  const fetchProcedures = () => fetch(`${API_BASE}/procedures?project_id=${selectedProjectId}`).then(r => r.json()).then(d => setProcedures(d || []));
  const fetchSLAConfig = () => fetch(`${API_BASE}/sla?project_id=${selectedProjectId}`).then(r => r.json()).then(d => setSLAConfig(d || []));
  const fetchSLABreaches = () => fetch(`${API_BASE}/sla/breaches?project_id=${selectedProjectId}`).then(r => r.json()).then(d => setSLABreaches(d || []));

  const handleSLAChange = (severity, newDays) => {
    setSLAConfig(prev => prev.map(c => c.severity === severity ? { ...c, days: parseInt(newDays, 10) || 0 } : c));
  };

  const saveSLAConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/sla?project_id=${selectedProjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slaConfig)
      });
      if (res.ok) {
        toast.success("Configuración SLA guardada exitosamente.", "SLA Actualizado");
        fetchSLABreaches();
      } else {
        toast.error("Error al guardar la configuración de SLA en el servidor.", "Error de Guardado");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Error al comunicarse con el servidor.", "Error de Red");
    }
  };

  const toggleProc = (id) => {
    setOpenProcs(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getStatusPill = (status, label) => {
    if (status === 'active' || status === 'ok') return <span style={{ padding: '4px 8px', background: 'rgba(0, 240, 255, 0.1)', color: 'var(--c400)', borderRadius: '4px', border: '1px solid var(--c400)', fontSize: '11px', textTransform: 'uppercase' }}>{label}</span>;
    if (status === 'pending') return <span style={{ padding: '4px 8px', background: 'rgba(255, 255, 255, 0.1)', color: 'var(--c300)', borderRadius: '4px', border: '1px solid var(--c300)', fontSize: '11px', textTransform: 'uppercase' }}>{label}</span>;
    if (status === 'in_review' || status === 'warn') return <span style={{ padding: '4px 8px', background: 'rgba(255, 170, 0, 0.1)', color: '#ffaa00', borderRadius: '4px', border: '1px solid #ffaa00', fontSize: '11px', textTransform: 'uppercase' }}>{label}</span>;
    if (status === 'obsolete' || status === 'bad') return <span style={{ padding: '4px 8px', background: 'rgba(255, 50, 100, 0.1)', color: '#ff3264', borderRadius: '4px', border: '1px solid #ff3264', fontSize: '11px', textTransform: 'uppercase' }}>{label}</span>;
    if (status === 'invalid') return <span style={{ padding: '4px 8px', background: 'rgba(200, 50, 255, 0.1)', color: '#c832ff', borderRadius: '4px', border: '1px solid #c832ff', fontSize: '11px', textTransform: 'uppercase' }}>{label}</span>;
    return <span>{label}</span>;
  };

  const getRaciBadge = (letter) => {
    if (!letter) return <span style={{ display: 'inline-block', width: '28px', height: '28px', lineHeight: '28px' }}>-</span>;
    
    let color = '';
    let bg = '';
    if (letter === 'R') { color = 'var(--c400)'; bg = 'rgba(0, 240, 255, 0.1)'; }
    if (letter === 'A') { color = '#ff3264'; bg = 'rgba(255, 50, 100, 0.1)'; }
    if (letter === 'C') { color = '#ffaa00'; bg = 'rgba(255, 170, 0, 0.1)'; }
    if (letter === 'I') { color = 'var(--c300)'; bg = 'rgba(255, 255, 255, 0.05)'; }
    
    return (
      <span style={{ 
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', 
        width: '28px', height: '28px', borderRadius: '6px', 
        border: `1px solid ${color}`, background: bg, color: color,
        fontWeight: 'bold', fontSize: '13px'
      }}>
        {letter}
      </span>
    );
  };

  const handleOpenModal = (type, item = null) => {
    if (item && type === 'policy') {
      setFormData({ ...item, date: item.next_review_date });
    } else if (item) {
      setFormData({ ...item });
    } else {
      setFormData({});
    }
    setActiveModal(type);
  };

  const handleCloseModal = () => {
    setActiveModal(null);
    setFormData({});
  };

  const handleFormChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData(prev => ({ ...prev, [e.target.name]: value }));
  };

  const submitPolicy = async (e) => {
    e.preventDefault();
    if (!formData.name) return;
    try {
      const newPolicy = {
        id: formData.id || 'pol-' + Date.now(),
        name: formData.name,
        version: formData.version || 'v1.0',
        owner: formData.owner || 'CISO',
        next_review_date: formData.date || '',
        document_url: formData.document_url || '',
        under_review: formData.under_review || false
      };
      await fetch(`${API_BASE}/policies?project_id=${selectedProjectId}`, { method: 'POST', body: JSON.stringify(newPolicy) });
      toast.success('Política guardada correctamente', 'Política');
      fetchPolicies();
      handleCloseModal();
    } catch (err) {
      toast.error(err.message, 'Error al guardar política');
    }
  };

  const submitRole = async (e) => {
    e.preventDefault();
    if (!formData.name) return;
    try {
      const newRole = { 
        id: formData.id || 'role-' + Date.now(), 
        name: formData.name, 
        contact: formData.contact || '' 
      };
      await fetch(`${API_BASE}/roles?project_id=${selectedProjectId}`, { method: 'POST', body: JSON.stringify(newRole) });
      toast.success('Rol guardado correctamente', 'Rol RACI');
      fetchRoles();
      handleCloseModal();
      setRoleDetails({ open: false, role: null, isEditing: false });
    } catch (err) {
      toast.error(err.message, 'Error al guardar rol');
    }
  };

  const submitActivity = async (e) => {
    e.preventDefault();
    if (!formData.name) return;
    try {
      const newAct = {
        id: 'act-' + Date.now(),
        name: formData.name,
        order: activities.length + 1,
        roles: {}
      };
      await fetch(`${API_BASE}/raci?project_id=${selectedProjectId}`, { method: 'POST', body: JSON.stringify(newAct) });
      toast.success('Actividad añadida a la matriz RACI', 'Actividad');
      fetchActivities();
      handleCloseModal();
    } catch (err) {
      toast.error(err.message, 'Error al crear actividad');
    }
  };

  const submitProcedure = async (e) => {
    e.preventDefault();
    if (!formData.name) return;
    try {
      const stepsStr = formData.steps || "";
      const newProc = {
        id: 'PROC-' + Math.floor(Math.random() * 1000),
        name: formData.name,
        meta: "0 pasos · recién creado",
        steps: stepsStr.split(',').map(s => s.trim()).filter(s => s)
      };
      await fetch(`${API_BASE}/procedures?project_id=${selectedProjectId}`, { method: 'POST', body: JSON.stringify(newProc) });
      toast.success('Procedimiento operativo registrado', 'Procedimiento');
      fetchProcedures();
      handleCloseModal();
    } catch (err) {
      toast.error(err.message, 'Error al crear procedimiento');
    }
  };

  const openDeleteModal = (id, type, title) => {
    setDeleteModal({ open: true, id, type, title });
  };

  const confirmDelete = async () => {
    const { id, type } = deleteModal;
    try {
      if (type === 'policy') {
        await fetch(`${API_BASE}/policies/${id}?project_id=${selectedProjectId}`, { method: 'DELETE' });
        fetchPolicies();
      } else if (type === 'role') {
        await fetch(`${API_BASE}/roles/${id}?project_id=${selectedProjectId}`, { method: 'DELETE' });
        fetchRoles();
      } else if (type === 'activity') {
        await fetch(`${API_BASE}/raci/${id}?project_id=${selectedProjectId}`, { method: 'DELETE' });
        fetchActivities();
      } else if (type === 'procedure') {
        await fetch(`${API_BASE}/procedures/${id}?project_id=${selectedProjectId}`, { method: 'DELETE' });
        fetchProcedures();
      }
      toast.success('Elemento eliminado correctamente', 'Registro Eliminado');
    } catch (err) {
      toast.error(err.message, 'Error al eliminar');
    } finally {
      setDeleteModal({ open: false, id: null, type: null, title: '' });
      setRoleDetails({ open: false, role: null, isEditing: false });
    }
  };

  // --- Rotación RACI incluyendo el estado vacío / "-" ---
  const cycleRaciCell = async (activity, roleId) => {
    const current = (activity.roles && activity.roles[roleId]) || '';
    const nextMap = { '': 'R', 'R': 'A', 'A': 'C', 'C': 'I', 'I': '' };
    const nextVal = current in nextMap ? nextMap[current] : 'R';

    const newRoles = { ...(activity.roles || {}) };
    if (!nextVal) {
      delete newRoles[roleId];
    } else {
      newRoles[roleId] = nextVal;
    }

    const updated = { ...activity, roles: newRoles };
    setActivities(acts => acts.map(a => a.id === activity.id ? updated : a));
    await fetch(`${API_BASE}/raci?project_id=${selectedProjectId}`, { method: 'POST', body: JSON.stringify(updated) });
    fetchActivities();
  };

  return (
    <main className="ttps">
      <section className="page-head">
        <div className="head-info">
          <p className="eyebrow">Organización y Normativas</p>
          <h2>Gobierno y Cumplimiento</h2>
          <p>Marco documental de gestión de vulnerabilidades y asignación de responsabilidades operativas.</p>
        </div>
      </section>

      {/* TABS DE VISTA */}
      <div className="view-tabs" style={{ display: 'flex', gap: '20px', marginBottom: '30px', paddingLeft: '5px', paddingRight: '20px' }}>
        <button 
          className={`nav-btn ${activeTab === 'politicas' ? 'active' : ''}`} 
          onClick={() => setActiveTab('politicas')}
        >
          <span className="ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </span>
          Políticas
        </button>
        <button 
          className={`nav-btn ${activeTab === 'raci' ? 'active' : ''}`} 
          onClick={() => setActiveTab('raci')}
        >
          <span className="ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </span>
          Gobierno (RACI)
        </button>
        <button 
          className={`nav-btn ${activeTab === 'procedimientos' ? 'active' : ''}`} 
          onClick={() => setActiveTab('procedimientos')}
        >
          <span className="ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <polyline points="9 11 12 14 22 4"></polyline>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
          </span>
          Procedimientos
        </button>
        <button 
          className={`nav-btn ${activeTab === 'sla' ? 'active' : ''}`} 
          onClick={() => setActiveTab('sla')}
        >
          <span className="ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </span>
          SLA Parcheo
        </button>
      </div>

      <div className="list-panel" style={{ maxHeight: 'none', background: 'transparent', border: 'none', padding: '0' }}>
        
        {/* ======================= POLÍTICAS ======================= */}
        {activeTab === 'politicas' && (
          <div style={{ background: 'rgba(5, 6, 30, 0.4)', border: '1px solid var(--line)', borderRadius: '14px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ fontFamily: 'Orbitron, sans-serif', color: 'var(--c50)', textTransform: 'uppercase', margin: 0, fontSize: '14px' }}>
                Documentos normativos vigentes
              </h3>
              <button onClick={() => handleOpenModal('policy')} style={{ background: 'rgba(0, 240, 255, 0.1)', color: 'var(--c400)', border: '1px solid var(--c400)', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', fontFamily: 'Orbitron, sans-serif', fontSize: '11px' }}>
                + Añadir Política
              </button>
            </div>
            <p style={{ color: 'var(--c300)', fontSize: '13px', marginBottom: '24px' }}>
              Listado oficial del marco documental de gestión de vulnerabilidades y parcheo
            </p>
            
            {loading ? <p>Cargando...</p> : (
              <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--c100)', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
                    <th style={{ padding: '12px', color: 'var(--c300)', fontWeight: '600' }}>Documento</th>
                    <th style={{ padding: '12px', color: 'var(--c300)', fontWeight: '600' }}>Versión</th>
                    <th style={{ padding: '12px', color: 'var(--c300)', fontWeight: '600' }}>Estado</th>
                    <th style={{ padding: '12px', color: 'var(--c300)', fontWeight: '600' }}>Owner</th>
                    <th style={{ padding: '12px', color: 'var(--c300)', fontWeight: '600' }}>Próxima revisión</th>
                    <th style={{ padding: '12px', color: 'var(--c300)', fontWeight: '600', width: '70px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {policies.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '16px 12px', fontWeight: '500', color: 'var(--c50)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{width: '16px', color: 'var(--c400)'}}><path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4"/></svg>
                          {row.document_url ? (
                            <a href={row.document_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--c400)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.8'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                              {row.name}
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: '12px'}}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                            </a>
                          ) : (
                            <span>{row.name}</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '16px 12px' }}>{row.version}</td>
                      <td style={{ padding: '16px 12px' }}>{getStatusPill(row.status, row.status_label)}</td>
                      <td style={{ padding: '16px 12px' }}>{row.owner}</td>
                      <td style={{ padding: '16px 12px', color: row.status === 'bad' ? '#ff3264' : 'inherit' }}>{formatDateToEuropean(row.next_review_date)}</td>
                      <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={() => handleOpenModal('policy', row)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--c400)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '4px', transition: 'all 0.2s' }}
                            title="Modificar Política"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => openDeleteModal(row.id, 'policy', row.name)}
                            style={{ background: 'transparent', border: 'none', color: '#ff3264', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '4px', transition: 'all 0.2s' }}
                            title="Eliminar Política"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ======================= GOBIERNO (RACI) ======================= */}
        {activeTab === 'raci' && (
          <div style={{ background: 'rgba(5, 6, 30, 0.4)', border: '1px solid var(--line)', borderRadius: '14px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ fontFamily: 'Orbitron, sans-serif', color: 'var(--c50)', textTransform: 'uppercase', margin: 0, fontSize: '14px' }}>
                Matriz RACI — Gestión de Vulnerabilidades
              </h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => handleOpenModal('activity')} style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--c300)', border: '1px solid var(--line)', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', fontFamily: 'Orbitron, sans-serif', fontSize: '11px' }}>
                  + Fila (Actividad)
                </button>
                <button onClick={() => handleOpenModal('role')} style={{ background: 'rgba(0, 240, 255, 0.1)', color: 'var(--c400)', border: '1px solid var(--c400)', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', fontFamily: 'Orbitron, sans-serif', fontSize: '11px' }}>
                  + Columna (Rol)
                </button>
              </div>
            </div>
            <p style={{ color: 'var(--c300)', fontSize: '13px', marginBottom: '24px' }}>
              Click en cualquier celda para cambiar de - → R → A → C → I → -. Responsabilidades por actividad del ciclo de vida de parcheo.
            </p>

            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--c100)' }}>
                {getRaciBadge('')} <span><b>Sin asignar</b> (por defecto)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--c100)' }}>
                {getRaciBadge('R')} <span><b>Responsible</b> — ejecuta</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--c100)' }}>
                {getRaciBadge('A')} <span><b>Accountable</b> — responde (1 por fila)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--c100)' }}>
                {getRaciBadge('C')} <span><b>Consulted</b> — aporta</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--c100)' }}>
                {getRaciBadge('I')} <span><b>Informed</b> — se le comunica</span>
              </div>
            </div>

            {loading ? <p>Cargando matriz...</p> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--c100)', fontSize: '14px', textAlign: 'center' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--line)' }}>
                      <th style={{ padding: '12px', color: 'var(--c300)', fontWeight: '600', textAlign: 'left', minWidth: '200px' }}>Actividad</th>
                      
                      {roles.map(role => (
                        <th key={role.id} style={{ padding: '12px', color: 'var(--c300)', fontWeight: '600' }}>
                          <div 
                            onClick={() => setRoleDetails({ open: true, role, isEditing: false })}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--c50)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--c300)'}
                            title="Ver detalles del rol"
                          >
                            {role.name}
                          </div>
                        </th>
                      ))}
                      
                      <th style={{ padding: '12px', width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.map((act) => (
                      <tr key={act.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '16px 12px', textAlign: 'left', color: 'var(--c50)' }}>{act.name}</td>
                        
                        {roles.map(role => {
                          const letter = act.roles && act.roles[role.id];
                          return (
                            <td 
                              key={role.id} 
                              onClick={() => cycleRaciCell(act, role.id)}
                              style={{ padding: '12px', cursor: 'pointer', transition: 'background 0.2s' }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              title="Click para cambiar rol RACI (o volver a -)"
                            >
                              {getRaciBadge(letter)}
                            </td>
                          );
                        })}

                        <td style={{ padding: '16px 12px' }}>
                          <button
                            onClick={() => openDeleteModal(act.id, 'activity', act.name)}
                            style={{ background: 'transparent', border: 'none', color: '#ff3264', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '4px', transition: 'all 0.2s' }}
                            title="Eliminar fila"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ======================= PROCEDIMIENTOS ======================= */}
        {activeTab === 'procedimientos' && (
          <div style={{ background: 'rgba(5, 6, 30, 0.4)', border: '1px solid var(--line)', borderRadius: '14px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ fontFamily: 'Orbitron, sans-serif', color: 'var(--c50)', textTransform: 'uppercase', margin: 0, fontSize: '14px' }}>
                Procedimientos operativos
              </h3>
              <button onClick={() => handleOpenModal('procedure')} style={{ background: 'rgba(0, 240, 255, 0.1)', color: 'var(--c400)', border: '1px solid var(--c400)', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', fontFamily: 'Orbitron, sans-serif', fontSize: '11px' }}>
                + Añadir Procedimiento
              </button>
            </div>
            <p style={{ color: 'var(--c300)', fontSize: '13px', marginBottom: '24px' }}>
              Click en cada procedimiento para expandir los pasos operativos.
            </p>

            {loading ? <p>Cargando...</p> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px' }}>
                {procedures.map(proc => (
                  <div key={proc.id} style={{ border: '1px solid var(--line)', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', overflow: 'hidden' }}>
                    
                    <div 
                      style={{ 
                        padding: '16px', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        cursor: 'pointer', 
                        background: openProcs[proc.id] ? 'rgba(0, 240, 255, 0.05)' : 'transparent',
                        gap: '16px'
                      }}
                      onClick={() => toggleProc(proc.id)}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: 'var(--c400)', fontFamily: 'Orbitron, sans-serif', fontSize: '11px', letterSpacing: '1px', marginBottom: '4px' }}>{proc.id}</div>
                        <div style={{ color: 'var(--c50)', fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>{proc.name}</div>
                        <div style={{ color: 'var(--c300)', fontSize: '12px' }}>{proc.meta}</div>
                      </div>

                      {/* Icono de eliminar centrado verticalmente al lado del desplegable */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                        <button 
                          type="button"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            openDeleteModal(proc.id, 'procedure', proc.name); 
                          }}
                          style={{ 
                            background: 'transparent', 
                            border: 'none', 
                            color: '#ff3264', 
                            cursor: 'pointer', 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            padding: '6px', 
                            borderRadius: '4px',
                            transition: 'background 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 50, 100, 0.15)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          title="Eliminar Procedimiento"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>

                        <svg 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          style={{ 
                            width: '20px', 
                            height: '20px', 
                            color: 'var(--c300)', 
                            transform: openProcs[proc.id] ? 'rotate(180deg)' : 'none', 
                            transition: 'transform 0.2s' 
                          }}
                        >
                          <path d="M6 9l6 6 6-6"/>
                        </svg>
                      </div>
                    </div>
                    {openProcs[proc.id] && (
                      <div style={{ padding: '0 20px 20px 40px', color: 'var(--c100)', fontSize: '13px', lineHeight: '1.8' }}>
                        <ol style={{ margin: 0, paddingLeft: '16px' }}>
                          {proc.steps && proc.steps.map((step, sIdx) => <li key={sIdx}>{step}</li>)}
                        </ol>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================= SLA PARCHEO ======================= */}
        {activeTab === 'sla' && (
          <div style={{ background: 'rgba(5, 6, 30, 0.4)', border: '1px solid var(--line)', borderRadius: '14px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontFamily: 'Orbitron, sans-serif', color: 'var(--c50)', textTransform: 'uppercase', margin: 0, fontSize: '14px' }}>
                  Configuración de SLA (Días)
                </h3>
                <p style={{ color: 'var(--c300)', fontSize: '13px', margin: '4px 0 0 0' }}>
                  Define el límite máximo de días permitidos para parchear vulnerabilidades según su severidad CVSS.
                </p>
              </div>
              <button 
                onClick={saveSLAConfig} 
                style={{ background: 'rgba(0, 240, 255, 0.1)', color: 'var(--c400)', border: '1px solid var(--c400)', borderRadius: '4px', padding: '8px 16px', cursor: 'pointer', fontFamily: 'Orbitron, sans-serif', fontSize: '12px' }}
              >
                Guardar Configuración
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {['Critical', 'High', 'Medium', 'Low'].map(severity => {
                const config = slaConfig.find(c => c.severity === severity) || { days: 0 };
                let color = 'var(--c300)';
                if (severity === 'Critical') color = '#ff3264';
                if (severity === 'High') color = '#ffaa00';
                if (severity === 'Medium') color = 'var(--c400)';
                if (severity === 'Low') color = 'var(--c300)';
                
                return (
                  <div key={severity} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ color, fontSize: '14px', fontFamily: 'Orbitron, sans-serif', fontWeight: 'bold' }}>{severity}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="number" 
                        value={config.days} 
                        onChange={(e) => handleSLAChange(severity, e.target.value)}
                        style={{ width: '80px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)', color: 'white', padding: '8px 12px', borderRadius: '4px', fontSize: '16px', fontFamily: 'Share Tech Mono, monospace' }} 
                      />
                      <span style={{ color: 'var(--c300)', fontSize: '12px' }}>Días</span>
                    </div>
                  </div>
                )
              })}
            </div>
            
            <div style={{ marginTop: '40px' }}>
              <h3 style={{ fontFamily: 'Orbitron, sans-serif', color: 'var(--c50)', textTransform: 'uppercase', margin: '0 0 16px 0', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Monitoreo de SLA (Vulnerabilidades Activas)
                <span style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', color: 'var(--c200)' }}>
                  {filteredSLABreaches.length === slaBreaches.length 
                    ? slaBreaches.length 
                    : `${filteredSLABreaches.length} de ${slaBreaches.length}`}
                </span>
              </h3>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Buscar por CVE..."
                  value={slaSearchText}
                  onChange={e => setSlaSearchText(e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)', color: 'white', padding: '8px 12px', borderRadius: '4px', fontSize: '13px', minWidth: '200px' }}
                />
                
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ color: 'var(--c300)', fontSize: '12px', textTransform: 'uppercase', fontFamily: 'Orbitron, sans-serif' }}>Severidad:</span>
                  {['Todas', 'Critical', 'High', 'Medium', 'Low'].map(s => (
                    <button
                      key={s}
                      onClick={() => setSlaSeverityFilter(s)}
                      style={{
                        background: slaSeverityFilter === s ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${slaSeverityFilter === s ? 'var(--c50)' : 'var(--line)'}`,
                        color: slaSeverityFilter === s ? '#fff' : 'var(--c300)',
                        padding: '6px 12px',
                        borderRadius: '16px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontFamily: 'Share Tech Mono, monospace',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ color: 'var(--c300)', fontSize: '12px', textTransform: 'uppercase', fontFamily: 'Orbitron, sans-serif' }}>Estado:</span>
                  {['Todos', 'Excedido', 'Próximo a vencer', 'Dentro de plazo'].map(st => (
                    <button
                      key={st}
                      onClick={() => setSlaStatusFilter(st)}
                      style={{
                        background: slaStatusFilter === st ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${slaStatusFilter === st ? 'var(--c50)' : 'var(--line)'}`,
                        color: slaStatusFilter === st ? '#fff' : 'var(--c300)',
                        padding: '6px 12px',
                        borderRadius: '16px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontFamily: 'Share Tech Mono, monospace',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
              
              <div style={{ overflowX: 'auto', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--line)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--line)', background: 'rgba(0,0,0,0.2)' }}>
                      <th style={{ padding: '12px 16px', color: 'var(--c300)', fontWeight: 'normal', fontFamily: 'Orbitron, sans-serif' }}>CVE ID</th>
                      <th style={{ padding: '12px 16px', color: 'var(--c300)', fontWeight: 'normal', fontFamily: 'Orbitron, sans-serif' }}>Severidad</th>
                      <th style={{ padding: '12px 16px', color: 'var(--c300)', fontWeight: 'normal', fontFamily: 'Orbitron, sans-serif' }}>CVSS</th>
                      <th style={{ padding: '12px 16px', color: 'var(--c300)', fontWeight: 'normal', fontFamily: 'Orbitron, sans-serif' }}>Detectado el</th>
                      <th style={{ padding: '12px 16px', color: 'var(--c300)', fontWeight: 'normal', fontFamily: 'Orbitron, sans-serif' }}>Días de SLA</th>
                      <th style={{ padding: '12px 16px', color: 'var(--c300)', fontWeight: 'normal', fontFamily: 'Orbitron, sans-serif' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slaBreaches.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--c300)', fontStyle: 'italic' }}>
                          No hay vulnerabilidades activas monitorizadas
                        </td>
                      </tr>
                    ) : filteredSLABreaches.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--c300)', fontStyle: 'italic' }}>
                          No hay vulnerabilidades que coincidan con los filtros
                        </td>
                      </tr>
                    ) : (
                      filteredSLABreaches.map((b, idx) => {
                        let sevColor = 'var(--c300)';
                        if (b.severity === 'Critical') sevColor = '#ff3264';
                        if (b.severity === 'High') sevColor = '#ffaa00';
                        if (b.severity === 'Medium') sevColor = 'var(--c400)';

                        let statusText = '';
                        let statusColor = 'var(--c50)';
                        
                        if (b.days_remaining < 0) {
                          statusText = `Excedido hace ${Math.abs(b.days_remaining)} días`;
                          statusColor = '#ff3264';
                        } else if (b.days_remaining <= (b.sla_days * 0.2)) {
                          statusText = `Vence en ${b.days_remaining} días`;
                          statusColor = '#ffaa00';
                        } else {
                          statusText = `Dentro de plazo (${b.days_remaining} días restantes)`;
                          statusColor = 'var(--c400)';
                        }

                        return (
                          <tr key={`${b.cve_id}-${idx}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '12px 16px', color: 'var(--c50)', fontFamily: 'Share Tech Mono, monospace' }}>{b.cve_id}</td>
                            <td style={{ padding: '12px 16px', color: sevColor, fontWeight: 'bold' }}>{b.severity}</td>
                            <td style={{ padding: '12px 16px', color: 'var(--c200)' }}>{b.base_score.toFixed(1)}</td>
                            <td style={{ padding: '12px 16px', color: 'var(--c300)' }}>
                              {new Date(b.first_detected_at).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '12px 16px', color: 'var(--c300)' }}>{b.sla_days}</td>
                            <td style={{ padding: '12px 16px', color: statusColor, fontWeight: 'bold' }}>
                              {statusText}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======================= MODALES HUD ======================= */}

      {/* MODAL CREAR/MODIFICAR RECURSO */}
      {activeModal && (
        <div className="asset-modal-overlay" onClick={handleCloseModal}>
          <div className="asset-modal" onClick={e => e.stopPropagation()}>
            <div className="asset-modal-header">
              <div>
                <h2>
                  {activeModal === 'policy' && (formData.id ? 'EDITAR POLÍTICA' : '➕ NUEVA POLÍTICA')}
                  {activeModal === 'role' && '➕ NUEVO ROL (RACI)'}
                  {activeModal === 'activity' && '➕ NUEVA ACTIVIDAD (RACI)'}
                  {activeModal === 'procedure' && '➕ NUEVO PROCEDIMIENTO'}
                </h2>
                <div className="asset-modal-subtitle">
                  {activeModal === 'policy' && 'Registra o actualiza el documento normativo de gobierno'}
                  {activeModal === 'role' && 'Añade una columna de rol a la matriz de responsabilidades'}
                  {activeModal === 'activity' && 'Añade una fila de actividad al ciclo de parcheo'}
                  {activeModal === 'procedure' && 'Define un procedimiento operativo estándar paso a paso'}
                </div>
              </div>
              <button className="asset-modal-close" onClick={handleCloseModal}>✕</button>
            </div>

            <form
              onSubmit={
                activeModal === 'policy' ? submitPolicy :
                activeModal === 'role' ? submitRole :
                activeModal === 'activity' ? submitActivity :
                submitProcedure
              }
              className="asset-form"
            >
              <div>
                <div className="asset-field-label">Nombre / Título</div>
                <input
                  type="text"
                  name="name"
                  className="asset-input"
                  required
                  autoFocus
                  value={formData.name || ''}
                  onChange={handleFormChange}
                  placeholder="Escribe el nombre o título..."
                />
              </div>

              {activeModal === 'policy' && (
                <>
                  <div className="asset-field-row">
                    <div>
                      <div className="asset-field-label">Versión</div>
                      <input
                        type="text"
                        name="version"
                        className="asset-input"
                        value={formData.version || ''}
                        onChange={handleFormChange}
                        placeholder="v1.0"
                      />
                    </div>
                    <div>
                      <div className="asset-field-label">Owner (Responsable)</div>
                      <input
                        type="text"
                        name="owner"
                        className="asset-input"
                        value={formData.owner || ''}
                        onChange={handleFormChange}
                        placeholder="Ej: CISO, SecOps"
                      />
                    </div>
                  </div>

                  <div className="asset-field-row">
                    <div>
                      <div className="asset-field-label">Próxima Revisión</div>
                      <input
                        type="date"
                        name="date"
                        className="asset-input"
                        value={formData.date || ''}
                        onChange={handleFormChange}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '1.6rem' }}>
                      <div className="asset-checkbox-row">
                        <input
                          type="checkbox"
                          name="under_review"
                          id="under_review"
                          checked={Boolean(formData.under_review)}
                          onChange={handleFormChange}
                        />
                        <label htmlFor="under_review" className="asset-field-label asset-checkbox-label">
                          En revisión (forzar estado)
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="asset-field-label">URL del documento (SharePoint, Drive, etc.)</div>
                    <input
                      type="text"
                      name="document_url"
                      className="asset-input"
                      value={formData.document_url || ''}
                      onChange={handleFormChange}
                      placeholder="https://..."
                    />
                  </div>
                </>
              )}

              {activeModal === 'role' && (
                <div>
                  <div className="asset-field-label">Contacto (Email / Info)</div>
                  <input
                    type="text"
                    name="contact"
                    className="asset-input"
                    value={formData.contact || ''}
                    onChange={handleFormChange}
                    placeholder="ej: soc@miempresa.com"
                  />
                </div>
              )}

              {activeModal === 'procedure' && (
                <div>
                  <div className="asset-field-label">Pasos operativos (separados por comas)</div>
                  <textarea
                    name="steps"
                    className="asset-input asset-textarea"
                    rows={4}
                    value={formData.steps || ''}
                    onChange={handleFormChange}
                    placeholder="Paso 1: Notificar equipo, Paso 2: Aislar entorno, Paso 3: Aplicar parche..."
                  />
                </div>
              )}

              <div className="asset-form-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-accent asset-submit-btn">
                  Guardar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMACIÓN DE BORRADO */}
      {deleteModal.open && (
        <div className="asset-modal-overlay" onClick={() => setDeleteModal({ ...deleteModal, open: false })}>
          <div
            className="asset-modal"
            style={{
              maxWidth: '480px',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              boxShadow: '0 30px 80px rgba(0, 0, 0, 0.85), 0 0 25px rgba(239, 68, 68, 0.25)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="asset-modal-header" style={{ borderBottomColor: 'rgba(239, 68, 68, 0.3)' }}>
              <div>
                <h2 style={{ color: '#f87171', textShadow: '0 0 12px rgba(239, 68, 68, 0.6)' }}>
                  ELIMINAR REGISTRO
                </h2>
                <div className="asset-modal-subtitle">Confirma la baja permanente del elemento</div>
              </div>
              <button className="asset-modal-close" onClick={() => setDeleteModal({ ...deleteModal, open: false })}>✕</button>
            </div>

            <div className="asset-modal-body">
              <div className="asset-form">
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 14px',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px dashed rgba(239, 68, 68, 0.4)',
                  borderRadius: '6px',
                  color: '#fca5a5',
                  fontSize: '13.5px',
                  fontFamily: 'Rajdhani, sans-serif'
                }}>
                  <span style={{ fontSize: '16px' }}>⚠️</span>
                  <span>
                    ¿Estás seguro de que deseas eliminar permanentemente <strong>"{deleteModal.title}"</strong>? Esta acción no se puede deshacer.
                  </span>
                </div>

                <div className="asset-form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setDeleteModal({ ...deleteModal, open: false })}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={confirmDelete}
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #ef4444, #991b1b)',
                      color: '#ffffff',
                      border: 'none',
                      fontFamily: 'Orbitron, sans-serif',
                      fontSize: '11.5px',
                      letterSpacing: '1px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Eliminar Definitivamente
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLES DEL ROL (VER / MODIFICAR) */}
      {roleDetails.open && (
        <div className="asset-modal-overlay" onClick={() => setRoleDetails({ open: false, role: null, isEditing: false })}>
          <div className="asset-modal" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div className="asset-modal-header">
              <div>
                <h2>{roleDetails.isEditing ? 'EDITAR ROL' : 'DETALLES DEL ROL RACI'}</h2>
                <div className="asset-modal-subtitle">
                  {roleDetails.isEditing ? 'Modifica los datos del rol en la matriz' : (roleDetails.role?.name || '')}
                </div>
              </div>
              <button className="asset-modal-close" onClick={() => setRoleDetails({ open: false, role: null, isEditing: false })}>✕</button>
            </div>

            <div className="asset-modal-body">
              {!roleDetails.isEditing ? (
                <div className="asset-form">
                  <div className="asset-field-row">
                    <div>
                      <div className="asset-field-label">Identificador Interno</div>
                      <input type="text" className="asset-input" value={roleDetails.role?.id || ''} disabled />
                    </div>
                    <div>
                      <div className="asset-field-label">Nombre del Rol</div>
                      <input type="text" className="asset-input" value={roleDetails.role?.name || ''} disabled style={{ fontWeight: 'bold', color: 'var(--c400)' }} />
                    </div>
                  </div>

                  <div>
                    <div className="asset-field-label">Datos de Contacto</div>
                    <input type="text" className="asset-input" value={roleDetails.role?.contact || 'No especificado'} disabled />
                  </div>

                  <div className="asset-form-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => openDeleteModal(roleDetails.role?.id, 'role', roleDetails.role?.name)}
                      style={{ color: '#ff3264', borderColor: 'rgba(255, 50, 100, 0.4)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      Borrar Rol
                    </button>
                    <button
                      type="button"
                      className="btn btn-accent asset-submit-btn"
                      onClick={() => {
                        setFormData({ id: roleDetails.role?.id, name: roleDetails.role?.name, contact: roleDetails.role?.contact });
                        setRoleDetails(prev => ({ ...prev, isEditing: true }));
                      }}
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                      Modificar
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={submitRole} className="asset-form">
                  <div>
                    <div className="asset-field-label">Nombre del Rol</div>
                    <input
                      type="text"
                      name="name"
                      className="asset-input"
                      required
                      value={formData.name || ''}
                      onChange={handleFormChange}
                    />
                  </div>

                  <div>
                    <div className="asset-field-label">Contacto (Email / Información)</div>
                    <input
                      type="text"
                      name="contact"
                      className="asset-input"
                      value={formData.contact || ''}
                      onChange={handleFormChange}
                      placeholder="ej: soc@miempresa.com"
                    />
                  </div>

                  <div className="asset-form-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setRoleDetails(prev => ({ ...prev, isEditing: false }))}
                    >
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn-accent asset-submit-btn">
                      Guardar Cambios
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
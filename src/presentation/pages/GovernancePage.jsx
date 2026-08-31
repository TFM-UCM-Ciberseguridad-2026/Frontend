import React, { useState, useEffect, useMemo } from 'react';
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
      // 1. Text filter
      if (slaSearchText && !b.cve_id.toLowerCase().includes(slaSearchText.toLowerCase())) return false;
      
      // 2. Severity filter
      if (slaSeverityFilter !== 'Todas' && b.severity !== slaSeverityFilter) return false;
      
      // 3. Status filter
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
    await Promise.all([
      fetchPolicies(),
      fetchRoles(),
      fetchActivities(),
      fetchProcedures(),
      fetchSLAConfig(),
      fetchSLABreaches()
    ]);
    setLoading(false);
  };

  const fetchPolicies = () => fetch(`${API_BASE}/policies?project_id=${selectedProjectId}`).then(r => r.json()).then(d => setPolicies(d || []));
  const fetchRoles = () => fetch(`${API_BASE}/roles?project_id=${selectedProjectId}`).then(r => r.json()).then(d => setRoles(d || []));
  const fetchActivities = () => fetch(`${API_BASE}/raci?project_id=${selectedProjectId}`).then(r => r.json()).then(d => setActivities(d || []));
  const fetchProcedures = () => fetch(`${API_BASE}/procedures?project_id=${selectedProjectId}`).then(r => r.json()).then(d => setProcedures(d || []));
  const fetchSLAConfig = () => fetch(`${API_BASE}/sla?project_id=${selectedProjectId}`).then(r => r.json()).then(d => setSLAConfig(d || []));
  const fetchSLABreaches = () => fetch(`${API_BASE}/sla/breaches?project_id=${selectedProjectId}`).then(r => r.json()).then(d => setSLABreaches(d || []));

  const handleSLAChange = (severity, newDays) => {
    setSLAConfig(prev => prev.map(c => c.severity === severity ? { ...c, days: parseInt(newDays) || 0 } : c));
  };

  const saveSLAConfig = async () => {
    const res = await fetch(`${API_BASE}/sla?project_id=${selectedProjectId}`, { method: 'PUT', body: JSON.stringify(slaConfig) });
    if (res.ok) {
      alert("Configuración SLA guardada exitosamente.");
      fetchSLABreaches();
    } else {
      alert("Error al guardar la configuración.");
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
    if (!letter) return <span style={{ display: 'inline-block', width: '28px', height: '28px' }}>-</span>;
    
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

  // --- Actions ---

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
    fetchPolicies();
    handleCloseModal();
  };

  const submitRole = async (e) => {
    e.preventDefault();
    if (!formData.name) return;
    const newRole = { 
      id: formData.id || 'role-' + Date.now(), 
      name: formData.name, 
      contact: formData.contact || '' 
    };
    await fetch(`${API_BASE}/roles?project_id=${selectedProjectId}`, { method: 'POST', body: JSON.stringify(newRole) });
    fetchRoles();
    handleCloseModal();
    setRoleDetails({ open: false, role: null, isEditing: false });
  };

  const submitActivity = async (e) => {
    e.preventDefault();
    if (!formData.name) return;
    const newAct = {
      id: 'act-' + Date.now(),
      name: formData.name,
      order: activities.length + 1,
      roles: {}
    };
    await fetch(`${API_BASE}/raci?project_id=${selectedProjectId}`, { method: 'POST', body: JSON.stringify(newAct) });
    fetchActivities();
    handleCloseModal();
  };

  const submitProcedure = async (e) => {
    e.preventDefault();
    if (!formData.name) return;
    const stepsStr = formData.steps || "";
    const newProc = {
      id: 'PROC-' + Math.floor(Math.random() * 1000),
      name: formData.name,
      meta: "0 pasos · recién creado",
      steps: stepsStr.split(',').map(s => s.trim()).filter(s => s)
    };
    await fetch(`${API_BASE}/procedures?project_id=${selectedProjectId}`, { method: 'POST', body: JSON.stringify(newProc) });
    fetchProcedures();
    handleCloseModal();
  };

  const openDeleteModal = (id, type, title) => {
    setDeleteModal({ open: true, id, type, title });
  };

  const confirmDelete = async () => {
    const { id, type } = deleteModal;
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
    setDeleteModal({ open: false, id: null, type: null, title: '' });
    setRoleDetails({ open: false, role: null, isEditing: false });
  };

  const cycleRaciCell = async (activity, roleId) => {
    const current = (activity.roles && activity.roles[roleId]) || '';
    const nextMap = { 'R': 'A', 'A': 'C', 'C': 'I', 'I': '', '': 'R' };
    const nextVal = nextMap[current] || 'R';

    const newRoles = { ...(activity.roles || {}) };
    if (nextVal === '') {
      delete newRoles[roleId];
    } else {
      newRoles[roleId] = nextVal;
    }

    const updated = { ...activity, roles: newRoles };
    
    // Optimistic UI update
    setActivities(acts => acts.map(a => a.id === activity.id ? updated : a));

    await fetch(`${API_BASE}/raci?project_id=${selectedProjectId}`, { method: 'POST', body: JSON.stringify(updated) });
    fetchActivities(); // refetch to ensure sync
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
                    <th style={{ padding: '12px', color: 'var(--c300)', fontWeight: '600', width: '50px' }}></th>
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
                        <button onClick={() => handleOpenModal('policy', row)} style={{ background: 'transparent', border: 'none', color: 'var(--c400)', cursor: 'pointer', opacity: 0.8, marginRight: '10px' }} title="Modificar">✏️</button>
                        <button onClick={() => openDeleteModal(row.id, 'policy', row.name)} style={{ background: 'transparent', border: 'none', color: '#ff3264', cursor: 'pointer', opacity: 0.7 }} title="Eliminar">🗑️</button>
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
              Click en cualquier celda para cambiar de R → A → C → I. Responsabilidades por actividad del ciclo de vida de parcheo.
            </p>

            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
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
                              title="Click para cambiar rol RACI"
                            >
                              {getRaciBadge(letter)}
                            </td>
                          );
                        })}

                        <td style={{ padding: '16px 12px' }}>
                          <button onClick={() => openDeleteModal(act.id, 'activity', act.name)} style={{ background: 'transparent', border: 'none', color: '#ff3264', cursor: 'pointer', opacity: 0.7 }} title="Eliminar fila">🗑️</button>
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
                  <div key={proc.id} style={{ border: '1px solid var(--line)', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', overflow: 'hidden', position: 'relative' }}>
                    
                    <button 
                      onClick={(e) => { e.stopPropagation(); openDeleteModal(proc.id, 'procedure', proc.name); }}
                      style={{ position: 'absolute', top: '16px', right: '40px', background: 'none', border: 'none', color: '#ff3264', cursor: 'pointer', opacity: 0.7, zIndex: 10 }}
                      title="Eliminar"
                    >🗑️</button>

                    <div 
                      style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: openProcs[proc.id] ? 'rgba(0, 240, 255, 0.05)' : 'transparent' }}
                      onClick={() => toggleProc(proc.id)}
                    >
                      <div>
                        <div style={{ color: 'var(--c400)', fontFamily: 'Orbitron, sans-serif', fontSize: '11px', letterSpacing: '1px', marginBottom: '4px' }}>{proc.id}</div>
                        <div style={{ color: 'var(--c50)', fontWeight: '600', fontSize: '14px', marginBottom: '4px', paddingRight: '40px' }}>{proc.name}</div>
                        <div style={{ color: 'var(--c300)', fontSize: '12px' }}>{proc.meta}</div>
                      </div>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '20px', height: '20px', color: 'var(--c300)', transform: openProcs[proc.id] ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
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

      {/* ======================= MODALS ======================= */}
      {activeModal && (
        <div className="ttp-modal-backdrop" onClick={handleCloseModal}>
          <div className="ttp-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <p className="eyebrow">Añadir Nuevo</p>
                <h3>
                  {activeModal === 'policy' && 'Documento Normativo (Política)'}
                  {activeModal === 'role' && 'Rol (Columna RACI)'}
                  {activeModal === 'activity' && 'Actividad (Fila RACI)'}
                  {activeModal === 'procedure' && 'Procedimiento'}
                </h3>
              </div>
              <button className="modal-close" onClick={handleCloseModal}>✕</button>
            </div>
            
            <div className="modal-body" style={{ padding: '24px' }}>
              <form onSubmit={
                activeModal === 'policy' ? submitPolicy :
                activeModal === 'role' ? submitRole :
                activeModal === 'activity' ? submitActivity :
                submitProcedure
              } style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--c300)' }}>Nombre / Título</label>
                  <input type="text" name="name" required autoFocus value={formData.name || ''} onChange={handleFormChange} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)', color: 'white', padding: '10px 14px', borderRadius: '6px', fontSize: '14px' }} placeholder="Escribe aquí..." />
                </div>

                {activeModal === 'policy' && (
                  <>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                        <label style={{ fontSize: '12px', color: 'var(--c300)' }}>Versión</label>
                        <input type="text" name="version" value={formData.version || ''} onChange={handleFormChange} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)', color: 'white', padding: '10px 14px', borderRadius: '6px', fontSize: '14px' }} placeholder="v1.0" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                        <label style={{ fontSize: '12px', color: 'var(--c300)' }}>Owner</label>
                        <input type="text" name="owner" value={formData.owner || ''} onChange={handleFormChange} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)', color: 'white', padding: '10px 14px', borderRadius: '6px', fontSize: '14px' }} placeholder="Ej: CISO" />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                        <label style={{ fontSize: '12px', color: 'var(--c300)' }}>Próxima Revisión</label>
                        <input type="date" name="date" value={formData.date || ''} onChange={handleFormChange} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)', color: 'white', padding: '10px 14px', borderRadius: '6px', fontSize: '14px' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, marginTop: '28px' }}>
                        <input type="checkbox" name="under_review" id="under_review" checked={formData.under_review || false} onChange={handleFormChange} style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--c400)' }} />
                        <label htmlFor="under_review" style={{ fontSize: '12px', color: 'var(--c300)', cursor: 'pointer' }}>Marcar como en revisión (Forzar estado)</label>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                        <label style={{ fontSize: '12px', color: 'var(--c300)' }}>URL del documento (SharePoint, Drive, etc.)</label>
                        <input type="text" name="document_url" value={formData.document_url || ''} onChange={handleFormChange} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)', color: 'white', padding: '10px 14px', borderRadius: '6px', fontSize: '14px' }} placeholder="https://..." />
                      </div>
                    </div>
                  </>
                )}

                {activeModal === 'role' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--c300)' }}>Contacto (Email o Departamento)</label>
                    <input type="text" name="contact" value={formData.contact || ''} onChange={handleFormChange} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)', color: 'white', padding: '10px 14px', borderRadius: '6px', fontSize: '14px' }} placeholder="Opcional..." />
                  </div>
                )}

                {activeModal === 'procedure' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--c300)' }}>Pasos (separados por comas)</label>
                    <textarea name="steps" value={formData.steps || ''} onChange={handleFormChange} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)', color: 'white', padding: '10px 14px', borderRadius: '6px', fontSize: '14px', minHeight: '80px', fontFamily: 'inherit' }} placeholder="Paso 1, Paso 2, Paso 3..." />
                  </div>
                )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" onClick={handleCloseModal} style={{ padding: '10px 20px', background: 'transparent', color: 'var(--c300)', border: '1px solid var(--line)', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
                  <button type="submit" style={{ padding: '10px 20px', background: 'var(--c400)', color: '#050614', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Guardar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}


      {/* MODAL DE CONFIRMACIÓN DE BORRADO */}
      {deleteModal.open && (
        <div className="ttp-modal-backdrop" onClick={() => setDeleteModal({ ...deleteModal, open: false })}>
          <div className="ttp-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-head">
              <div>
                <p className="eyebrow">Confirmar Acción</p>
                <h3>Eliminar Registro</h3>
              </div>
              <button className="modal-close" onClick={() => setDeleteModal({ ...deleteModal, open: false })}>✕</button>
            </div>
            
            <div className="modal-body" style={{ padding: '24px' }}>
              <p style={{ color: 'var(--c100)', fontSize: '14px', marginBottom: '24px' }}>
                ¿Estás seguro de que deseas eliminar permanentemente <b>{deleteModal.title}</b>? Esta acción no se puede deshacer.
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setDeleteModal({ ...deleteModal, open: false })} style={{ padding: '10px 20px', background: 'transparent', color: 'var(--c300)', border: '1px solid var(--line)', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
                <button type="button" onClick={confirmDelete} style={{ padding: '10px 20px', background: '#ff3264', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DETALLES DEL ROL (VER / EDITAR) */}
      {roleDetails.open && (
        <div className="ttp-modal-backdrop" onClick={() => setRoleDetails({ open: false, role: null, isEditing: false })}>
          <div className="ttp-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-head">
              <div>
                <p className="eyebrow">Detalles del Rol RACI</p>
                <h3>{roleDetails.isEditing ? 'Modificar Rol' : roleDetails.role?.name}</h3>
              </div>
              <button className="modal-close" onClick={() => setRoleDetails({ open: false, role: null, isEditing: false })}>✕</button>
            </div>
            
            <div className="modal-body" style={{ padding: '0' }}>
              {!roleDetails.isEditing ? (
                <>
                  <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-soft)', padding: '16px', borderRadius: '8px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--c300)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                          Identificador interno
                        </span>
                        <p style={{ color: 'var(--c50)', margin: '0', fontSize: '13px', fontFamily: 'monospace' }}>{roleDetails.role?.id}</p>
                      </div>

                      <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-soft)', padding: '16px', borderRadius: '8px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--c300)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                          Nombre del Rol
                        </span>
                        <p style={{ color: 'var(--c400)', margin: '0', fontSize: '14px', fontWeight: 'bold' }}>{roleDetails.role?.name}</p>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(0, 240, 255, 0.02)', border: '1px solid rgba(0, 240, 255, 0.1)', padding: '16px', borderRadius: '8px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--c400)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                        Datos de Contacto
                      </span>
                      <p style={{ color: 'var(--c50)', margin: '0', fontSize: '13px' }}>{roleDetails.role?.contact || <span style={{color: 'var(--c300)', fontStyle: 'italic'}}>No especificado. Haz clic en modificar para añadir correo o información.</span>}</p>
                    </div>

                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid var(--line)', padding: '16px 24px', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                    <button 
                      onClick={() => openDeleteModal(roleDetails.role?.id, 'role', roleDetails.role?.name)} 
                      style={{ padding: '8px 16px', background: 'rgba(255, 50, 100, 0.1)', color: '#ff3264', border: '1px solid rgba(255,50,100,0.3)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      Borrar Rol
                    </button>
                    
                    <button 
                      onClick={() => {
                        setFormData({ id: roleDetails.role?.id, name: roleDetails.role?.name, contact: roleDetails.role?.contact });
                        setRoleDetails(prev => ({ ...prev, isEditing: true }));
                      }} 
                      style={{ padding: '8px 16px', background: 'var(--c400)', color: '#050614', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                      Modificar
                    </button>
                  </div>
                </>
              ) : (
                <form onSubmit={submitRole} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--c300)', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                      Nombre del Rol
                    </label>
                    <input type="text" name="name" required value={formData.name || ''} onChange={handleFormChange} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--c400)', color: 'white', padding: '12px 14px', borderRadius: '6px', fontSize: '14px', outline: 'none', boxShadow: '0 0 0 1px rgba(0, 240, 255, 0.2)' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--c300)', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                      Contacto (Email / Info)
                    </label>
                    <input type="text" name="contact" value={formData.contact || ''} onChange={handleFormChange} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)', color: 'white', padding: '12px 14px', borderRadius: '6px', fontSize: '14px', outline: 'none' }} placeholder="ej: soc@miempresa.com" />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', paddingTop: '20px', borderTop: '1px solid var(--line)' }}>
                    <button type="button" onClick={() => setRoleDetails(prev => ({ ...prev, isEditing: false }))} style={{ padding: '10px 20px', background: 'transparent', color: 'var(--c300)', border: '1px solid var(--line)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Cancelar</button>
                    <button type="submit" style={{ padding: '10px 20px', background: 'var(--c400)', color: '#050614', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>Guardar Cambios</button>
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

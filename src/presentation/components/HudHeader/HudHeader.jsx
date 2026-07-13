import React, { useState, useEffect } from 'react';

export function HudHeader({ activeNav, setActiveNav, fetchTopAPTs, setShowDashboard }) {
  const [timeStr, setTimeStr] = useState('--:--:--');
  const [dateStr, setDateStr] = useState('-----');
  const [loadVal, setLoadVal] = useState(72);

  // Reloj
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('es-ES'));
      setDateStr(now.toLocaleDateString('es-ES', {
        weekday: 'short',
        day: '2-digit',
        month: 'short'
      }).toUpperCase());
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  // Carga simulada
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadVal(prev => {
        const next = prev + (Math.random() * 6 - 3);
        return Math.max(35, Math.min(96, next));
      });
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  const circumference = 138;
  const strokeDashoffset = circumference - (circumference * loadVal) / 100;

  return (
    <header className="hud-header">
      <div className="brand" style={{ cursor: 'pointer' }} onClick={() => setShowDashboard(false)}>
        <div className="emblem"></div>
        <div>
          <h1 className="hud-title">Orquestador de Infraestructura</h1>
          <small>GRAFO DE ACTIVOS · VISTA HUD</small>
        </div>
      </div>

      <nav className="hud-nav">
        <button
          className={`nav-btn ${activeNav === 'grafo' ? 'active' : ''}`}
          onClick={() => setActiveNav('grafo')}
        >
          <span className="ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="6" cy="6" r="2.4" />
              <circle cx="18" cy="6" r="2.4" />
              <circle cx="12" cy="18" r="2.4" />
              <path d="M8 7.2 10.5 15.5M16 7.2 13.5 15.5M8.4 6h7.2" />
            </svg>
          </span>
          Grafo de Activos
        </button>

        <button
          className={`nav-btn ${activeNav === 'inventario' ? 'active' : ''}`}
          onClick={() => setActiveNav('inventario')}
        >
          <span className="ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="4" y="4" width="16" height="16" rx="1.5" />
              <path d="M4 10h16M10 10v10" />
            </svg>
          </span>
          Inventario
        </button>

        <button
          className={`nav-btn ${activeNav === 'redes' ? 'active' : ''}`}
          onClick={() => setActiveNav('redes')}
        >
          <span className="ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="8.5" />
              <path d="M3.5 12h17M12 3.5c2.6 2.4 2.6 14.6 0 17M12 3.5c-2.6 2.4-2.6 14.6 0 17" />
            </svg>
          </span>
          Redes
        </button>

        <button
          className="nav-btn"
          onClick={fetchTopAPTs}
        >
          <span className="ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 3.5 4.5 6.5v5.4c0 4.6 3.1 7.7 7.5 8.6 4.4-.9 7.5-4 7.5-8.6V6.5L12 3.5Z" />
              <path d="M9.5 12.2l1.8 1.8 3.4-3.6" />
            </svg>
          </span>
          Threat Actors
        </button>
      </nav>

      <div className="clockwrap">
        <div className="status-pill">
          <i></i> GRAFOS NEO4J
        </div>

        <div className="mini-ring">
          <svg width="52" height="52" viewBox="0 0 52 52">
            <circle cx="26" cy="26" r="22" stroke="var(--c900)" strokeWidth="3" fill="none" />
            <circle
              cx="26"
              cy="26"
              r="22"
              stroke="var(--c400)"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div className="lbl">
            <span>{Math.round(loadVal)}%</span>
            <span>CARGA</span>
          </div>
        </div>

        <div>
          <div id="clockTime">{timeStr}</div>
          <div id="clockDate">{dateStr}</div>
        </div>
      </div>
    </header>
  );
}

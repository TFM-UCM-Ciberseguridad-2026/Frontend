import React, { useState, useEffect } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
    PieChart, Pie, Legend
} from 'recharts';
import { TACTICS } from '../../../domain/mitre/tactics';
import './TTPDashboard.css';

const TTPDashboard = ({ projectId, finalTtps }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hmTooltip, setHmTooltip] = useState({ visible: false, x: 0, y: 0, content: null });
    const [llmOnly, setLlmOnly] = useState(false);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                // If projectId is null/undefined, use 0 for global
                const pId = projectId || 0;
                const response = await fetch(`/api/infrastructure/ttp-stats?project_id=${pId}`);
                if (!response.ok) {
                    throw new Error(`Error: ${response.status} ${response.statusText}`);
                }
                const data = await response.json();
                setStats(data);
            } catch (err) {
                console.error("Error fetching TTP stats:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [projectId]);

    if (loading) {
        return <div className="ttp-dashboard loading" style={{ color: 'var(--c500)', fontFamily: 'Orbitron' }}>Cargando métricas de inteligencia...</div>;
    }

    if (error) {
        return <div className="ttp-dashboard error" style={{ color: 'var(--error)' }}>Error: {error}</div>;
    }

    if (!stats) return null;

    // Calcular KPIs
    const mappedPercent = stats.total_cves > 0 
        ? Math.round((stats.mapped_cves / stats.total_cves) * 100) 
        : 0;

    // Ojo con la unidad: el backend cuenta MAPEOS (pares CVE→técnica), no técnicas
    // distintas. Las etiquetas de abajo lo dicen explícitamente.
    const totalMapeos = stats.capec_static + stats.llm_enriched;
    const capecPercent = totalMapeos > 0 
        ? Math.round((stats.capec_static / totalMapeos) * 100) 
        : 0;
    const llmPercent = totalMapeos > 0 
        ? Math.round((stats.llm_enriched / totalMapeos) * 100) 
        : 0;
    const capecPendientes = stats.capec_pending_cves || 0;

    // Base de la confianza por vulnerabilidad: solo las CVE que llegaron a
    // mapearse. Las no mapeadas no tienen confianza que medir, y meterlas en el
    // denominador diluiría el porcentaje sin significar nada.
    const cvesConConfianza = (stats.high_confidence_cves || 0) + (stats.medium_confidence_cves || 0);

    // Datos para el Donut de Confianza
    const confidenceData = [
        { name: 'Alta Confianza', value: stats.high_confidence, fill: '#00ffff' }, // cyan neon
        { name: 'Confianza Media', value: stats.medium_confidence, fill: '#ff00ff' } // magenta neon
    ];

    // Tooltip customizado para barras
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="ttp-recharts-tooltip">
                    <p className="recharts-tooltip-label">{data.id}</p>
                    <p style={{ margin: '4px 0', fontSize: '0.9rem' }}><strong>Name:</strong> {data.name}</p>
                    <p style={{ margin: '4px 0', fontSize: '0.8rem', opacity: 0.8 }}><strong>Tactic:</strong> {data.tactic}</p>
                    <p style={{ margin: '8px 0 0 0', color: '#00ffff', fontWeight: 'bold' }}>CVEs (Impactados): {data.count}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="ttp-dashboard">
            {/* KPI ROW */}
            <div className="ttp-kpi-grid">
                <div className="ttp-kpi-card">
                    <span className="ttp-kpi-title">Total CVEs Analizados</span>
                    <div className="ttp-kpi-value">{stats.total_cves}</div>
                    <span className="ttp-kpi-subtext">
                        {stats.mapped_cves} CVEs ({mappedPercent}%) cuentan con al menos un TTP
                        {capecPendientes > 0 && (
                            <> · <span style={{color: '#00ffff'}}>{capecPendientes} resolubles por catálogo CAPEC, aún sin procesar</span></>
                        )}
                    </span>
                </div>
                
                <div className="ttp-kpi-card">
                    <span className="ttp-kpi-title">Distribución TTPs Mapeados por Fuente</span>
                    <div className="ttp-kpi-value">{totalMapeos} <span style={{fontSize: '1rem', fontWeight: 'normal'}}>mapeos CVE → técnica</span></div>
                    <span className="ttp-kpi-subtext">
                        <span style={{color: '#00ffff'}}>{capecPercent}% CAPEC</span> vs <span style={{color: '#ff00ff'}}>{llmPercent}% LLM</span>
                    </span>
                </div>

                <div className="ttp-kpi-card">
                    <span className="ttp-kpi-title">Nivel de Confianza</span>
                    {/*
                      Se publican las DOS lecturas porque divergen mucho y miden cosas
                      distintas. El porcentaje por mapeo sale alto porque la vía CAPEC
                      es unas tres veces más densa (aporta muchas más técnicas por CVE),
                      así que una minoría de vulnerabilidades genera la mayoría de las
                      aristas. Enseñar solo esa cifra sugiere una fiabilidad que el
                      sistema no tiene sobre la unidad con la que se trabaja de verdad,
                      que es la vulnerabilidad.
                    */}
                    <div className="ttp-kpi-value">
                        {cvesConConfianza > 0 ? Math.round((stats.high_confidence_cves/cvesConConfianza)*100) : 0}% <span style={{fontSize: '1rem', fontWeight: 'normal'}}>de CVEs con técnica de Alta</span>
                    </div>
                    <span className="ttp-kpi-subtext">
                        {stats.medium_confidence_cves > 0
                            ? <><span style={{color: '#ff00ff'}}>{stats.medium_confidence_cves} CVEs ({cvesConConfianza > 0 ? Math.round((stats.medium_confidence_cves/cvesConConfianza)*100) : 0}%) solo tienen técnicas de confianza Media</span> · </>
                            : 'Todas las CVEs mapeadas tienen alguna técnica de Alta confianza · '}
                        Por mapeo: {totalMapeos > 0 ? Math.round((stats.high_confidence/totalMapeos)*100) : 0}% Alta ({totalMapeos} aristas)
                    </span>
                </div>

            </div>

            {/* CHARTS ROW */}
            <div className="ttp-charts-grid">
                <div className="ttp-chart-card">
                    <h3 className="ttp-chart-title">Top 10 TTPs Más Frecuentes</h3>
                    <div className="ttp-chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.top_ttps} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis 
                                    dataKey="id" 
                                    stroke="#888" 
                                    tick={{fill: '#8b949e', fontSize: 12}} 
                                    tickMargin={10} 
                                />
                                <YAxis 
                                    stroke="#888" 
                                    tick={{fill: '#8b949e', fontSize: 12}} 
                                />
                                <RechartsTooltip content={<CustomTooltip />} cursor={{fill: 'rgba(0, 255, 255, 0.1)'}} />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                    {stats.top_ttps.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={`hsl(180, 100%, ${40 + (index * 4)}%)`} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="ttp-chart-card">
                    <h3 className="ttp-chart-title">Distribución por Nivel de Confianza (mapeos CVE → técnica)</h3>
                    <div className="ttp-chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={confidenceData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={110}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                </Pie>
                                <RechartsTooltip 
                                    formatter={(value, name) => [`${value} mapeos`, name]}
                                    contentStyle={{backgroundColor: 'rgba(13, 17, 23, 0.95)', borderColor: '#30363d', color: '#fff'}}
                                    itemStyle={{color: '#00ffff'}}
                                />
                                <Legend verticalAlign="bottom" height={36} wrapperStyle={{color: '#8b949e', fontSize: '0.9rem'}} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* ATT&CK HEATMAP ROW */}
            {finalTtps && finalTtps.length > 0 && (
            <div className="ttp-heatmap-card" style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 className="ttp-chart-title" style={{ marginBottom: 0 }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{width: '14px', height: '14px', stroke: 'var(--c400)'}}>
                            <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
                            <path d="M3.5 9h17M8 9v11" />
                        </svg>
                        Heatmap ATT&CK (Frecuencia en entorno)
                    </h3>
                </div>
                <div className="ttp-heatmap-scroll">
                    <div className="ttp-heatmap-grid">
                        {TACTICS.map(tac => {
                            const tacticTtps = finalTtps.filter(t => (t.tactics || []).includes(tac.key)).sort((a,b) => {
                                const aCves = new Set((a.cves || []).map(c => c.id)).size;
                                const bCves = new Set((b.cves || []).map(c => c.id)).size;
                                return bCves - aCves;
                            });
                            
                            // Calcula el máximo global o por táctica para intensidad. Usamos global para ver qué técnicas destacan en toda la matriz.
                            const maxGlobal = finalTtps.reduce((acc, t) => {
                                const tCves = new Set((t.cves || []).map(c => c.id)).size;
                                return Math.max(acc, tCves);
                            }, 1);
                            
                            return (
                                <div key={tac.key} className="heatmap-tactic-col">
                                    <div className="heatmap-tactic-head">
                                        <div>{tac.label}</div>
                                        <small>{tac.id}</small>
                                    </div>
                                    {tacticTtps.length > 0 ? (
                                        tacticTtps.map(ttp => {
                                            // Deduplicar CVEs por ID para evitar inflar el contador
                                            const uniqueCvesMap = new Map();
                                            if (ttp.cves) {
                                                ttp.cves.forEach(c => {
                                                    if (c.id && !uniqueCvesMap.has(c.id)) {
                                                        uniqueCvesMap.set(c.id, c);
                                                    }
                                                });
                                            }
                                            const uniqueCvesList = Array.from(uniqueCvesMap.values());
                                            const count = uniqueCvesList.length;

                                            // Intensidad base 0.15 hasta 1.0 dependiendo de los CVEs impactados
                                            const intensity = 0.15 + (0.85 * (count / maxGlobal));
                                            
                                            return (
                                                <div 
                                                    key={ttp.id} 
                                                    className="heatmap-cell"
                                                    style={{ 
                                                        backgroundColor: `rgba(0, 255, 255, ${intensity})`,
                                                        borderColor: `rgba(0, 255, 255, ${Math.min(1, intensity + 0.3)})`
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        setHmTooltip({
                                                            visible: true,
                                                            x: rect.left + rect.width / 2,
                                                            y: rect.top - 8,
                                                            content: (
                                                                <>
                                                                    <div style={{color: '#fff', marginBottom: '8px', fontSize: '0.85rem'}}>{ttp.id} - {ttp.name}</div>
                                                                    <div style={{color: '#00ffff', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '6px'}}>Se relaciona a {count} CVE(s):</div>
                                                                    <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                                                        {uniqueCvesList.slice(0, 7).map(cve => (
                                                                            <div key={cve.id} style={{fontSize: '0.75rem', color: '#8b949e'}}>
                                                                                <span style={{color: '#fff'}}>{cve.id}</span> (CVSS {cve.cvss})
                                                                            </div>
                                                                        ))}
                                                                        {uniqueCvesList.length > 7 && (
                                                                            <div style={{fontSize: '0.75rem', color: 'var(--c400)', fontStyle: 'italic'}}>
                                                                                + {uniqueCvesList.length - 7} más...
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </>
                                                            )
                                                        });
                                                    }}
                                                    onMouseLeave={() => setHmTooltip(prev => ({ ...prev, visible: false }))}
                                                >
                                                    <span className="hm-cid" style={{ color: intensity > 0.4 ? '#000' : 'var(--c400)' }}>{ttp.id}</span>
                                                    <span className="hm-cname" style={{ color: intensity > 0.4 ? '#000' : 'var(--c100)' }}>{ttp.name}</span>
                                                    <span className="hm-count" style={{ color: intensity > 0.4 ? 'rgba(0,0,0,0.7)' : 'var(--c400)' }}>{count}</span>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="heatmap-empty-cell">Sin mapeos</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            )}

            {/* Custom Heatmap Tooltip */}
            {hmTooltip.visible && (
                <div 
                    style={{
                        position: 'fixed',
                        top: hmTooltip.y,
                        left: hmTooltip.x,
                        transform: 'translate(-50%, -100%)',
                        backgroundColor: 'rgba(13, 17, 23, 0.95)',
                        border: '1px solid #30363d',
                        padding: '10px 14px',
                        borderRadius: '4px',
                        pointerEvents: 'none',
                        zIndex: 9999,
                        whiteSpace: 'nowrap',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                        fontFamily: 'Rajdhani, sans-serif'
                    }}
                >
                    {hmTooltip.content}
                </div>
            )}
        </div>
    );
};

export default TTPDashboard;

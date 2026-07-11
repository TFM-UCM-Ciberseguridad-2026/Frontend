import { useState, useEffect, useRef } from 'react'

function App() {
  const [showDashboard, setShowDashboard] = useState(false)
  const [clicks, setClicks] = useState(0)

  // Estados del Dashboard
  const [graphData, setGraphData] = useState({ nodes: [], relationships: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('ALL')
  const [toastMessage, setToastMessage] = useState(null)

  const networkRef = useRef(null)
  const containerRef = useRef(null)

  // Mostrar toast temporal
  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Cargar datos de la API
  const fetchInfrastructure = async (quiet = false) => {
    if (!quiet) setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/infrastructure')
      if (!res.ok) {
        throw new Error(`Error en el servidor: ${res.statusText}`)
      }
      const data = await res.json()
      setGraphData(data)
    } catch (err) {
      console.error(err)
      setError(`No se pudo conectar a la base de datos de Neo4j. Verifica que el servidor de Backend (puerto 8080) y la base de datos de Neo4j estén activos. Detalles: ${err.message}`)
    } finally {
      if (!quiet) setLoading(false)
    }
  }

  // Cargar datos al iniciar el Dashboard
  useEffect(() => {
    if (showDashboard) {
      fetchInfrastructure()
    }
  }, [showDashboard])

  // Restablecer y sembrar el escenario de prueba
  const handleReset = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/infrastructure/populate', { method: 'POST' })
      if (!res.ok) {
        throw new Error(`Error de red: ${res.statusText}`)
      }
      showToast('¡Grafo restablecido con datos de prueba!')
      await fetchInfrastructure(true)
    } catch (err) {
      console.error(err)
      setError(`Error al poblar la base de datos: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Helper para obtener el tipo/label principal de un nodo
  const getPrimaryLabel = (labels) => {
    if (!labels || labels.length === 0) return 'Unknown'
    const validLabels = labels.filter(l => l !== 'BaseNode' && l !== 'Persistable')
    return validLabels[0] || labels[0]
  }

  // Parsear nombres de nodos de forma amigable
  const getNodeName = (node) => {
    const label = getPrimaryLabel(node.labels)
    const props = node.properties || {}

    switch (label) {
      case 'Project':
        return props.name || `Proyecto #${props.id}`
      case 'Network':
        return `${props.name || 'Red'} (${props.cidr || ''})`
      case 'Endpoint':
        return props.hostname || `Host #${props.id}`
      case 'Software':
        return `${props.name || 'Software'} v${props.version || ''}`
      case 'SoftwareInstallation':
        return `Inst: ${props.path || props.id}`
      case 'Finding':
        return props.title || `Finding #${props.id}`
      case 'Vulnerability':
        return props.cve_id || `Vuln #${props.id}`
      case 'Remediation':
        return props.description ? (props.description.length > 30 ? props.description.substring(0, 30) + '...' : props.description) : 'Mitigación'
      case 'Patch':
        return props.name || `Parche #${props.id}`
      case 'TTP':
        return `${props.id || ''}: ${props.name || ''}`
      case 'ThreatActor':
        return props.name || `Actor #${props.id}`
      case 'Hardware':
        return props.name || `Hardware #${props.id}`
      default:
        return `${label} (${props.id || 'N/A'})`
    }
  }

  // Configuración de colores por tipo de nodo
  const getNodeColors = (label, props = {}) => {
    switch (label) {
      case 'Project':
        return { background: '#2563eb', border: '#1d4ed8', highlight: { background: '#3b82f6', border: '#1d4ed8' } }
      case 'Network':
        return { background: '#059669', border: '#047857', highlight: { background: '#10b981', border: '#047857' } }
      case 'Endpoint':
        if (props.risk_tier === 'CRITICAL') {
          return { background: '#dc2626', border: '#991b1b', highlight: { background: '#ef4444', border: '#991b1b' } }
        }
        if (props.risk_tier === 'HIGH') {
          return { background: '#ea580c', border: '#c2410c', highlight: { background: '#f97316', border: '#c2410c' } }
        }
        return { background: '#475569', border: '#334155', highlight: { background: '#64748b', border: '#334155' } }
      case 'Software':
        return { background: '#0891b2', border: '#0e7490', highlight: { background: '#06b6d4', border: '#0e7490' } }
      case 'SoftwareInstallation':
        return { background: '#7c3aed', border: '#6d28d9', highlight: { background: '#8b5cf6', border: '#6d28d9' } }
      case 'Finding':
        return { background: '#d97706', border: '#b45309', highlight: { background: '#f59e0b', border: '#b45309' } }
      case 'Vulnerability':
        return { background: '#e11d48', border: '#be123c', highlight: { background: '#f43f5e', border: '#be123c' } }
      case 'Remediation':
        return { background: '#0d9488', border: '#0f766e', highlight: { background: '#14b8a6', border: '#0f766e' } }
      case 'Patch':
        return { background: '#ca8a04', border: '#a16207', highlight: { background: '#eab308', border: '#a16207' } }
      case 'TTP':
        return { background: '#db2777', border: '#be185d', highlight: { background: '#ec4899', border: '#be185d' } }
      case 'ThreatActor':
        return { background: '#1f2937', border: '#111827', highlight: { background: '#374151', border: '#111827' } }
      case 'Hardware':
        return { background: '#78716c', border: '#57534e', highlight: { background: '#a8a29e', border: '#57534e' } }
      default:
        return { background: '#6b7280', border: '#4b5563', highlight: { background: '#9ca3af', border: '#4b5563' } }
    }
  }

  // Renderizar grafo interactivo en Canvas
  useEffect(() => {
    if (!showDashboard || loading || error || !containerRef.current || !window.vis) return

    const { Network, DataSet } = window.vis

    // Filtrar y mapear nodos
    const visNodesArray = graphData.nodes
      .filter(node => {
        if (filterType === 'ALL') return true
        return node.labels.includes(filterType)
      })
      .map(node => {
        const label = getPrimaryLabel(node.labels)
        const name = getNodeName(node)
        const colors = getNodeColors(label, node.properties)

        let size = 20
        if (label === 'Project') size = 30
        if (label === 'Endpoint') size = 25
        if (label === 'Network') size = 26
        if (label === 'Vulnerability') size = 25

        const isMatched = searchQuery && name.toLowerCase().includes(searchQuery.toLowerCase())

        return {
          id: node.id,
          label: name,
          title: `<strong>${label}</strong><br/>${Object.entries(node.properties || {})
            .map(([k, v]) => `${k}: ${v}`)
            .join('<br/>')}`,
          color: colors,
          size: isMatched ? size * 1.5 : size,
          borderWidth: isMatched ? 4 : 2,
          shadow: isMatched,
          font: {
            color: '#f8fafc',
            size: isMatched ? 15 : 12,
            face: 'Outfit, sans-serif'
          }
        }
      })

    const visNodes = new DataSet(visNodesArray)

    // Filtrar relaciones cuyos extremos existan en la lista de nodos activos
    const activeNodeIds = new Set(visNodesArray.map(n => n.id))
    const visEdgesArray = graphData.relationships
      .filter(rel => activeNodeIds.has(rel.source) && activeNodeIds.has(rel.target))
      .map(rel => {
        let edgeColor = '#475569'
        if (rel.type === 'OF_VULNERABILITY' || rel.type === 'TARGETS_VULN') edgeColor = '#ef4444'
        if (rel.type === 'CONNECTED_TO') edgeColor = '#10b981'

        return {
          id: rel.id,
          from: rel.source,
          to: rel.target,
          label: rel.type,
          font: { size: 9, color: '#94a3b8', strokeWidth: 0, face: 'Outfit' },
          color: { color: edgeColor, highlight: '#3b82f6', hover: '#64748b' },
          arrows: { to: { enabled: true, scaleFactor: 0.8 } },
          smooth: { type: 'continuous', roundness: 0.5 }
        }
      })

    const visEdges = new DataSet(visEdgesArray)

    const options = {
      physics: {
        barnesHut: {
          gravitationalConstant: -2500,
          centralGravity: 0.35,
          springLength: 100,
          springConstant: 0.04,
          damping: 0.09,
          avoidOverlap: 0.8
        },
        stabilization: {
          iterations: 150,
          fit: true
        }
      },
      nodes: {
        shape: 'dot',
        borderWidth: 2,
        shadow: { enabled: true, color: 'rgba(0,0,0,0.5)', size: 5, x: 2, y: 2 }
      },
      edges: {
        width: 1.5
      },
      interaction: {
        hover: true,
        tooltipDelay: 150,
        selectable: true,
        selectConnectedEdges: true
      }
    }

    const network = new Network(containerRef.current, { nodes: visNodes, edges: visEdges }, options)
    networkRef.current = network

    network.on('click', (params) => {
      if (params.nodes && params.nodes.length > 0) {
        const nodeId = params.nodes[0]
        const origNode = graphData.nodes.find(n => n.id === nodeId)
        if (origNode) {
          setSelectedNode(origNode)
        }
      } else {
        setSelectedNode(null)
      }
    })

    if (searchQuery) {
      const matchedNode = visNodesArray.find(n => n.label.toLowerCase().includes(searchQuery.toLowerCase()))
      if (matchedNode) {
        network.selectNodes([matchedNode.id])
        network.focus(matchedNode.id, {
          scale: 1.1,
          animation: { duration: 1000, easingFunction: 'easeInOutQuad' }
        })
        const origNode = graphData.nodes.find(n => n.id === matchedNode.id)
        if (origNode) setSelectedNode(origNode)
      }
    }

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy()
        networkRef.current = null
      }
    }
  }, [showDashboard, graphData, filterType, searchQuery, loading, error])

  // Contar nodos por tipo para el sidebar
  const getNodeCountByType = (type) => {
    return graphData.nodes.filter(n => n.labels.includes(type)).length
  }

  // ========== DASHBOARD VIEW ==========
  if (showDashboard) {
    return (
      <div className="dashboard-wrapper">
        {/* CABECERA */}
        <header className="dashboard-header">
          <div className="header-title-container">
            <div className="header-logo">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
            </div>
            <h1 className="header-title">Orquestador de Infraestructura</h1>
            <span className="status-badge" style={{ marginBottom: 0, padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>
              <div className="status-dot"></div>
              Grafos Neo4j
            </span>
          </div>

          <div className="header-actions">
            <button className="btn btn-secondary" onClick={() => setShowDashboard(false)} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
              ← Volver al Inicio
            </button>
          </div>
        </header>

        {/* SIDEBAR DE CONTROL (IZQUIERDA) */}
        <aside className="dashboard-sidebar">
          <div>
            <div className="section-title">Buscar Activos</div>
            <input
              type="text"
              className="search-input"
              placeholder="Ej. web-gateway-01..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div>
            <div className="section-title">Filtrar por Categoría</div>
            <div className="filter-group">
              {[
                { key: 'ALL', label: 'Todos', count: graphData.nodes.length },
                { key: 'Project', label: 'Proyectos' },
                { key: 'Network', label: 'Redes' },
                { key: 'Endpoint', label: 'Equipos (Endpoints)' },
                { key: 'Hardware', label: 'Hardware' },
                { key: 'Software', label: 'Software' },
                { key: 'SoftwareInstallation', label: 'Instalaciones' },
                { key: 'Finding', label: 'Hallazgos (Findings)' },
                { key: 'Vulnerability', label: 'Vulnerabilidades (CVE)' },
                { key: 'Remediation', label: 'Remediaciones' },
                { key: 'Patch', label: 'Parches' },
                { key: 'TTP', label: 'MITRE TTPs' },
                { key: 'ThreatActor', label: 'Actores de Amenaza' },
              ].map(f => (
                <button key={f.key} className={`filter-btn ${filterType === f.key ? 'active' : ''}`} onClick={() => setFilterType(f.key)}>
                  <span>{f.label}</span>
                  <span className="filter-count">{f.count !== undefined ? f.count : getNodeCountByType(f.key)}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 'auto' }}>
            <div className="section-title">Base de Datos</div>
            <button className="btn btn-accent" onClick={handleReset} style={{ width: '100%', padding: '0.75rem' }} disabled={loading}>
              {loading ? 'Inicializando...' : 'Restablecer Datos de Prueba'}
            </button>
            <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', marginBottom: 0, textAlign: 'center' }}>
              Vacía el grafo y carga un escenario completo de ciberseguridad corporativo.
            </p>
          </div>
        </aside>

        {/* CANVAS DE GRAFO (CENTRO) */}
        <main className="dashboard-canvas-container">
          {loading && (
            <div className="loader-container">
              <div className="spinner"></div>
              <p>Conectando y recuperando topología de Neo4j...</p>
            </div>
          )}

          {error && (
            <div style={{ padding: '3rem', color: '#f87171', background: '#1c1c24', margin: '2rem', borderRadius: '12px', border: '1px solid #7f1d1d' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>⚠️ Conexión fallida</h3>
              <p style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>{error}</p>
              <button className="btn btn-secondary" onClick={() => fetchInfrastructure()} style={{ marginTop: '1.5rem' }}>
                Reintentar Conexión
              </button>
            </div>
          )}

          {!loading && !error && (
            <>
              <div ref={containerRef} className="network-graph-canvas" />

              <div className="graph-legend">
                <div className="legend-item"><div className="legend-color" style={{ background: '#2563eb' }}></div>Proyecto</div>
                <div className="legend-item"><div className="legend-color" style={{ background: '#059669' }}></div>Red / Subred</div>
                <div className="legend-item"><div className="legend-color" style={{ background: '#ef4444' }}></div>Endpoint Crítico</div>
                <div className="legend-item"><div className="legend-color" style={{ background: '#475569' }}></div>Endpoint Común</div>
                <div className="legend-item"><div className="legend-color" style={{ background: '#0891b2' }}></div>Software</div>
                <div className="legend-item"><div className="legend-color" style={{ background: '#7c3aed' }}></div>Instalación</div>
                <div className="legend-item"><div className="legend-color" style={{ background: '#d97706' }}></div>Hallazgo</div>
                <div className="legend-item"><div className="legend-color" style={{ background: '#e11d48' }}></div>Vulnerabilidad (CVE)</div>
                <div className="legend-item"><div className="legend-color" style={{ background: '#0d9488' }}></div>Remediación</div>
                <div className="legend-item"><div className="legend-color" style={{ background: '#ca8a04' }}></div>Parche</div>
                <div className="legend-item"><div className="legend-color" style={{ background: '#db2777' }}></div>MITRE TTP</div>
                <div className="legend-item"><div className="legend-color" style={{ background: '#1f2937' }}></div>Actor de Amenaza</div>
              </div>

              <div className="canvas-toast">
                💡 Arrastra para explorar · Rueda del ratón para zoom · Clic en un nodo para inspeccionar
              </div>
            </>
          )}

          {toastMessage && (
            <div className="canvas-toast" style={{ bottom: '4rem', background: '#10b981', color: 'white', fontWeight: 'bold' }}>
              {toastMessage}
            </div>
          )}
        </main>

        {/* INSPECTOR DE NODOS (DERECHA) */}
        <aside className="dashboard-inspector">
          {!selectedNode ? (
            <div className="inspector-empty">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.063.852l-.708 2.836a.75.75 0 001.063.852l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              <div>
                <h4>Inspector de Activos</h4>
                <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', marginBottom: 0 }}>
                  Haz clic en cualquier nodo del grafo para auditar sus propiedades, vulnerabilidades y relaciones asociadas.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="inspector-header">
                <span className={`badge badge-${getPrimaryLabel(selectedNode.labels).toLowerCase()}`}>
                  {getPrimaryLabel(selectedNode.labels)}
                </span>
                <h3 className="inspector-title">{getNodeName(selectedNode)}</h3>
              </div>

              <div>
                <div className="section-title">Propiedades del Activo</div>
                <table className="property-table">
                  <tbody>
                    <tr>
                      <td className="property-key">ID Interno Neo4j</td>
                      <td className="property-value">{selectedNode.id}</td>
                    </tr>
                    {Object.entries(selectedNode.properties || {}).map(([key, val]) => (
                      <tr key={key}>
                        <td className="property-key">{key}</td>
                        <td className="property-value">
                          {typeof val === 'boolean' ? (val ? '✅ True' : '❌ False') : String(val)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 'auto', borderTop: '1px solid var(--surface-border)', paddingTop: '1rem' }}>
                <div className="section-title" style={{ fontSize: '0.8rem' }}>Etiquetas Neo4j</div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  {selectedNode.labels.map(l => (
                    <span key={l} className="badge" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#d1d5db' }}>
                      :{l}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    )
  }

  // ========== LANDING PAGE (ORIGINAL) ==========
  return (
    <div className="container">
      <div className="logo-container">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
      </div>

      <h1>Orquestador</h1>

      <div className="status-badge">
        <div className="status-dot"></div>
        Sistema En Línea
      </div>

      <p>
        Bienvenido al panel principal de tu Orquestador. Todo está configurado y funcionando perfectamente.
        Este entorno React está listo para que construyas la interfaz de administración.
      </p>

      <div className="button-group">
        <button className="btn btn-accent" onClick={() => setShowDashboard(true)}>
          🔍 Ver Infraestructura
        </button>
        <button className="btn btn-primary" onClick={() => setClicks(clicks + 1)}>
          Interacciones: {clicks}
        </button>
        <button className="btn btn-secondary" onClick={() => window.open('https://github.com/TFM-UCM-Ciberseguridad-2026/Orquestador', '_blank')}>
          Ver Repositorio
        </button>
      </div>

      <div className="footer">
        Desplegado automáticamente mediante GitHub Actions • React + Vite
      </div>
    </div>
  )
}

export default App

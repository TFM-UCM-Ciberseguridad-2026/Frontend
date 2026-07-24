import { useState, useEffect, useMemo, useCallback } from 'react';
import { InfrastructureApiDataSource } from '../../data/datasources/InfrastructureApiDataSource';
import { InfrastructureRepositoryImpl } from '../../data/repositories/InfrastructureRepositoryImpl';
import { GetInfrastructureUseCase } from '../../domain/usecases/GetInfrastructureUseCase';
import { PopulateInfrastructureUseCase } from '../../domain/usecases/PopulateInfrastructureUseCase';
import { GetTopAptsUseCase } from '../../domain/usecases/GetTopAptsUseCase';

export function useInfrastructure() {
  const [showDashboard, setShowDashboard] = useState(false);
  const [clicks, setClicks] = useState(0);

  // Estados de infraestructura
  const [graphData, setGraphData] = useState({ nodes: [], relationships: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [toastMessage, setToastMessage] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  // Estados de APTs
  const [showAPTPanel, setShowAPTPanel] = useState(false);
  const [aptData, setAptData] = useState([]);
  const [aptLoading, setAptLoading] = useState(false);
  const [aptError, setAptError] = useState(null);

  // Inyección de dependencias (Clean Architecture)
  const apiDataSource = useMemo(() => new InfrastructureApiDataSource(), []);
  const repository = useMemo(() => new InfrastructureRepositoryImpl(apiDataSource), [apiDataSource]);
  const getInfrastructureUseCase = useMemo(() => new GetInfrastructureUseCase(repository), [repository]);
  const populateInfrastructureUseCase = useMemo(() => new PopulateInfrastructureUseCase(repository), [repository]);
  const getTopAptsUseCase = useMemo(() => new GetTopAptsUseCase(repository), [repository]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchInfrastructure = async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const data = await getInfrastructureUseCase.execute();
      setGraphData(data);
    } catch (err) {
      console.error(err);
      setError(`No se pudo conectar a la base de datos de Neo4j. Verifica que el servidor de Backend (puerto 8080) y la base de datos de Neo4j estén activos. Detalles: ${err.message}`);
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    setError(null);
    try {
      await populateInfrastructureUseCase.execute();
      showToast('¡Grafo restablecido con datos de prueba!');
      await fetchInfrastructure(true);
    } catch (err) {
      console.error(err);
      setError(`Error al poblar la base de datos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopAPTs = async () => {
    setShowAPTPanel(true);
    setAptLoading(true);
    setAptError(null);
    try {
      const data = await getTopAptsUseCase.execute();
      setAptData(data || []);
    } catch (err) {
      console.error(err);
      setAptError(err.message);
    } finally {
      setAptLoading(false);
    }
  };

  // Cargar datos al activar el Dashboard
  useEffect(() => {
    if (showDashboard) {
      fetchInfrastructure();
    }
  }, [showDashboard]);

  // Derivar lista de proyectos disponibles
  const projects = useMemo(() => {
    return (graphData.nodes || []).filter(
      n => n.labels?.includes('Project') || n.primaryLabel === 'Project'
    ).map(n => ({
      id: n.id,
      name: n.properties?.name || n.name || `Proyecto #${n.id}`
    }));
  }, [graphData]);

  // Auto-seleccionar el primer proyecto cuando se carga la data
  useEffect(() => {
    if (projects.length > 0 && selectedProjectId === null) {
      setSelectedProjectId(projects[0].id);
    }
    // Si el proyecto seleccionado ya no existe en la data, resetear
    if (selectedProjectId !== null && projects.length > 0 && !projects.find(p => p.id === selectedProjectId)) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  // Filtrar graphData según el proyecto seleccionado usando BFS
  const filteredGraphData = useMemo(() => {
    if (!selectedProjectId || !graphData.nodes || graphData.nodes.length === 0) {
      return graphData;
    }

    // Construir grafo de adyacencia bidireccional
    const adj = {};
    graphData.nodes.forEach(n => { adj[n.id] = []; });
    (graphData.relationships || []).forEach(rel => {
      if (adj[rel.source]) adj[rel.source].push(rel.target);
      if (adj[rel.target]) adj[rel.target].push(rel.source);
    });

    // BFS desde el proyecto seleccionado
    const reachable = new Set();
    const queue = [selectedProjectId];
    reachable.add(selectedProjectId);
    let head = 0;
    while (head < queue.length) {
      const curr = queue[head++];
      for (const nbr of (adj[curr] || [])) {
        if (!reachable.has(nbr)) {
          // No incluir nodos TTP ni ThreatActor en el filtro
          const node = graphData.nodes.find(n => n.id === nbr);
          if (node && !node.labels?.includes('TTP') && !node.labels?.includes('ThreatActor')) {
            // No cruzar a otros proyectos
            if (node.primaryLabel !== 'Project') {
              reachable.add(nbr);
              queue.push(nbr);
            }
          }
        }
      }
    }

    const filteredNodes = graphData.nodes.filter(n => reachable.has(n.id));
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredRels = (graphData.relationships || []).filter(
      rel => nodeIds.has(rel.source) && nodeIds.has(rel.target)
    );

    return { nodes: filteredNodes, relationships: filteredRels };
  }, [graphData, selectedProjectId]);

  // Contar nodos por tipo (sobre el grafo filtrado)
  const getNodeCountByType = useCallback((type) => {
    return filteredGraphData.nodes.filter(n => n.labels.includes(type)).length;
  }, [filteredGraphData]);

  return {
    showDashboard,
    setShowDashboard,
    clicks,
    setClicks,
    graphData: filteredGraphData,
    allGraphData: graphData,
    loading,
    error,
    selectedNode,
    setSelectedNode,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    toastMessage,
    showAPTPanel,
    setShowAPTPanel,
    aptData,
    aptLoading,
    aptError,
    fetchInfrastructure,
    handleReset,
    fetchTopAPTs,
    getNodeCountByType,
    projects,
    selectedProjectId,
    setSelectedProjectId,
    showToast
  };
}

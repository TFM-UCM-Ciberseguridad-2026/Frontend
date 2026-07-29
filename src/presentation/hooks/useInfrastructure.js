import { useState, useEffect, useMemo, useCallback } from 'react';
import { InfrastructureApiDataSource } from '../../data/datasources/InfrastructureApiDataSource';
import { InfrastructureRepositoryImpl } from '../../data/repositories/InfrastructureRepositoryImpl';
import { GetInfrastructureUseCase } from '../../domain/usecases/GetInfrastructureUseCase';
import { PopulateInfrastructureUseCase } from '../../domain/usecases/PopulateInfrastructureUseCase';
import { GetTopAptsUseCase } from '../../domain/usecases/GetTopAptsUseCase';
import { GetExploitationPathsUseCase } from '../../domain/usecases/GetExploitationPathsUseCase';
import { CreateProjectUseCase } from '../../domain/usecases/CreateProjectUseCase';
import { CreateEndpointUseCase } from '../../domain/usecases/CreateEndpointUseCase';
import { CreateHardwareUseCase } from '../../domain/usecases/CreateHardwareUseCase';
import { CreateSoftwareUseCase } from '../../domain/usecases/CreateSoftwareUseCase';
import { CreateNetworkUseCase } from '../../domain/usecases/CreateNetworkUseCase';
import { ScanInstallationVulnerabilitiesUseCase } from '../../domain/usecases/ScanInstallationVulnerabilitiesUseCase';
import { ComputeProjectRiskUseCase } from '../../domain/usecases/ComputeProjectRiskUseCase';
import { ComputeAllProjectRisksUseCase } from '../../domain/usecases/ComputeAllProjectRisksUseCase';

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

  // Estados de Exploitation Paths (Rutas de Ataque)
  const [showPathsModal, setShowPathsModal] = useState(false);
  const [exploitationPaths, setExploitationPaths] = useState([]);
  const [pathsLoading, setPathsLoading] = useState(false);
  const [pathsError, setPathsError] = useState(null);
  const [selectedExploitationPath, setSelectedExploitationPath] = useState(null);

  // Estados riesgo
  const [riskActionLoading, setRiskActionLoading] = useState(false);
  const [riskActionError, setRiskActionError] = useState(null);

  // Inyección de dependencias (Clean Architecture)
  const apiDataSource = useMemo(() => new InfrastructureApiDataSource(), []);
  const repository = useMemo(() => new InfrastructureRepositoryImpl(apiDataSource), [apiDataSource]);
  const getInfrastructureUseCase = useMemo(() => new GetInfrastructureUseCase(repository), [repository]);
  const populateInfrastructureUseCase = useMemo(() => new PopulateInfrastructureUseCase(repository), [repository]);
  const getTopAptsUseCase = useMemo(() => new GetTopAptsUseCase(repository), [repository]);
  const getExploitationPathsUseCase = useMemo(() => new GetExploitationPathsUseCase(repository), [repository]);

  const createProjectUseCase = useMemo(() => new CreateProjectUseCase(repository), [repository]);
  const createEndpointUseCase = useMemo(() => new CreateEndpointUseCase(repository), [repository]);
  const createHardwareUseCase = useMemo(() => new CreateHardwareUseCase(repository), [repository]);
  const createSoftwareUseCase = useMemo(() => new CreateSoftwareUseCase(repository), [repository]);
  const createNetworkUseCase = useMemo(() => new CreateNetworkUseCase(repository), [repository]);

  // Casos de uso para cálculo de riesgo
  const scanInstallationVulnerabilitiesUseCase = useMemo(() => new ScanInstallationVulnerabilitiesUseCase(repository), [repository]);
  const computeProjectRiskUseCase = useMemo(() => new ComputeProjectRiskUseCase(repository), [repository]);
  const computeAllProjectRisksUseCase = useMemo(() => new ComputeAllProjectRisksUseCase(repository), [repository]);


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

  const fetchExploitationPaths = async () => {
    setShowPathsModal(true);
    setPathsLoading(true);
    setPathsError(null);
    try {
      const data = await getExploitationPathsUseCase.execute();
      setExploitationPaths(data || []);
    } catch (err) {
      console.error(err);
      setPathsError(err.message);
    } finally {
      setPathsLoading(false);
    }
  };

  const selectExploitationPath = (path) => {
    setSelectedExploitationPath(path);
  };

  const clearSelectedExploitationPath = () => {
    setSelectedExploitationPath(null);
  };

  const createProject = async (data) => {
    const res = await createProjectUseCase.execute(data);
    showToast('¡Proyecto añadido correctamente!');
    await fetchInfrastructure(true);
    return res;
  };

  const createEndpoint = async (projectId, data) => {
    const res = await createEndpointUseCase.execute(projectId, data);
    showToast('¡Endpoint añadido correctamente!');
    await fetchInfrastructure(true);
    return res;
  };

  const createHardware = async (endpointId, data) => {
    const res = await createHardwareUseCase.execute(endpointId, data);
    showToast('¡Hardware añadido correctamente!');
    await fetchInfrastructure(true);
    return res;
  };

  const createSoftware = async (endpointId, data) => {
    const res = await createSoftwareUseCase.execute(endpointId, data);
    showToast('¡Software añadido correctamente!');
    await fetchInfrastructure(true);
    return res;
  };

  const createNetwork = async (endpointId, data) => {
    const res = await createNetworkUseCase.execute(endpointId, data);
    showToast('¡Red añadida correctamente!');
    await fetchInfrastructure(true);
    return res;
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
      id: String(n.properties?.id ?? n.id),
      name: n.properties?.name || n.properties?.nombre || n.name || `Proyecto #${n.properties?.id ?? n.id}`
    }));
  }, [graphData]);

  // Auto-seleccionar el primer proyecto cuando se carga la data
  useEffect(() => {
    if (projects.length > 0 && selectedProjectId === null) {
      setSelectedProjectId(projects[0].id);
    }
    if (selectedProjectId !== null && projects.length > 0 && !projects.find(p => p.id === selectedProjectId)) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);


  // Limpiar selección visual al cambiar de proyecto
  useEffect(() => {
    setSelectedNode(null);
    setSelectedExploitationPath(null);
  }, [selectedProjectId]);


  // Filtrar graphData según el proyecto seleccionado usando BFS
  const filteredGraphData = useMemo(() => {
    if (!selectedProjectId || !graphData.nodes || graphData.nodes.length === 0) {
      return graphData;
    }

    // Encontrar el elementId (n.id) del nodo Project cuyo properties.id coincide
    const projectNode = graphData.nodes.find(
      n => (n.labels?.includes('Project') || n.primaryLabel === 'Project') &&
          String(n.properties?.id ?? n.id) === selectedProjectId
    );
    if (!projectNode) {
      return graphData;
    }
    const startId = projectNode.id; // elementId de Neo4j

    const adj = {};
    graphData.nodes.forEach(n => { adj[n.id] = []; });
    (graphData.relationships || []).forEach(rel => {
      if (adj[rel.source]) adj[rel.source].push(rel.target);
      if (adj[rel.target]) adj[rel.target].push(rel.source);
    });

    const reachable = new Set();
    const queue = [startId];
    reachable.add(startId);
    let head = 0;
    while (head < queue.length) {
      const curr = queue[head++];
      for (const nbr of (adj[curr] || [])) {
        if (!reachable.has(nbr)) {
          const node = graphData.nodes.find(n => n.id === nbr);
          if (node && !node.labels?.includes('TTP') && !node.labels?.includes('ThreatActor')) {
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

  const getNodeCountByType = useCallback((type) => {
    return filteredGraphData.nodes.filter(n => n.labels.includes(type)).length;
  }, [filteredGraphData]);

 // Derivar lista de instalaciones de software para el proyecto seleccionado
  const getSelectedProjectSoftwareInstallations = useCallback(() => {
    const nodes = filteredGraphData.nodes || [];
    const relationships = filteredGraphData.relationships || [];

    const softwareByElementId = new Map(
      nodes
        .filter(n => n.primaryLabel === 'Software')
        .map(n => [n.id, n])
    );

    return nodes
      .filter(n => n.primaryLabel === 'SoftwareInstallation')
      .map(installationNode => {
        const rel = relationships.find(r =>
          r.type === 'INSTANCE_OF' &&
          (r.source === installationNode.id || r.target === installationNode.id)
        );

        if (!rel) {
          return null;
        }

        const softwareElementId = rel.source === installationNode.id ? rel.target : rel.source;
        const softwareNode = softwareByElementId.get(softwareElementId);

        if (!softwareNode) {
          return null;
        }

        return {
          installationId: installationNode.properties?.id || installationNode.properties?.installation_id,
          softwareId: softwareNode.properties?.id || softwareNode.properties?.software_id,
          installationName: installationNode.name,
          softwareName: softwareNode.name
        };
      })
      .filter(Boolean)
      .filter(item => item.installationId && item.softwareId);
  }, [filteredGraphData]);


  // Función para analizar vulnerabilidades de todas las instalaciones de software del proyecto seleccionado
  const analyzeProjectVulnerabilities = async () => {
    if (!selectedProjectId || riskActionLoading) return;

    setRiskActionLoading(true);
    setRiskActionError(null);

    try {
      const installations = getSelectedProjectSoftwareInstallations();
      if (installations.length === 0) {
        showToast('No hay software instalado en el proyecto seleccionado.');
        return;
      }

      for (const installation of installations) {
        await scanInstallationVulnerabilitiesUseCase.execute(
          installation.installationId,
          installation.softwareId,
          100
        );
      }

      showToast(`Vulnerabilidades analizadas para ${installations.length} instalación(es).`);
      await fetchInfrastructure(true);
    } catch (err) {
      console.error(err);
      setRiskActionError(err.message);
      showToast(`Error analizando vulnerabilidades: ${err.message}`);
    } finally {
      setRiskActionLoading(false);
    }
  };



  // Función para calcular el riesgo del proyecto seleccionado
  const computeSelectedProjectRisk = async () => {
    if (!selectedProjectId || riskActionLoading) return;

    setRiskActionLoading(true);
    setRiskActionError(null);

    try {
      await computeProjectRiskUseCase.execute(selectedProjectId);
      showToast('Riesgo calculado para el proyecto seleccionado.');
      await fetchInfrastructure(true);
    } catch (err) {
      console.error(err);
      setRiskActionError(err.message);
      showToast(`Error calculando riesgo: ${err.message}`);
    } finally {
      setRiskActionLoading(false);
    }
  };


  // Función para recalcular el riesgo de todos los proyectos
  const computeAllProjectRisks = async () => {
    setRiskActionLoading(true);
    setRiskActionError(null);

    try {
      await computeAllProjectRisksUseCase.execute();
      showToast('Riesgo recalculado para todos los proyectos.');
      await fetchInfrastructure(true);
    } catch (err) {
      console.error(err);
      setRiskActionError(err.message);
      showToast(`Error recalculando todos los proyectos: ${err.message}`);
    } finally {
      setRiskActionLoading(false);
    }
  };

  // Derivar el nodo del proyecto seleccionado para resaltar en el grafo
  const selectedProjectNode = useMemo(() => {
    return (graphData.nodes || []).find(n =>
      (n.labels?.includes('Project') || n.primaryLabel === 'Project') &&
      String(n.properties?.id ?? n.id) === selectedProjectId
    ) || null;
  }, [graphData, selectedProjectId]);

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
    showPathsModal,
    setShowPathsModal,
    exploitationPaths,
    pathsLoading,
    pathsError,
    selectedExploitationPath,
    selectExploitationPath,
    clearSelectedExploitationPath,
    fetchInfrastructure,
    handleReset,
    fetchTopAPTs,
    fetchExploitationPaths,
    getNodeCountByType,
    projects,
    selectedProjectId,
    setSelectedProjectId,
    showToast,
    createProject,
    createEndpoint,
    createHardware,
    createSoftware,
    createNetwork,
    riskActionLoading,
    riskActionError,
    analyzeProjectVulnerabilities,
    computeSelectedProjectRisk,
    computeAllProjectRisks,
    selectedProjectNode
  };

}

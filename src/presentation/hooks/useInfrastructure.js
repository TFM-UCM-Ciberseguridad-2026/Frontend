import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { InfrastructureApiDataSource } from '../../data/datasources/InfrastructureApiDataSource';
import { InfrastructureRepositoryImpl } from '../../data/repositories/InfrastructureRepositoryImpl';
import { GetInfrastructureUseCase } from '../../domain/usecases/GetInfrastructureUseCase';
import { PopulateInfrastructureUseCase } from '../../domain/usecases/PopulateInfrastructureUseCase';
import { GetTopAptsUseCase } from '../../domain/usecases/GetTopAptsUseCase';
import { GetTTPMatrixUseCase } from '../../domain/usecases/GetTTPMatrixUseCase';
import { GetExploitationPathsUseCase } from '../../domain/usecases/GetExploitationPathsUseCase';
import { CreateProjectUseCase } from '../../domain/usecases/CreateProjectUseCase';
import { CreateEndpointUseCase } from '../../domain/usecases/CreateEndpointUseCase';
import { CreateContainerUseCase } from '../../domain/usecases/CreateContainerUseCase';
import { CreateContainerSoftwareUseCase } from '../../domain/usecases/CreateContainerSoftwareUseCase';
import { CreateHardwareUseCase } from '../../domain/usecases/CreateHardwareUseCase';
import { CreateSoftwareUseCase } from '../../domain/usecases/CreateSoftwareUseCase';
import { CreateNetworkUseCase } from '../../domain/usecases/CreateNetworkUseCase';
import { ExportProjectUseCase } from '../../domain/usecases/ExportProjectUseCase';
import { ExportMitreNavigatorUseCase } from '../../domain/usecases/ExportMitreNavigatorUseCase';
import { ExportInventoryUseCase } from '../../domain/usecases/ExportInventoryUseCase';
import { ImportInfrastructureUseCase } from '../../domain/usecases/ImportInfrastructureUseCase';
import { ScanInstallationVulnerabilitiesUseCase } from '../../domain/usecases/ScanInstallationVulnerabilitiesUseCase';
import { GetFindingVulnerabilitiesUseCase } from '../../domain/usecases/GetFindingVulnerabilitiesUseCase';
import { ComputeProjectRiskUseCase } from '../../domain/usecases/ComputeProjectRiskUseCase';
import { ComputeAllProjectRisksUseCase } from '../../domain/usecases/ComputeAllProjectRisksUseCase';
import { ScanContainerImageVulnerabilitiesUseCase } from '../../domain/usecases/ScanContainerImageVulnerabilitiesUseCase';
import { RenameProjectUseCase } from '../../domain/usecases/RenameProjectUseCase';
import { DeleteProjectUseCase } from '../../domain/usecases/DeleteProjectUseCase';
import { UpdateNodeUseCase } from '../../domain/usecases/UpdateNodeUseCase';
import { DeleteNodeUseCase } from '../../domain/usecases/DeleteNodeUseCase';
import { useToast } from '../context/ToastContext';
import { GetPatchQueueUseCase } from '../../domain/usecases/GetPatchQueueUseCase';
import { RefreshPatchesForVulnerabilityUseCase } from '../../domain/usecases/RefreshPatchesForVulnerabilityUseCase';
import { DeclarePatchAppliedUseCase } from '../../domain/usecases/DeclarePatchAppliedUseCase';
import { GetPatchesForVulnerabilityUseCase } from '../../domain/usecases/GetPatchesForVulnerabilityUseCase';
import { GetPatchesForProjectUseCase } from '../../domain/usecases/GetPatchesForProjectUseCase';
import { ExportWeeklyReportUseCase } from '../../domain/usecases/ExportWeeklyReportUseCase';
import { ExportMonthlyReportUseCase } from '../../domain/usecases/ExportMonthlyReportUseCase';
import { GetAppliedPatchHistoryUseCase } from '../../domain/usecases/GetAppliedPatchHistoryUseCase';

const isSoftwareInstallationNode = node =>
  node?.primaryLabel === 'SoftwareInstallation' ||
  node?.labels?.includes('SoftwareInstallation');

const isSoftwareNode = node =>
  node?.primaryLabel === 'Software' ||
  node?.labels?.includes('Software');

const VULN_SCAN_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function shouldForceVulnRefresh(installationNode) {
  const completedAt = installationNode?.properties?.vuln_scan_completed_at;
  if (!completedAt) return true;

  const completedAtMs = new Date(completedAt).getTime();
  if (!Number.isFinite(completedAtMs)) return true;

  return Date.now() - completedAtMs >= VULN_SCAN_CACHE_TTL_MS;
}

export function useInfrastructure() {
  const toast = useToast();
  const [showDashboard, setShowDashboard] = useState(false);
  const [clicks, setClicks] = useState(0);

  // Estados de infraestructura
  const [graphData, setGraphData] = useState({ nodes: [], relationships: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [graphAdvancedFilters, setGraphAdvancedFilters] = useState({
    ipSearch: '',
    vendorSearch: '',
    environment: 'ALL',
    internetExposed: 'ALL',
    status: 'ALL',
    riskTier: 'ALL',
    includeAncestors: false,
    onlyVulnerable: false,
    inExploitationPath: false
  });
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [projects, setProjects] = useState([]);

  const updateGraphAdvancedFilter = (key, value) => {
    setGraphAdvancedFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearGraphAdvancedFilters = () => {
    setGraphAdvancedFilters({
      ipSearch: '',
      vendorSearch: '',
      environment: 'ALL',
      internetExposed: 'ALL',
      status: 'ALL',
      riskTier: 'ALL',
      includeAncestors: false,
      onlyVulnerable: false,
      inExploitationPath: false
    });
    setSearchQuery('');
    setFilterType('ALL');
  };

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

  // Estados independientes para el escaneo y el cálculo de riesgo
  const [vulnScanLoading, setVulnScanLoading] = useState(false);
  const [riskComputeLoading, setRiskComputeLoading] = useState(false);
  const [riskActionError, setRiskActionError] = useState(null);

  // Estado de enriquecimiento NVD en background (para polling)
  const [isAnalysisPending, setIsAnalysisPending] = useState(false);
  const pendingPollRef = useRef(null);

  // Estados del modal de CVEs por Finding
  const [showFindingVulnsModal, setShowFindingVulnsModal] = useState(false);
  const [findingVulnsData, setFindingVulnsData] = useState([]);
  const [findingVulnsLoading, setFindingVulnsLoading] = useState(false);
  const [findingVulnsError, setFindingVulnsError] = useState(null);
  const [findingVulnsSourceNode, setFindingVulnsSourceNode] = useState(null);

  // Estados para la cola de parches
  const [patchQueue, setPatchQueue] = useState([]);
  const [patchQueueCount, setPatchQueueCount] = useState(0);
  const [patchQueuePage, setPatchQueuePage] = useState(1);
  const [patchQueueLimit, setPatchQueueLimit] = useState(20);
  const [patchQueueTotal, setPatchQueueTotal] = useState(0);
  const [patchQueueTotalPages, setPatchQueueTotalPages] = useState(1);
  const [patchQueueLoading, setPatchQueueLoading] = useState(false);
  const [patchQueueError, setPatchQueueError] = useState(null);
  const [patchApplyingKey, setPatchApplyingKey] = useState(null);
  const [patchApplyError, setPatchApplyError] = useState(null);
  const [patchesByCVE, setPatchesByCVE] = useState({});
  // Parches de todo el proyecto, indexados por CVE. Los usa la ficha de una técnica
  // ATT&CK, que los necesita para muchas CVE a la vez.
  const [projectPatchesByCVE, setProjectPatchesByCVE] = useState(new Map());
  const [projectPatchesLoading, setProjectPatchesLoading] = useState(false);
  const [patchDetailsLoading, setPatchDetailsLoading] = useState(false);
  const [patchDetailsError, setPatchDetailsError] = useState(null);
  const [patchProjectRefreshLoading, setPatchProjectRefreshLoading] = useState(false);
  const [patchProjectRefreshError, setPatchProjectRefreshError] = useState(null);
  const [patchProjectRefreshProgress, setPatchProjectRefreshProgress] = useState(null);
  const [appliedPatchHistory, setAppliedPatchHistory] = useState([]);
  const [appliedPatchHistoryLoading, setAppliedPatchHistoryLoading] = useState(false);
  const [appliedPatchHistoryError, setAppliedPatchHistoryError] = useState(null);
  const [appliedPatchHistoryInstallationId, setAppliedPatchHistoryInstallationId] = useState(null);

  // Inyección de dependencias (Clean Architecture)
  const apiDataSource = useMemo(() => new InfrastructureApiDataSource(), []);
  const repository = useMemo(() => new InfrastructureRepositoryImpl(apiDataSource), [apiDataSource]);
  const getInfrastructureUseCase = useMemo(() => new GetInfrastructureUseCase(repository), [repository]);
  const populateInfrastructureUseCase = useMemo(() => new PopulateInfrastructureUseCase(repository), [repository]);
  const getTopAptsUseCase = useMemo(() => new GetTopAptsUseCase(repository), [repository]);
  const getTTPMatrixUseCase = useMemo(() => new GetTTPMatrixUseCase(repository), [repository]);
  const getExploitationPathsUseCase = useMemo(() => new GetExploitationPathsUseCase(repository), [repository]);

  const createProjectUseCase = useMemo(() => new CreateProjectUseCase(repository), [repository]);
  const renameProjectUseCase = useMemo(() => new RenameProjectUseCase(repository), [repository]);
  const deleteProjectUseCase = useMemo(() => new DeleteProjectUseCase(repository), [repository]);
  const createEndpointUseCase = useMemo(() => new CreateEndpointUseCase(repository), [repository]);
  const createContainerUseCase = useMemo(() => new CreateContainerUseCase(repository), [repository]);
  const createContainerSoftwareUseCase = useMemo(() => new CreateContainerSoftwareUseCase(repository), [repository]);
  const createHardwareUseCase = useMemo(() => new CreateHardwareUseCase(repository), [repository]);
  const createSoftwareUseCase = useMemo(() => new CreateSoftwareUseCase(repository), [repository]);
  const createNetworkUseCase = useMemo(() => new CreateNetworkUseCase(repository), [repository]);
  const updateNodeUseCase = useMemo(() => new UpdateNodeUseCase(repository), [repository]);
  const deleteNodeUseCase = useMemo(() => new DeleteNodeUseCase(repository), [repository]);

  const exportProjectUseCase = useMemo(() => new ExportProjectUseCase(repository), [repository]);
  const exportMitreNavigatorUseCase = useMemo(() => new ExportMitreNavigatorUseCase(repository), [repository]);
  const exportInventoryUseCase = useMemo(() => new ExportInventoryUseCase(repository), [repository]);
  const exportWeeklyReportUseCase = useMemo(() => new ExportWeeklyReportUseCase(repository), [repository]);
  const exportMonthlyReportUseCase = useMemo(() => new ExportMonthlyReportUseCase(repository), [repository]);
  const importInfrastructureUseCase = useMemo(() => new ImportInfrastructureUseCase(repository), [repository]);

  const scanInstallationVulnerabilitiesUseCase = useMemo(() => new ScanInstallationVulnerabilitiesUseCase(repository), [repository]);
  const scanContainerImageVulnerabilitiesUseCase = useMemo(() => new ScanContainerImageVulnerabilitiesUseCase(repository), [repository]);
  const getFindingVulnerabilitiesUseCase = useMemo(() => new GetFindingVulnerabilitiesUseCase(repository), [repository]);
  const computeProjectRiskUseCase = useMemo(() => new ComputeProjectRiskUseCase(repository), [repository]);
  const computeAllProjectRisksUseCase = useMemo(() => new ComputeAllProjectRisksUseCase(repository), [repository]);

  const getPatchQueueUseCase = useMemo(() => new GetPatchQueueUseCase(repository), [repository]);
  const refreshPatchesForVulnerabilityUseCase = useMemo(() => new RefreshPatchesForVulnerabilityUseCase(repository), [repository]);
  const declarePatchAppliedUseCase = useMemo(() => new DeclarePatchAppliedUseCase(repository), [repository]);
  const getPatchesForVulnerabilityUseCase = useMemo(() => new GetPatchesForVulnerabilityUseCase(repository), [repository]);
  const getPatchesForProjectUseCase = useMemo(() => new GetPatchesForProjectUseCase(repository), [repository]);
  const getAppliedPatchHistoryUseCase = useMemo(() => new GetAppliedPatchHistoryUseCase(repository), [repository]);

  // Memoizado sobre la función estable del contexto (no sobre el objeto `toast`,
  // que se recrea en cada render). showToast viaja como prop a páginas que lo
  // usan en dependencias de efectos, y una identidad nueva por render provocaba
  // recargas completas de datos pesados (matriz TTP) en cada repintado del padre.
  const showToastFn = toast.showToast;
  const showToast = useCallback((msg, type = 'info', title = null) => {
    showToastFn(msg, type, title);
  }, [showToastFn]);

  const fetchProjects = useCallback(async () => {
    try {
      const data = await getInfrastructureUseCase.execute(null);
      if (data && data.nodes) {
        const foundProjects = data.nodes
          .filter(n => n.labels?.includes('Project') || n.primaryLabel === 'Project')
          .map(n => ({
            id: String(n.properties?.id ?? n.id),
            name: n.properties?.name || n.name || `Proyecto #${n.properties?.id ?? n.id}`
          }));
        setProjects(foundProjects);
        return foundProjects;
      }
    } catch (err) {
      console.error('Error fetching projects list:', err);
    }
    return [];
  }, [getInfrastructureUseCase]);

  const fetchInfrastructure = async (quiet = false, projectIdOverride = undefined) => {
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const targetProjId = projectIdOverride !== undefined ? projectIdOverride : selectedProjectId;
      const data = await getInfrastructureUseCase.execute(targetProjId);
      setGraphData(data);
    } catch (err) {
      console.error(err);
      // No damos por hecho la causa: un 504 es un timeout, no una caída de Neo4j.
      const errorMsg = `No se pudo cargar el grafo de infraestructura. ${err.message}`;
      setError(errorMsg);
      toast.error(err.message, 'Error de Conexión');
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  /**
   * Inicia un polling de 5 s hacia /api/infrastructure/analysis-pending.
   * Cuando el enriquecimiento NVD termina (pending → false) recarga el grafo
   * y muestra una notificación al usuario.
   */
  const startPendingPolling = useCallback((projectId) => {
    if (pendingPollRef.current) {
      clearInterval(pendingPollRef.current);
      pendingPollRef.current = null;
    }
    setIsAnalysisPending(true);

    pendingPollRef.current = setInterval(async () => {
      try {
        const url = projectId
          ? `/api/infrastructure/analysis-pending?project_id=${projectId}`
          : '/api/infrastructure/analysis-pending';
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        if (!data.pending) {
          clearInterval(pendingPollRef.current);
          pendingPollRef.current = null;
          setIsAnalysisPending(false);
          await fetchInfrastructure(true);
          toast.success(
            'El enriquecimiento NVD ha finalizado. El grafo y el panel derecho se han actualizado con la información completa de las CVEs.',
            'Análisis Completado'
          );
        }
      } catch (e) {
        console.warn('[Polling] Error comprobando estado del análisis:', e);
      }
    }, 5000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (pendingPollRef.current) {
        clearInterval(pendingPollRef.current);
      }
    };
  }, []);

  const handleReset = async () => {
    setLoading(true);
    setError(null);
    try {
      await populateInfrastructureUseCase.execute();
      toast.success('¡Grafo restablecido con datos de prueba!', 'Restablecimiento Exitoso');
      await fetchInfrastructure(true);
    } catch (err) {
      console.error(err);
      setError(`Error al poblar la base de datos: ${err.message}`);
      toast.error(err.message, 'Error al poblar base de datos');
    } finally {
      setLoading(false);
    }
  };

  // Memoizado: TtpsPage lo usa como dependencia del efecto que carga la matriz.
  const fetchTTPMatrix = useCallback(async (projectId) => {
    return await getTTPMatrixUseCase.execute(projectId);
  }, [getTTPMatrixUseCase]);

  const fetchTopAPTs = async () => {
    setShowAPTPanel(true);
    setAptLoading(true);
    setAptError(null);
    try {
      const data = await getTopAptsUseCase.execute(selectedProjectId);
      setAptData(data || []);
    } catch (err) {
      console.error(err);
      setAptError(err.message);
      toast.error(err.message, 'Error al cargar APTs');
    } finally {
      setAptLoading(false);
    }
  };

  const fetchExploitationPaths = async () => {
    setShowPathsModal(true);
    setPathsLoading(true);
    setPathsError(null);
    try {
      const data = await getExploitationPathsUseCase.execute(selectedProjectId);
      setExploitationPaths(data.paths || []);
      if (data.warning) {
        toast.warning(data.warning, 'Análisis en Segundo Plano');
      }
    } catch (err) {
      console.error(err);
      setPathsError(err.message);
      toast.error(err.message, 'Error al cargar rutas de explotación');
    } finally {
      setPathsLoading(false);
    }
  };

  const selectExploitationPath = (path) => {
    setSelectedExploitationPath(path);

    if (path && path.steps && path.steps.length > 0) {
      const lastStep = path.steps[path.steps.length - 1];
      const targetFindingId = lastStep?.finding_id;

      if (targetFindingId && filteredGraphData?.nodes) {
        const targetGroupNode = filteredGraphData.nodes.find(n =>
          String(n.id) === String(targetFindingId) ||
          (Array.isArray(n.properties?.findings) && n.properties.findings.some(f =>
            String(f.id) === String(targetFindingId) ||
            String(f.properties?.id) === String(targetFindingId)
          ))
        );

        if (targetGroupNode) {
          setSelectedNode(targetGroupNode);
        }
      }
    }
  };

  const clearSelectedExploitationPath = () => {
    setSelectedExploitationPath(null);
  };

  const renameProject = async (projectId, newName, justification) => {
    try {
      const res = await renameProjectUseCase.execute(projectId, newName, justification);
      showToast('¡Proyecto renombrado con éxito!');
      await fetchProjects();
      await fetchInfrastructure(true);
      return res;
    } catch (err) {
      toast.error(err.message, 'Error al renombrar el Proyecto');
      throw err;
    }
  };

  const deleteProject = async (projectId, justification) => {
    try {
      await deleteProjectUseCase.execute(projectId, justification);
      showToast('¡Proyecto eliminado con éxito!');
      const updatedProjects = await fetchProjects();
      await fetchInfrastructure(true);
      if (String(projectId) === String(selectedProjectId)) {
        if (updatedProjects.length > 0) {
          setSelectedProjectId(updatedProjects[0].id);
        } else {
          setSelectedProjectId(null);
          setShowDashboard(false);
        }
      }
    } catch (err) {
      toast.error(err.message, 'Error al eliminar el Proyecto');
      throw err;
    }
  };

  const createProject = async (data) => {
    try {
      const res = await createProjectUseCase.execute(data);
      toast.success('¡Proyecto añadido correctamente!', 'Nuevo Proyecto');
      await fetchProjects();
      await fetchInfrastructure(true);
      return res;
    } catch (err) {
      toast.error(err.message, 'Error creando Proyecto');
      throw err;
    }
  };

  const createEndpoint = async (projectId, data) => {
    try {
      const res = await createEndpointUseCase.execute(projectId, data);
      toast.success('¡Endpoint añadido correctamente!', 'Nuevo Endpoint');
      await fetchInfrastructure(true);
      return res;
    } catch (err) {
      toast.error(err.message, 'Error creando Endpoint');
      throw err;
    }
  };

  const createHardware = async (endpointId, data) => {
    try {
      const res = await createHardwareUseCase.execute(endpointId, data);
      toast.success('¡Hardware añadido correctamente!', 'Nuevo Hardware');
      await fetchInfrastructure(true);
      return res;
    } catch (err) {
      toast.error(err.message, 'Error creando Hardware');
      throw err;
    }
  };

  const createSoftware = async (endpointId, data) => {
    try {
      const res = await createSoftwareUseCase.execute(endpointId, data);
      toast.success('¡Software añadido correctamente!', 'Nuevo Software');
      await fetchInfrastructure(true);
      return res;
    } catch (err) {
      toast.error(err.message, 'Error creando Software');
      throw err;
    }
  };

  const createContainer = async (endpointId, data) => {
    try {
      const res = await createContainerUseCase.execute(endpointId, data);
      toast.success('¡Contenedor añadido correctamente!', 'Nuevo Contenedor');
      await fetchInfrastructure(true);
      return res;
    } catch (err) {
      toast.error(err.message, 'Error creando Contenedor');
      throw err;
    }
  };

  const createContainerSoftware = async (containerId, data) => {
    try {
      const res = await createContainerSoftwareUseCase.execute(containerId, data);
      toast.success('¡Software de contenedor añadido correctamente!', 'Nuevo Software (Contenedor)');
      await fetchInfrastructure(true);
      return res;
    } catch (err) {
      toast.error(err.message, 'Error creando Software de Contenedor');
      throw err;
    }
  };

  const createNetwork = async (data) => {
    try {
      const res = await createNetworkUseCase.execute(data, selectedProjectId);
      toast.success('¡Red añadida correctamente!', 'Nueva Red');
      await fetchInfrastructure(true);
      return res;
    } catch (err) {
      toast.error(err.message, 'Error creando Red');
      throw err;
    }
  };

  const fetchFindingVulnerabilities = async (findingNode) => {
    setShowFindingVulnsModal(true);
    setFindingVulnsLoading(true);
    setFindingVulnsError(null);
    setFindingVulnsSourceNode(findingNode);
    try {
      const findingId = findingNode.properties?.id ?? findingNode.id;
      const data = await getFindingVulnerabilitiesUseCase.execute(findingId);
      setFindingVulnsData(data || []);
    } catch (err) {
      console.error(err);
      setFindingVulnsError(err.message);
      toast.error(err.message, 'Error al cargar CVEs');
    } finally {
      setFindingVulnsLoading(false);
    }
  };

  const closeFindingVulnsModal = () => {
    setShowFindingVulnsModal(false);
  };

  // El proyecto sale del estado del hook, no de un parámetro: declararlo como argumento
  // tapaba el selectedProjectId del closure y, como el único llamante pasa tres argumentos,
  // toda edición de red viajaba con project_id 0 y la red se quedaba huérfana del proyecto.
  const updateNode = async (category, id, data) => {
    try {
      const res = await updateNodeUseCase.execute(category, id, data, selectedProjectId);
      toast.success('¡Activo actualizado y auditado!', 'Edición Guardada');
      await fetchInfrastructure(true);
      return res;
    } catch (err) {
      toast.error(err.message, 'Error actualizando Activo');
      throw err;
    }
  };

  const deleteNode = async (category, id, justification = '') => {
    try {
      const res = await deleteNodeUseCase.execute(category, id, justification);
      toast.success('¡El activo fue eliminado del grafo y auditado!', 'Activo Eliminado');
      if (selectedNode) {
        setSelectedNode(null);
      }
      await fetchInfrastructure(true);
      return res;
    } catch (err) {
      toast.error(err.message, 'Error eliminando Activo');
      throw err;
    }
  };

  const fetchPatchQueue = async (page = 1, limit = 20) => {
    setPatchQueueLoading(true);
    setPatchQueueError(null);
    try {
      const data = await getPatchQueueUseCase.execute(selectedProjectId, page, limit);
      setPatchQueue(data.queue);
      setPatchQueueTotal(data.total);
      setPatchQueueCount(data.total);
      setPatchQueuePage(data.page);
      setPatchQueueLimit(data.limit);
      setPatchQueueTotalPages(data.totalPages);
      return data;
    } catch (err) {
      setPatchQueueError(err.message);
      toast.error(err.message, 'Error cargando Patch Queue');
      throw err;
    } finally {
      setPatchQueueLoading(false);
    }
  };

  const refreshPatchesForCVE = async (cveId) => {
    try {
      await refreshPatchesForVulnerabilityUseCase.execute(cveId);
      setPatchesByCVE(prev => {
        const next = { ...prev };
        delete next[cveId];
        return next;
      });
      toast.success(`Parches actualizados para ${cveId}`, 'Patches actualizados');
      await fetchPatchQueue();
      await fetchInfrastructure(true);
    } catch (err) {
      toast.error(err.message, 'Error refrescando patches');
      throw err;
    }
  };

  const fetchPatchesForCVE = async (cveId, force = false) => {
    if (!cveId) return [];
    if (!force && patchesByCVE[cveId]) {
      return patchesByCVE[cveId];
    }

    setPatchDetailsLoading(true);
    setPatchDetailsError(null);

    try {
      const data = await getPatchesForVulnerabilityUseCase.execute(cveId);
      const patches = data?.patches || [];
      setPatchesByCVE(prev => ({
        ...prev,
        [cveId]: patches
      }));
      return patches;
    } catch (err) {
      setPatchDetailsError(err.message);
      toast.error(err.message, 'Error cargando patches');
      throw err;
    } finally {
      setPatchDetailsLoading(false);
    }
  };

  const declarePatchApplied = async (installationId, payload, applyingKey = null) => {
    setPatchApplyingKey(applyingKey);
    setPatchApplyError(null);

    try {
      const result = await declarePatchAppliedUseCase.execute(installationId, payload);
      toast.success('Parche declarado como aplicado', 'Patch aplicado');
      await fetchPatchQueue();
      await fetchInfrastructure(true);
      clearSelectedExploitationPath();
      setExploitationPaths([]);
      return result;
    } catch (err) {
      setPatchApplyError(err.message);
      toast.error(err.message, 'Error aplicando patch');
      throw err;
    } finally {
      setPatchApplyingKey(null);
    }
  };

  // Se pide una vez por proyecto y queda cacheado: la ficha de una técnica lo consulta
  // para cada una de sus CVE, y volver a la red en cada apertura sería absurdo.
  //
  // useCallback no es cosmético aquí: la pestaña de TTPs la invoca desde un efecto que la
  // lleva en su lista de dependencias, y una función nueva en cada render encadenaría una
  // petición por render.
  const fetchProjectPatches = useCallback(async (projectId) => {
    if (!projectId) {
      setProjectPatchesByCVE(new Map());
      return new Map();
    }
    setProjectPatchesLoading(true);
    try {
      const mapa = await getPatchesForProjectUseCase.execute(projectId);
      setProjectPatchesByCVE(mapa);
      return mapa;
    } catch (err) {
      // Un fallo aquí deja la ficha sin parches, pero no debe tumbar la pestaña de TTPs.
      console.warn('[parches del proyecto] no se pudieron cargar:', err);
      setProjectPatchesByCVE(new Map());
      return new Map();
    } finally {
      setProjectPatchesLoading(false);
    }
  }, [getPatchesForProjectUseCase]);

  const focusPatchQueueItem = (item) => {
    const findingNode = (graphData?.nodes || []).find(n =>
      (n.primaryLabel === 'Finding' || n.labels?.includes('Finding')) &&
      Number(n.properties?.id) === Number(item.finding_id)
    );

    if (findingNode) {
      setSelectedNode(findingNode);
      return findingNode;
    }

    const vulnNode = (graphData?.nodes || []).find(n =>
      (n.primaryLabel === 'Vulnerability' || n.labels?.includes('Vulnerability')) &&
      n.properties?.cve_id === item.cve_id
    );

    if (vulnNode) {
      setSelectedNode(vulnNode);
      return vulnNode;
    }

    toast.warning(`No se encontró ${item.cve_id} en el grafo visible`, 'Nodo no encontrado');
    return null;
  };

  const fetchAppliedPatchHistory = async (assetId, assetType = 'SOFTWARE_INSTALLATION') => {
    if (!assetId) {
      setAppliedPatchHistory([]);
      setAppliedPatchHistoryInstallationId(null);
      return [];
    }

    setAppliedPatchHistoryLoading(true);
    setAppliedPatchHistoryError(null);
      setAppliedPatchHistoryInstallationId(assetId);

    try {
      const history = await getAppliedPatchHistoryUseCase.execute(assetId, assetType);
      setAppliedPatchHistory(history);
      return history;
    } catch (err) {
      setAppliedPatchHistoryError(err.message);
      setAppliedPatchHistory([]);
      throw err;
    } finally {
      setAppliedPatchHistoryLoading(false);
    }
  };

  const fetchEndpointPatchHistory = async (endpointId) => {
    if (!endpointId) return null;
    try {
      return await repository.getEndpointPatchHistory(endpointId);
    } catch (err) {
      console.error('Error cargando histórico de parches del endpoint:', err);
      return null;
    }
  };

  const _triggerDownload = (filename, jsonText) => {
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportProject = async (targetProjectId) => {
    try {
      showToast('Generando JSON en el servidor...', 'info');
      const projId = targetProjectId || selectedProjectId;
      const projectNode = graphData?.nodes?.find(
        n => (n.labels?.includes('Project') || n.primaryLabel === 'Project') &&
            String(n.properties?.id ?? n.id) === String(projId)
      );
      const projectName = projectNode?.properties?.name || 'Proyecto';

      const { filename, content } = await exportProjectUseCase.execute(projId, projectName);
      _triggerDownload(filename, content);
      showToast('¡Proyecto exportado a JSON con éxito!');
    } catch (err) {
      console.error(err);
      showToast(`Error al exportar proyecto: ${err.message}`);
    }
  };

  const exportMitreNavigator = async (targetProjectId) => {
    try {
      // La capa se genera desde la matriz TTP del backend (fuente autorizada),
      // no desde el grafo filtrado en pantalla: el resultado no puede depender
      // del filtro visual activo ni contener técnicas de demostración.
      const projId = targetProjectId || selectedProjectId;
      const projectNode = graphData?.nodes?.find(
        n => (n.labels?.includes('Project') || n.primaryLabel === 'Project') &&
            String(n.properties?.id ?? n.id) === String(projId)
      );
      const projectName = projectNode?.properties?.name || 'Proyecto';

      const { filename, content } = await exportMitreNavigatorUseCase.execute(projId, projectName);
      _triggerDownload(filename, content);
      showToast('¡Capa de MITRE ATT&CK Navigator exportada!');
    } catch (err) {
      console.error(err);
      showToast(`Error al exportar capa MITRE: ${err.message}`, 'error');
    }
  };

  const exportInventory = async (targetProjectId) => {
    try {
      showToast('Generando Excel de inventario...', 'info');
      const projId = targetProjectId || selectedProjectId;
      const projectNode = graphData?.nodes?.find(
        n => (n.labels?.includes('Project') || n.primaryLabel === 'Project') &&
            String(n.properties?.id ?? n.id) === String(projId)
      );
      const projectName = projectNode?.properties?.name || 'Proyecto';

      const { filename, blob } = await exportInventoryUseCase.execute(projId, projectName);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('¡Inventario Excel exportado con éxito!');
    } catch (err) {
      console.error(err);
      showToast(`Error al exportar inventario: ${err.message}`, 'error');
    }
  };

  /** Resuelve el nombre del proyecto desde el grafo ya cargado, sin ir al backend. */
  const nombreDeProyecto = (projId) => {
    const nodo = graphData?.nodes?.find(
      n => (n.labels?.includes('Project') || n.primaryLabel === 'Project') &&
           String(n.properties?.id ?? n.id) === String(projId)
    );
    return nodo?.properties?.name || 'Proyecto';
  };

  // Informe SEMANAL: operativo, para el equipo. Qué hay que cerrar esta semana.
  const exportWeeklyReport = async (targetProjectId) => {
    try {
      showToast('Generando informe semanal en PPTX...', 'info');
      const projId = targetProjectId || selectedProjectId;
      await exportWeeklyReportUseCase.execute(projId, nombreDeProyecto(projId));
      showToast('¡Informe semanal exportado con éxito!');
    } catch (err) {
      console.error(err);
      showToast(`Error al generar el informe semanal: ${err.message}`, 'error');
    }
  };

  // Informe MENSUAL: de gobierno, para el Comité. Marco, política y trazabilidad.
  const exportMonthlyReport = async (targetProjectId) => {
    try {
      showToast('Generando informe mensual en PPTX...', 'info');
      const projId = targetProjectId || selectedProjectId;
      await exportMonthlyReportUseCase.execute(projId, nombreDeProyecto(projId));
      showToast('¡Informe mensual exportado con éxito!');
    } catch (err) {
      console.error(err);
      showToast(`Error al generar el informe mensual: ${err.message}`, 'error');
    }
  };

  const importProject = async (fileData, options = {}) => {
    try {
      let dataToImport = typeof fileData === 'string' ? JSON.parse(fileData) : JSON.parse(JSON.stringify(fileData));

      if (options.overwrite && options.targetProjectId) {
        try {
          await repository.deleteProject(options.targetProjectId, 'Sobrescritura por importación');
        } catch (delErr) {
          console.warn('Aviso limpiando proyecto anterior:', delErr);
        }
      }

      if (options.renameTo) {
        const newProjId = Date.now();
        if (dataToImport.project) {
          dataToImport.project.name = options.renameTo;
          dataToImport.project.id = newProjId;
        }

        const nodes = dataToImport.nodes || dataToImport.graphData?.nodes || [];
        const rels = dataToImport.relationships || dataToImport.graphData?.relationships || [];

        const idMapping = {};
        // Referencias antiguas que corresponden a más de un nodo (un id de propiedad
        // compartido por nodos de tipos distintos). No se pueden remapear sin arriesgarse
        // a enganchar relaciones al nodo equivocado.
        const ambiguousRefs = new Set();
        const mapRef = (oldRef, newId) => {
          if (idMapping[oldRef] !== undefined && idMapping[oldRef] !== newId) {
            ambiguousRefs.add(oldRef);
          } else {
            idMapping[oldRef] = newId;
          }
        };
        // Catálogos compartidos entre proyectos: conservan su identidad al copiar. CAPEC y CWE
        // se identifican por capec_id/cwe_id; darles un id nuevo no aportaba nada y era una
        // fuente más de colisiones.
        const globalLabels = ['Vulnerability', 'ThreatActor', 'TTP', 'Mitigation', 'Software', 'ContainerImage', 'CAPEC', 'CWE'];

        // Ids nuevos consecutivos a partir de una base común: con Date.now() + idx + un
        // aleatorio, dos nodos podían recibir el mismo id y la importación los fusionaba.
        const baseId = newProjId + 1;
        let nextOffset = 0;

        nodes.forEach((n) => {
          const isGlobal = n.labels?.some(l => globalLabels.includes(l));

          if (!isGlobal) {
            const newId = n.labels?.includes('Project') ? String(newProjId) : String(baseId + nextOffset++);
            const oldNodeId = String(n.id);
            mapRef(oldNodeId, newId);

            if (n.properties?.id !== undefined && n.properties?.id !== null) {
              const oldPropId = String(n.properties.id);
              mapRef(oldPropId, newId);
              if (typeof n.properties.id === 'number') {
                n.properties.id = parseInt(newId, 10);
              } else {
                n.properties.id = newId;
              }
            }

            n.id = newId;

            if (n.labels?.includes('Project')) {
              if (n.properties) {
                delete n.properties.nombre; // los ficheros antiguos lo traen; el esquema usa `name`
                n.properties.name = options.renameTo;
              }
            }
          }
        });

        // Un finding se identifica por finding_key (activo|CVE). Si la copia conservara la
        // clave del activo original, la importación la fusionaría con el finding del
        // proyecto de origen. Se reescribe el activo con su id nuevo; si no se puede
        // remapear, se quita la clave para que la copia no pise al original.
        nodes.forEach((n) => {
          if (!n.labels?.includes('Finding') || !n.properties) return;
          const p = n.properties;

          if (p.container_id !== undefined && p.container_id !== null) {
            const oldContainer = String(p.container_id);
            if (idMapping[oldContainer] && !ambiguousRefs.has(oldContainer)) {
              p.container_id = idMapping[oldContainer];
            }
          }

          if (typeof p.finding_key === 'string' && p.finding_key.includes('|')) {
            const parts = p.finding_key.split('|');
            const oldOwner = parts[0];
            if (idMapping[oldOwner] && !ambiguousRefs.has(oldOwner)) {
              parts[0] = idMapping[oldOwner];
              p.finding_key = parts.join('|');
            } else {
              delete p.finding_key;
            }
          }
        });

        const remappedRels = [];
        rels.forEach(rel => {
          const sStr = String(rel.source);
          const tStr = String(rel.target);
          if (ambiguousRefs.has(sStr) || ambiguousRefs.has(tStr)) {
            console.warn('Relación omitida en la importación por referencia ambigua:', rel);
            return;
          }
          if (idMapping[sStr]) {
            rel.source = idMapping[sStr];
          }
          if (idMapping[tStr]) {
            rel.target = idMapping[tStr];
          }
          remappedRels.push(rel);
        });
        rels.length = 0;
        rels.push(...remappedRels);
      }

      await importInfrastructureUseCase.execute(dataToImport);
      showToast('¡Infraestructura cargada e importada con éxito!');
      await fetchInfrastructure(true);

      try {
        const impProjectId = dataToImport?.project?.id || dataToImport?.nodes?.find(n => n.labels?.includes('Project') || n.primaryLabel === 'Project')?.properties?.id;
        if (impProjectId !== undefined && impProjectId !== null) {
          setSelectedProjectId(String(impProjectId));
        }
      } catch (e) {}
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  useEffect(() => {
    const initProjects = async () => {
      const projs = await fetchProjects();
      if (projs.length > 0 && selectedProjectId === null) {
        setSelectedProjectId(projs[0].id);
      }
    };
    initProjects();
  }, [fetchProjects, showDashboard]);

  useEffect(() => {
    if (graphData.nodes && graphData.nodes.length > 0) {
      const foundProjects = graphData.nodes
        .filter(n => n.labels?.includes('Project') || n.primaryLabel === 'Project')
        .map(n => ({
          id: String(n.properties?.id ?? n.id),
          name: n.properties?.name || n.name || `Proyecto #${n.properties?.id ?? n.id}`
        }));

      if (foundProjects.length > 0) {
        setProjects(prevProjects => {
          const map = new Map(prevProjects.map(p => [String(p.id), p]));
          foundProjects.forEach(p => map.set(String(p.id), p));
          return Array.from(map.values());
        });
      }
    }
  }, [graphData]);

  useEffect(() => {
    if (projects.length > 0 && selectedProjectId === null) {
      setSelectedProjectId(projects[0].id);
    }
    if (selectedProjectId !== null && projects.length > 0 && !projects.find(p => p.id === selectedProjectId)) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (selectedProjectId !== null) {
      fetchInfrastructure(false, selectedProjectId);
    }
    setSelectedNode(null);
    setSelectedExploitationPath(null);
    setShowPathsModal(false);
    setShowAPTPanel(false);
    setShowFindingVulnsModal(false);
  }, [selectedProjectId]);

  const filteredGraphData = useMemo(() => {
    if (!selectedProjectId || !graphData.nodes || graphData.nodes.length === 0) {
      return graphData;
    }

    const projectNode = graphData.nodes.find(
      n => (n.labels?.includes('Project') || n.primaryLabel === 'Project') &&
          String(n.properties?.id ?? n.id) === String(selectedProjectId)
    );
    if (!projectNode) {
      return graphData;
    }

    const rels = graphData.relationships || [];
    const nodeMap = new Map(graphData.nodes.map(n => [n.id, n]));
    const nodeDecorations = new Map();

    rels.forEach(rel => {
      if (rel.type === 'INSTANCE_OF') {
        const sourceNode = nodeMap.get(rel.source);
        const targetNode = nodeMap.get(rel.target);
        if (sourceNode && targetNode && 
           (sourceNode.primaryLabel === 'SoftwareInstallation' || sourceNode.labels?.includes('SoftwareInstallation')) && 
           (targetNode.primaryLabel === 'Software' || targetNode.labels?.includes('Software'))) {
          const swName = targetNode.properties?.name || targetNode.name;
          nodeDecorations.set(sourceNode.id, { software_name: swName });
        }
      }
    });

    nodeDecorations.forEach((extra, nodeId) => {
      const origNode = nodeMap.get(nodeId);
      if (origNode) {
        nodeMap.set(nodeId, { ...origNode, properties: { ...origNode.properties, ...extra } });
      }
    });

    const routeFindingKeys = new Set();

    (selectedExploitationPath?.steps || []).forEach(step => {
      if (step.finding_id) routeFindingKeys.add(String(step.finding_id));
      if (step.cve_id) routeFindingKeys.add(String(step.cve_id));
      if (step.vulnerability) routeFindingKeys.add(String(step.vulnerability));

      if (Array.isArray(step.finding_ids)) {
        step.finding_ids.forEach(id => {
          if (id) routeFindingKeys.add(String(id));
        });
      }

      if (Array.isArray(step.findings)) {
        step.findings.forEach(f => {
          if (f.id) routeFindingKeys.add(String(f.id));
          if (f.finding_id) routeFindingKeys.add(String(f.finding_id));
          if (f.cve_id) routeFindingKeys.add(String(f.cve_id));
          if (f.properties?.id) routeFindingKeys.add(String(f.properties.id));
          if (f.properties?.cve_id) routeFindingKeys.add(String(f.properties.cve_id));
        });
      }
    });

    const isRouteFinding = (findingNode) => {
      if (!findingNode || routeFindingKeys.size === 0) return false;

      return (
        routeFindingKeys.has(String(findingNode.id)) ||
        routeFindingKeys.has(String(findingNode.properties?.id)) ||
        routeFindingKeys.has(String(findingNode.properties?.finding_id)) ||
        routeFindingKeys.has(String(findingNode.properties?.cve_id))
      );
    };

    const reachableIds = new Set();
    reachableIds.add(projectNode.id);

    const projectEndpointIds = new Set();
    rels.forEach(rel => {
      const isSourceProject = rel.source === projectNode.id;
      const isTargetProject = rel.target === projectNode.id;
      if (isSourceProject || isTargetProject) {
        const otherId = isSourceProject ? rel.target : rel.source;
        const otherNode = nodeMap.get(otherId);
        if (otherNode) {
          if (otherNode.primaryLabel === 'Endpoint' || otherNode.labels?.includes('Endpoint')) {
            projectEndpointIds.add(otherId);
            reachableIds.add(otherId);
          } else if (otherNode.primaryLabel === 'Network' || otherNode.labels?.includes('Network')) {
            reachableIds.add(otherId);
          }
        }
      }
    });

    const projectContainerIds = new Set();
    const projectInstallationIds = new Set();

    rels.forEach(rel => {
      const sourceIsEndpoint = projectEndpointIds.has(rel.source);
      const targetIsEndpoint = projectEndpointIds.has(rel.target);

      if (sourceIsEndpoint || targetIsEndpoint) {
        const otherId = sourceIsEndpoint ? rel.target : rel.source;
        const otherNode = nodeMap.get(otherId);
        if (!otherNode) return;

        const primaryLabel = otherNode.primaryLabel || otherNode.labels?.[0];
        const labels = otherNode.labels || [];

        if (primaryLabel === 'Project' || labels.includes('Project') || primaryLabel === 'Endpoint' || labels.includes('Endpoint')) return;

        if (primaryLabel === 'Container' || labels.includes('Container') || rel.type === 'HOSTS') {
          projectContainerIds.add(otherId);
          reachableIds.add(otherId);
        } else if (primaryLabel === 'SoftwareInstallation' || labels.includes('SoftwareInstallation') || rel.type === 'HAS_INSTALLATION') {
          projectInstallationIds.add(otherId);
          reachableIds.add(otherId);
        } else {
          reachableIds.add(otherId);
        }
      }
    });

    const projectContainerImageIds = new Set();
    rels.forEach(rel => {
      const sourceIsCont = projectContainerIds.has(rel.source);
      const targetIsCont = projectContainerIds.has(rel.target);

      if (sourceIsCont || targetIsCont) {
        const otherId = sourceIsCont ? rel.target : rel.source;
        const otherNode = nodeMap.get(otherId);
        if (!otherNode) return;

        const primaryLabel = otherNode.primaryLabel || otherNode.labels?.[0];
        const labels = otherNode.labels || [];

        if (primaryLabel === 'SoftwareInstallation' || labels.includes('SoftwareInstallation') || rel.type === 'HAS_INSTALLATION') {
          projectInstallationIds.add(otherId);
          reachableIds.add(otherId);
        } else if (primaryLabel === 'ContainerImage' || labels.includes('ContainerImage') || rel.type === 'USES_IMAGE') {
          projectContainerImageIds.add(otherId);
          reachableIds.add(otherId);
        } else if (primaryLabel === 'Network' || labels.includes('Network')) {
          reachableIds.add(otherId);
        }
      }
    });

    rels.forEach(rel => {
      if (rel.type !== 'INSTANCE_OF') return;

      const sourceNode = nodeMap.get(rel.source);
      const targetNode = nodeMap.get(rel.target);
      if (!sourceNode || !targetNode) return;

      const sourceIsInstallation = isSoftwareInstallationNode(sourceNode);
      const targetIsInstallation = isSoftwareInstallationNode(targetNode);
      const sourceIsSoftware = isSoftwareNode(sourceNode);
      const targetIsSoftware = isSoftwareNode(targetNode);

      if (sourceIsInstallation && targetIsSoftware && reachableIds.has(rel.source)) {
        reachableIds.add(rel.target);
        return;
      }

      if (sourceIsSoftware && targetIsInstallation && reachableIds.has(rel.target)) {
        reachableIds.add(rel.source);
      }
    });

    const findingOwners = new Map();

    projectInstallationIds.forEach(ownerId => {
      findingOwners.set(ownerId, {
        owner_id: ownerId,
        owner_type: 'SoftwareInstallation'
      });
    });

    projectContainerIds.forEach(ownerId => {
      findingOwners.set(ownerId, {
        owner_id: ownerId,
        owner_type: 'Container'
      });
    });

    projectContainerImageIds.forEach(ownerId => {
      findingOwners.set(ownerId, {
        owner_id: ownerId,
        owner_type: 'ContainerImage'
      });
    });

    const findingOwnerMap = new Map();

    rels.forEach(rel => {
      if (rel.type !== 'HAS_FINDING') return;

      const sourceOwner = findingOwners.get(rel.source);
      const targetOwner = findingOwners.get(rel.target);
      const owner = sourceOwner || targetOwner;

      if (!owner) return;

      const findingNodeId = sourceOwner ? rel.target : rel.source;
      const findingNode = nodeMap.get(findingNodeId);
      if (!findingNode) return;

      const labels = findingNode.labels || [];
      const isFinding =
        findingNode.primaryLabel === 'Finding' ||
        labels.includes('Finding');

      if (!isFinding) return;

      if (!findingOwnerMap.has(owner.owner_id)) {
        findingOwnerMap.set(owner.owner_id, {
          owner_id: owner.owner_id,
          owner_type: owner.owner_type,
          findings: [],
          finding_ids: new Set()
        });
      }

      const ownerEntry = findingOwnerMap.get(owner.owner_id);
      const findingIdentity = String(
        findingNode.properties?.finding_key ||
        findingNode.properties?.id ||
        findingNode.id
      );

      if (ownerEntry.finding_ids.has(findingIdentity)) return;

      ownerEntry.finding_ids.add(findingIdentity);
      ownerEntry.findings.push(findingNode);
    });

    const groupedFindingNodesMap = new Map();
    const groupedFindingNodeIds = new Set();
    const routeFindingNodes = new Map();

    findingOwnerMap.forEach(ownerEntry => {
      const {
        owner_id: ownerId,
        owner_type: ownerType,
        findings: findingsList
      } = ownerEntry;

      if (findingsList.length === 0) return;

      const visibleFindings = findingsList.filter(isRouteFinding);
      const groupedFindings = findingsList.filter(finding => !isRouteFinding(finding));

      visibleFindings.forEach(finding => {
        routeFindingNodes.set(finding.id, finding);
        reachableIds.add(finding.id);
      });

      if (groupedFindings.length === 0) return;

      const groupedNodeId = `findings-group-${ownerType}-${ownerId}`;
      groupedFindingNodeIds.add(groupedNodeId);

      const groupedNode = {
        id: groupedNodeId,
        primaryLabel: 'Finding',
        categoryId: 'hallazgo',
        labels: ['Finding', 'FindingsGroup'],
        name: `Hallazgos (${groupedFindings.length})`,
        properties: {
          id: groupedNodeId,
          owner_id: ownerId,
          owner_type: ownerType,
          software_installation_id:
            ownerType === 'SoftwareInstallation' ? ownerId : null,
          container_id:
            ownerType === 'Container' ? ownerId : null,
          container_image_id:
            ownerType === 'ContainerImage' ? ownerId : null,
          findings: groupedFindings,
          has_vulnerabilities: groupedFindings.some(finding =>
            Boolean(
              finding.hasVuln ||
              finding.properties?.has_vulnerabilities
            )
          )
        }
      };

      groupedFindingNodesMap.set(ownerId, groupedNode);
    });

    rels.forEach(rel => {
      const sourceIsRouteFinding = routeFindingNodes.has(rel.source);
      const targetIsRouteFinding = routeFindingNodes.has(rel.target);

      if (rel.type === 'OF_VULNERABILITY' && (sourceIsRouteFinding || targetIsRouteFinding)) {
        const vulnId = sourceIsRouteFinding ? rel.target : rel.source;
        reachableIds.add(vulnId);
      }
    });

    const finalRelationships = rels.filter(r => {
      const sourceNode = nodeMap.get(r.source);
      const targetNode = nodeMap.get(r.target);

      const sourceIsFinding = sourceNode?.primaryLabel === 'Finding' || sourceNode?.labels?.includes('Finding');
      const targetIsFinding = targetNode?.primaryLabel === 'Finding' || targetNode?.labels?.includes('Finding');
      const isFindingRel = sourceIsFinding || targetIsFinding;

      const sourceIsRouteFinding = routeFindingNodes.has(r.source);
      const targetIsRouteFinding = routeFindingNodes.has(r.target);
      const isRouteFindingRel = sourceIsRouteFinding || targetIsRouteFinding;

      if (isFindingRel && !isRouteFindingRel) return false;

      return reachableIds.has(r.source) && reachableIds.has(r.target);
    });

    groupedFindingNodesMap.forEach((groupedNode, ownerId) => {
      const ownerType = groupedNode.properties.owner_type;

      finalRelationships.push({
        id: `rel-group-${ownerType}-${ownerId}`,
        source: ownerId,
        target: groupedNode.id,
        type: 'HAS_FINDING',
        properties: {
          virtual: true,
          owner_type: ownerType
        }
      });
    });

    const finalNodes = graphData.nodes.filter(n => {
      const isFinding = n.primaryLabel === 'Finding' || n.labels?.includes('Finding');

      if (isFinding && !routeFindingNodes.has(n.id)) {
        return false;
      }

      return reachableIds.has(n.id);
    });

    groupedFindingNodesMap.forEach((groupedNode) => {
      finalNodes.push(groupedNode);
    });

    finalNodes.forEach(n => {
      if (n.primaryLabel === 'Network' || (n.labels && n.labels.includes('Network'))) {
        const hasProjectRel = finalRelationships.some(r =>
          (r.source === projectNode.id && r.target === n.id) ||
          (r.target === projectNode.id && r.source === n.id)
        );
        if (!hasProjectRel) {
          finalRelationships.push({
            id: `virtual-net-${n.id}`,
            source: projectNode.id,
            target: n.id,
            type: 'CONTAINS_NETWORK',
            properties: { virtual: true }
          });
        }
      }
    });

    return {
      nodes: finalNodes,
      relationships: finalRelationships
    };
  }, [graphData, selectedProjectId, selectedExploitationPath]);

  // Grafo visible en Canvas tras aplicar el filtrado por proyecto (los filtros de búsqueda, categoría y avanzados atenúan visualmente en lugar de eliminar nodos)
  const displayGraphData = useMemo(() => {
    const { nodes = [], relationships = [] } = filteredGraphData || {};
    const visibleNodes = nodes.filter(n => {
      const props = n.properties || {};
      const primaryLabel = n.primaryLabel || n.labels?.[0] || '';
      const name = n.name || props.name || props.nombre || props.hostname || props.title || n.id || '';

      if (primaryLabel === 'Project' || n.labels?.includes('Project')) {
        return true;
      }

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchesName = String(name).toLowerCase().includes(q);
        const matchesProps = Object.values(props).some(v => String(v).toLowerCase().includes(q));
        if (!matchesName && !matchesProps) return false;
      }

      if (filterType !== 'ALL') {
        const hasLabel = n.labels?.includes(filterType) || primaryLabel === filterType;
        if (!hasLabel) return false;
      }

      if (graphAdvancedFilters.ipSearch.trim() !== '') {
        const ipQ = graphAdvancedFilters.ipSearch.toLowerCase();
        const ips = Array.isArray(props.ips) ? props.ips : (props.ip ? [props.ip] : []);
        const cidr = props.cidr || props.rango || '';
        const matchesIP = ips.some(ip => String(ip).toLowerCase().includes(ipQ)) || String(cidr).toLowerCase().includes(ipQ);
        if (!matchesIP) return false;
      }

      if (graphAdvancedFilters.vendorSearch.trim() !== '') {
        const vQ = graphAdvancedFilters.vendorSearch.toLowerCase();
        const vendor = props.vendor || props.software_vendor || props.manufacturer || props.fabricante || '';
        if (!String(vendor).toLowerCase().includes(vQ)) return false;
      }

      if (graphAdvancedFilters.environment !== 'ALL') {
        const env = (props.environment || props.entorno || '').toLowerCase();
        if (env !== graphAdvancedFilters.environment.toLowerCase()) return false;
      }

      if (graphAdvancedFilters.internetExposed !== 'ALL') {
        const isExp = props.internet_exposed === true || props.internet_exposed === 'true';
        if (graphAdvancedFilters.internetExposed === 'TRUE' && !isExp) return false;
        if (graphAdvancedFilters.internetExposed === 'FALSE' && isExp) return false;
      }

      if (graphAdvancedFilters.status !== 'ALL') {
        const st = (props.status || props.estado || '').toLowerCase();
        if (st !== graphAdvancedFilters.status.toLowerCase()) return false;
      }

      if (graphAdvancedFilters.riskTier !== 'ALL') {
        const risk = (props.risk_tier || props.severity || '').toUpperCase();
        if (risk !== graphAdvancedFilters.riskTier.toUpperCase()) return false;
      }

      return true;
    });

    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));

    const visibleRelationships = relationships.filter(r => {
      const sourceId = typeof r.source === 'object' ? r.source.id : r.source;
      const targetId = typeof r.target === 'object' ? r.target.id : r.target;
      return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
    });

    return {
      nodes,
      relationships,
      links: relationships
    };
  }, [filteredGraphData]);

  useEffect(() => {
    if (selectedNode && displayGraphData.nodes) {
      const freshNode = displayGraphData.nodes.find(n => n.id === selectedNode.id);
      if (freshNode && JSON.stringify(freshNode) !== JSON.stringify(selectedNode)) {
        setSelectedNode(freshNode);
      }
    }
  }, [displayGraphData, selectedNode]);

  const getNodeCountByType = useCallback((type) => {
    return filteredGraphData.nodes.filter(n => n.labels.includes(type)).length;
  }, [filteredGraphData]);

  const getSelectedProjectSoftwareInstallations = useCallback(() => {
    const nodes = filteredGraphData.nodes || [];
    const relationships = filteredGraphData.relationships || [];

    const softwareByElementId = new Map(
      nodes
        .filter(n => n.primaryLabel === 'Software' || n.labels?.includes('Software'))
        .map(n => [n.id, n])
    );

    return nodes
      .filter(isSoftwareInstallationNode)
      .map(installationNode => {
        const rel = relationships.find(r =>
          r.type === 'INSTANCE_OF' &&
          (r.source === installationNode.id || r.target === installationNode.id)
        );

        if (!rel) return null;

        const softwareElementId = rel.source === installationNode.id ? rel.target : rel.source;
        const softwareNode = softwareByElementId.get(softwareElementId);

        if (!softwareNode) return null;

        return {
          installationId: installationNode.properties?.id || installationNode.properties?.installation_id,
          softwareId: softwareNode.properties?.id || softwareNode.properties?.software_id,
          installationName: installationNode.name,
          softwareName: softwareNode.name,
          installationNode
        };
      })
      .filter(Boolean)
      .filter(item => item.installationId && item.softwareId);
  }, [filteredGraphData]);

  const getSelectedProjectContainerImages = useCallback(() => {
    return (filteredGraphData?.nodes || [])
      .filter(n =>
        n.primaryLabel === 'ContainerImage' ||
        n.labels?.includes('ContainerImage')
      )
      .map(n => ({
        imageId: n.properties?.id,
        imageName: n.properties?.id || n.properties?.name,
        imageNode: n
      }))
      .filter(item => item.imageId);
  }, [filteredGraphData]);

// Estado para la rueda de progreso dinámico
  const [vulnScanProgress, setVulnScanProgress] = useState({ current: 0, total: 0, percent: 0, statusText: '' });

  const analyzeProjectVulnerabilities = async () => {
    if (!selectedProjectId || vulnScanLoading || riskComputeLoading) return;

    setVulnScanLoading(true);
    setRiskActionError(null);

    let successCount = 0;
    let processedCVEs = 0;
    let findingsCreated = 0;
    let findingsExisting = 0;
    let cacheHits = 0;
    let freshQueries = 0;

    const installations = getSelectedProjectSoftwareInstallations();
    const containerImages = getSelectedProjectContainerImages();
    const allItems = [
      ...installations.map(inst => ({ type: 'software', ...inst })),
      ...containerImages.map(img => ({ type: 'image', ...img }))
    ];

    const totalItems = allItems.length;
    if (totalItems === 0) {
      toast.warning('No hay software instalado ni imágenes de contenedor en el proyecto seleccionado.', 'Análisis de Vulnerabilidades');
      setVulnScanLoading(false);
      return;
    }

    setVulnScanProgress({ current: 0, total: totalItems, percent: 5, statusText: 'Iniciando...' });
    const failedItems = [];
    const itemWeight = 100 / totalItems;

    try {
      for (let i = 0; i < totalItems; i++) {
        const item = allItems[i];
        const basePercent = Math.round(i * itemWeight);

        // Ticker de progreso continuo mientras esperamos la respuesta de red de la API
        let currentSub = basePercent + 2;
        const maxSub = Math.round(basePercent + itemWeight * 0.88);

        const subInterval = setInterval(() => {
          if (currentSub < maxSub) {
            currentSub += 3;
            setVulnScanProgress({
              current: i,
              total: totalItems,
              percent: Math.min(96, currentSub),
              statusText: item.type === 'software' ? `Analizando ${item.softwareName || 'software'}...` : `Escaneando ${item.imageName || 'imagen'}...`
            });
          }
        }, 120);

        try {
          if (item.type === 'software') {
            const result = await scanInstallationVulnerabilitiesUseCase.execute(
              item.installationId,
              item.softwareId,
              { forceRefresh: shouldForceVulnRefresh(item.installationNode) }
            );

            processedCVEs += Number(result?.processed || result?.vulnerabilities_found || 0);
            findingsCreated += Number(result?.findings_created || 0);
            findingsExisting += Number(result?.findings_existing || 0);
            if (result?.cache_hit) cacheHits++; else freshQueries++;
            successCount++;
          } else {
            const result = await scanContainerImageVulnerabilitiesUseCase.execute(
              item.imageId,
              item.imageName,
              { forceRefresh: shouldForceVulnRefresh(item.imageNode) }
            );

            processedCVEs += Number(result?.processed || result?.vulnerabilities_found || 0);
            findingsCreated += Number(result?.findings_created || 0);
            findingsExisting += Number(result?.findings_existing || 0);
            if (result?.cache_hit) cacheHits++; else freshQueries++;
            successCount++;
          }
        } catch (err) {
          console.error(`Error analizando elemento:`, err);
          failedItems.push(`${item.type === 'software' ? 'Soft' : 'Img'}: ${item.softwareName || item.imageName || item.installationId || item.imageId}`);
        } finally {
          clearInterval(subInterval);
          const completedPercent = Math.round((i + 1) * itemWeight);
          setVulnScanProgress({
            current: i + 1,
            total: totalItems,
            percent: Math.min(100, completedPercent),
            statusText: `Completado ${i + 1}/${totalItems}`
          });
        }
      }

      setVulnScanProgress({ current: totalItems, total: totalItems, percent: 100, statusText: 'Actualizando grafo...' });
      await fetchInfrastructure(true);

      if (successCount > 0) {
        setVulnScanProgress({ current: totalItems, total: totalItems, percent: 100, statusText: 'Calculando riesgos...' });
        await computeSelectedProjectRisk();
      }

      // Pausa visual al 100% para que el usuario aprecie la rueda completa
      await new Promise(resolve => setTimeout(resolve, 600));

      const summaryLines = [
        `Vulnerabilidades analizadas: ${successCount} elemento(s).`,
        `Instalaciones software: ${installations.length}.`,
        `Imágenes contenedor: ${containerImages.length}.`,
        `CVEs procesadas: ${processedCVEs}.`,
        `Nuevos findings: ${findingsCreated}.`,
        `Findings existentes: ${findingsExisting}.`,
        `Cache usada: ${cacheHits} instalación(es).`,
        `Consultas frescas: ${freshQueries} instalación(es).`
      ];

      if (failedItems.length === 0) {
        toast.success(summaryLines.join('\n'), 'Análisis Completado');
      } else if (successCount > 0) {
        toast.warning(`${summaryLines.join('\n')}\nNo se pudo analizar: ${failedItems.join(', ')}.`, `Análisis Parcial (${successCount}/${totalItems})`);
      } else {
        const errorMsg = `No se pudo analizar ningún elemento. Fallaron: ${failedItems.join(', ')}`;
        setRiskActionError(errorMsg);
        toast.error(errorMsg, 'Falló el Análisis');
      }

      if (successCount > 0 && containerImages.length > 0) {
        startPendingPolling(selectedProjectId);
      }
    } catch (err) {
      console.error(err);
      setRiskActionError(err.message);
      toast.error(`Error inesperado analizando vulnerabilidades: ${err.message}`, 'Falló el Análisis');
    } finally {
      setVulnScanLoading(false);
      setVulnScanProgress({ current: 0, total: 0, percent: 0, statusText: '' });
    }
  };

  const computeSelectedProjectRisk = async () => {
    if (!selectedProjectId || riskComputeLoading) return;

    setRiskComputeLoading(true);
    setRiskActionError(null);

    try {
      await computeProjectRiskUseCase.execute(selectedProjectId);
      toast.success('Riesgo calculado para el proyecto seleccionado.', 'Cálculo de Riesgo');
      await fetchInfrastructure(true);
    } catch (err) {
      console.error(err);
      setRiskActionError(err.message);
      toast.error(`Error calculando riesgo: ${err.message}`, 'Cálculo de Riesgo');
    } finally {
      setRiskComputeLoading(false);
    }
  };

  const computeAllProjectRisks = async () => {
    setRiskComputeLoading(true);
    setRiskActionError(null);

    try {
      await computeAllProjectRisksUseCase.execute();
      toast.success('Riesgo recalculado para todos los proyectos.', 'Cálculo Global de Riesgos');
      await fetchInfrastructure(true);
    } catch (err) {
      console.error(err);
      setRiskActionError(err.message);
      toast.error(`Error recalculando todos los proyectos: ${err.message}`, 'Cálculo Global de Riesgos');
    } finally {
      setRiskComputeLoading(false);
    }
  };

  const selectedProjectNode = useMemo(() => {
    return (graphData.nodes || []).find(n =>
      (n.labels?.includes('Project') || n.primaryLabel === 'Project') &&
      String(n.properties?.id ?? n.id) === selectedProjectId
    ) || null;
  }, [graphData, selectedProjectId]);

  const refreshPatchesForProject = async (queueItems = patchQueue) => {
    if (!selectedProjectId) {
      const message = 'Selecciona un proyecto antes de refrescar patches';
      setPatchProjectRefreshError(message);
      toast.error(message, 'Error refrescando patches');
      throw new Error(message);
    }

    setPatchProjectRefreshLoading(true);
    setPatchProjectRefreshError(null);
    setPatchProjectRefreshProgress(null);

    try {
      const visibleCVEs = [
        ...new Set(
          queueItems
            .map(item => item.cve_id)
            .filter(Boolean)
        )
      ];

      if (visibleCVEs.length === 0) {
        toast.info('No hay CVEs visibles en la Patch Queue', 'Patch Queue');
        return { total_cves: 0, refreshed: 0, failed: 0, not_found: 0, processed: 0 };
      }

      let refreshed = 0;
      let failed = 0;
      let notFound = 0;
      let processed = 0;

      for (const cveId of visibleCVEs) {
        try {
          const result = await refreshPatchesForVulnerabilityUseCase.execute(cveId);
          if (result?.found === false) {
            notFound += 1;
          } else {
            refreshed += 1;
          }
        } catch (err) {
          failed += 1;
          console.warn(`Error refrescando patches para ${cveId}`, err);
        }

        processed += 1;

        setPatchProjectRefreshProgress({
          processed,
          total: visibleCVEs.length,
          failed,
          notFound
        });

        if (processed < visibleCVEs.length) {
          await new Promise(resolve => setTimeout(resolve, 1200));
        }
      }

      setPatchesByCVE({});
      await fetchPatchQueue();
      await fetchInfrastructure(true);

      toast.success(
        `Patches refrescados: ${refreshed}/${visibleCVEs.length}. Fallidos: ${failed}. Sin datos: ${notFound}.`,
        'Patch Queue actualizada'
      );

      return { total_cves: visibleCVEs.length, refreshed, failed, not_found: notFound, processed };
    } catch (err) {
      setPatchProjectRefreshError(err.message);
      toast.error(err.message, 'Error refrescando patches del proyecto');
      throw err;
    } finally {
      setPatchProjectRefreshLoading(false);
      setPatchProjectRefreshProgress(null);
    }
  };
  

  return {
    showDashboard,
    setShowDashboard,
    clicks,
    setClicks,
    graphData: displayGraphData,
    filteredGraphData: filteredGraphData,
    allGraphData: graphData,
    loading,
    error,
    selectedNode,
    setSelectedNode,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    graphAdvancedFilters,
    updateGraphAdvancedFilter,
    clearGraphAdvancedFilters,
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
    fetchTTPMatrix,
    getNodeCountByType,
    projects,
    selectedProjectId,
    setSelectedProjectId,
    showToast,
    createProject,
    createEndpoint,
    createContainer,
    createHardware,
    createSoftware,
    createContainerSoftware,
    createNetwork,
    updateNode,
    deleteNode,
    renameProject,
    deleteProject,
    exportProject,
    exportMitreNavigator,
    exportInventory,
    exportWeeklyReport,
    exportMonthlyReport,
    importProject,
    vulnScanLoading,
    riskComputeLoading,
    riskActionLoading: vulnScanLoading || riskComputeLoading,
    riskActionError,
    isAnalysisPending,
    analyzeProjectVulnerabilities,
    computeSelectedProjectRisk,
    computeAllProjectRisks,
    selectedProjectNode,
    fetchFindingVulnerabilities,
    closeFindingVulnsModal,
    showFindingVulnsModal,
    findingVulnsData,
    findingVulnsLoading,
    findingVulnsError,
    findingVulnsSourceNode,
    patchQueue,
    patchQueueCount,
    patchQueuePage,
    patchQueueLimit,
    patchQueueTotal,
    patchQueueTotalPages,
    patchQueueLoading,
    patchQueueError,
    fetchPatchQueue,
    refreshPatchesForCVE,
    focusPatchQueueItem,
    patchApplyLoading: patchApplyingKey !== null,
    patchApplyError,
    declarePatchApplied,
    patchApplyingKey,
    patchesByCVE,
    patchDetailsLoading,
    patchDetailsError,
    fetchPatchesForCVE,
    projectPatchesByCVE,
    projectPatchesLoading,
    fetchProjectPatches,
    refreshPatchesForProject,
    patchProjectRefreshLoading,
    patchProjectRefreshError,
    patchProjectRefreshProgress,
    appliedPatchHistory,
    appliedPatchHistoryLoading,
    appliedPatchHistoryError,
    appliedPatchHistoryInstallationId,
    fetchAppliedPatchHistory,
    fetchEndpointPatchHistory
  };
}

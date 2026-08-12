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
import { ExportProjectUseCase } from '../../domain/usecases/ExportProjectUseCase';
import { ExportMitreNavigatorUseCase } from '../../domain/usecases/ExportMitreNavigatorUseCase';
import { ExportInventoryUseCase } from '../../domain/usecases/ExportInventoryUseCase';
import { ImportInfrastructureUseCase } from '../../domain/usecases/ImportInfrastructureUseCase';
import { ScanInstallationVulnerabilitiesUseCase } from '../../domain/usecases/ScanInstallationVulnerabilitiesUseCase';
import { GetFindingVulnerabilitiesUseCase } from '../../domain/usecases/GetFindingVulnerabilitiesUseCase';
import { ComputeProjectRiskUseCase } from '../../domain/usecases/ComputeProjectRiskUseCase';
import { ComputeAllProjectRisksUseCase } from '../../domain/usecases/ComputeAllProjectRisksUseCase';
import { UpdateNodeUseCase } from '../../domain/usecases/UpdateNodeUseCase';
import { DeleteNodeUseCase } from '../../domain/usecases/DeleteNodeUseCase';
import { useToast } from '../context/ToastContext';

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

  // Estados del modal de CVEs por Finding
  const [showFindingVulnsModal, setShowFindingVulnsModal] = useState(false);
  const [findingVulnsData, setFindingVulnsData] = useState([]);
  const [findingVulnsLoading, setFindingVulnsLoading] = useState(false);
  const [findingVulnsError, setFindingVulnsError] = useState(null);
  const [findingVulnsSourceNode, setFindingVulnsSourceNode] = useState(null);

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
  const updateNodeUseCase = useMemo(() => new UpdateNodeUseCase(repository), [repository]);
  const deleteNodeUseCase = useMemo(() => new DeleteNodeUseCase(repository), [repository]);

  const exportProjectUseCase = useMemo(() => new ExportProjectUseCase(repository), [repository]);
  const exportMitreNavigatorUseCase = useMemo(() => new ExportMitreNavigatorUseCase(), []);
  const exportInventoryUseCase = useMemo(() => new ExportInventoryUseCase(repository), [repository]);
  const importInfrastructureUseCase = useMemo(() => new ImportInfrastructureUseCase(repository), [repository]);

  // Casos de uso para cálculo de riesgo
  const scanInstallationVulnerabilitiesUseCase = useMemo(() => new ScanInstallationVulnerabilitiesUseCase(repository), [repository]);
  const getFindingVulnerabilitiesUseCase = useMemo(() => new GetFindingVulnerabilitiesUseCase(repository), [repository]);
  const computeProjectRiskUseCase = useMemo(() => new ComputeProjectRiskUseCase(repository), [repository]);
  const computeAllProjectRisksUseCase = useMemo(() => new ComputeAllProjectRisksUseCase(repository), [repository]);


  const showToast = (msg, type = 'info', title = null) => {
    toast.showToast(msg, type, title);
  };

  const fetchInfrastructure = async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const data = await getInfrastructureUseCase.execute();
      setGraphData(data);
    } catch (err) {
      console.error(err);
      const errorMsg = `No se pudo conectar a la base de datos de Neo4j. Verifica que el servidor de Backend (puerto 8080) y la base de datos de Neo4j estén activos. Detalles: ${err.message}`;
      setError(errorMsg);
      toast.error(err.message, 'Error de Conexión');
    } finally {
      if (!quiet) setLoading(false);
    }
  };

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
      const data = await getExploitationPathsUseCase.execute();
      setExploitationPaths(data || []);
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
  };

  const clearSelectedExploitationPath = () => {
    setSelectedExploitationPath(null);
  };

  const createProject = async (data) => {
    try {
      const res = await createProjectUseCase.execute(data);
      toast.success('¡Proyecto añadido correctamente!', 'Nuevo Proyecto');
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

  const createNetwork = async (data) => {
    try {
      const res = await createNetworkUseCase.execute(data, selectedProjectId);
      toast.success('¡Red añadida correctamente! Los endpoints compatibles se han enlazado automáticamente.', 'Nueva Red');
      await fetchInfrastructure(true);
      return res;
    } catch (err) {
      toast.error(err.message, 'Error creando Red');
      throw err;
    }
  };

  // CVEs de un Finding
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

  const updateNode = async (category, id, data, selectedProjectId) => {
    try {
      const res = await updateNodeUseCase.execute(category, id, data);
      toast.success('¡Activo actualizado y re-enlazado correctamente!', 'Edición Guardada');
      await fetchInfrastructure(true);
      return res;
    } catch (err) {
      toast.error(err.message, 'Error actualizando Activo');
      throw err;
    }
  };

  const deleteNode = async (category, id) => {
    try {
      const res = await deleteNodeUseCase.execute(category, id);
      toast.success('¡El activo fue eliminado del grafo correctamente!', 'Activo Eliminado');
      
      // Si tenemos un nodo seleccionado, lo limpiamos tras borrar para cerrar el Inspector (Punto 1 de Pablo)
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

  // Helper para desencadenar la descarga en el navegador
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
      // Ahora projectName podría venir del filteredGraphData o sacarlo del id.
      // Buscamos el nombre para pasarlo al usecase (opcional)
      const projId = targetProjectId || selectedProjectId;
      const projectNode = filteredGraphData?.nodes?.find(
        n => (n.labels?.includes('Project') || n.primaryLabel === 'Project') &&
            String(n.properties?.id ?? n.id) === String(projId)
      );
      const projectName = projectNode?.properties?.nombre || projectNode?.properties?.name || 'Proyecto';
      
      const { filename, content } = await exportProjectUseCase.execute(projId, projectName);
      _triggerDownload(filename, content);
      showToast('¡Proyecto exportado a JSON con éxito!');
    } catch (err) {
      console.error(err);
      showToast(`Error al exportar proyecto: ${err.message}`);
    }
  };

  const exportMitreNavigator = (targetProjectId) => {
    try {
      const { filename, content } = exportMitreNavigatorUseCase.execute(filteredGraphData, aptData, targetProjectId || selectedProjectId);
      _triggerDownload(filename, content);
      showToast('¡Capa de MITRE ATT&CK Navigator exportada!');
    } catch (err) {
      console.error(err);
      showToast(`Error al exportar capa MITRE: ${err.message}`);
    }
  };

  const exportInventory = async (targetProjectId) => {
    try {
      showToast('Generando Excel de inventario...', 'info');
      const projId = targetProjectId || selectedProjectId;
      const projectNode = filteredGraphData?.nodes?.find(
        n => (n.labels?.includes('Project') || n.primaryLabel === 'Project') &&
            String(n.properties?.id ?? n.id) === String(projId)
      );
      const projectName = projectNode?.properties?.nombre || projectNode?.properties?.name || 'Proyecto';

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

  const importProject = async (fileData, options = {}) => {
    try {
      let dataToImport = typeof fileData === 'string' ? JSON.parse(fileData) : JSON.parse(JSON.stringify(fileData));

      // 1. Si el usuario seleccionó "Sobrescribir", eliminar el proyecto existente en Neo4j primero
      if (options.overwrite && options.targetProjectId) {
        try {
          await repository.deleteProject(options.targetProjectId);
        } catch (delErr) {
          console.warn('Aviso limpiando proyecto anterior:', delErr);
        }
      }

      // 2. Si el usuario seleccionó "Renombrar", actualizar el nombre y asignar nuevo ID único al proyecto en el JSON
      if (options.renameTo) {
        const newProjId = Date.now();
        if (dataToImport.project) {
          dataToImport.project.name = options.renameTo;
          dataToImport.project.id = newProjId;
        }

        const nodes = dataToImport.nodes || dataToImport.graphData?.nodes || [];
        const projectNode = nodes.find(n => n.labels?.includes('Project') || n.primaryLabel === 'Project');

        if (projectNode) {
          const oldNodeId = String(projectNode.id);
          const oldPropId = projectNode.properties?.id !== undefined && projectNode.properties?.id !== null ? String(projectNode.properties.id) : null;

          if (projectNode.properties) {
            projectNode.properties.nombre = options.renameTo;
            projectNode.properties.name = options.renameTo;
            projectNode.properties.id = newProjId;
          }
          projectNode.id = String(newProjId);

          const rels = dataToImport.relationships || dataToImport.graphData?.relationships || [];
          rels.forEach(rel => {
            const sStr = String(rel.source);
            const tStr = String(rel.target);

            if (sStr === oldNodeId || (oldPropId && sStr === oldPropId)) {
              rel.source = String(newProjId);
            }
            if (tStr === oldNodeId || (oldPropId && tStr === oldPropId)) {
              rel.target = String(newProjId);
            }
          });
        }
      }

      // 3. Ejecutar caso de uso de importación
      await importInfrastructureUseCase.execute(dataToImport);
      showToast('¡Infraestructura cargada e importada con éxito!');
      await fetchInfrastructure(true);

      // 4. Auto-seleccionar el proyecto importado
      try {
        const impProjectId = dataToImport?.project?.id || dataToImport?.nodes?.find(n => n.labels?.includes('Project') || n.primaryLabel === 'Project')?.properties?.id;
        if (impProjectId !== undefined && impProjectId !== null) {
          setSelectedProjectId(String(impProjectId));
        }
      } catch (e) {
        // Ignorar si no se puede extraer el ID del proyecto
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  // Cargar datos al montar el hook y al activar el Dashboard
  useEffect(() => {
    fetchInfrastructure();
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


  // Filtrar graphData según el proyecto seleccionado (estrictamente por jerarquía de pertenencia)
  const filteredGraphData = useMemo(() => {
    if (!selectedProjectId || !graphData.nodes || graphData.nodes.length === 0) {
      return graphData;
    }

    // 1. Nodo del proyecto seleccionado
    const projectNode = graphData.nodes.find(
      n => (n.labels?.includes('Project') || n.primaryLabel === 'Project') &&
          String(n.properties?.id ?? n.id) === String(selectedProjectId)
    );
    if (!projectNode) {
      return graphData;
    }

    const rels = graphData.relationships || [];
    const nodeMap = new Map(graphData.nodes.map(n => [n.id, n]));

    const reachableIds = new Set();
    reachableIds.add(projectNode.id);
    // 2. Endpoints y Redes pertenecientes a ESTE proyecto
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

    // 3. Nodos directamente vinculados a los Endpoints del proyecto (Hardware, Redes, Contenedores, Instalaciones de Software)
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

        const isProject = primaryLabel === 'Project' || labels.includes('Project');
        const isOtherEndpoint = primaryLabel === 'Endpoint' || labels.includes('Endpoint');

        // Evitar saltar a otros proyectos u otros endpoints
        if (isProject || isOtherEndpoint) return;

        if (primaryLabel === 'Container' || labels.includes('Container') || rel.type === 'HOSTS') {
          projectContainerIds.add(otherId);
          reachableIds.add(otherId);
        } else if (primaryLabel === 'SoftwareInstallation' || labels.includes('SoftwareInstallation') || rel.type === 'HAS_INSTALLATION') {
          projectInstallationIds.add(otherId);
          reachableIds.add(otherId);
        } else {
          // Hardware, Network, etc.
          reachableIds.add(otherId);
        }
      }
    });

    // 4. Instalaciones de Software dentro de los Contenedores del proyecto y ContainerImage
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
          reachableIds.add(otherId);
        }
      }
    });

    // 5. Software (catálogo) y Findings de las Instalaciones del proyecto
    const projectFindingIds = new Set();

    rels.forEach(rel => {
      const sourceIsInst = projectInstallationIds.has(rel.source);
      const targetIsInst = projectInstallationIds.has(rel.target);

      if (sourceIsInst || targetIsInst) {
        const otherId = sourceIsInst ? rel.target : rel.source;
        const otherNode = nodeMap.get(otherId);
        if (!otherNode) return;

        const primaryLabel = otherNode.primaryLabel || otherNode.labels?.[0];
        const labels = otherNode.labels || [];

        if (primaryLabel === 'Finding' || labels.includes('Finding') || rel.type === 'HAS_FINDING') {
          projectFindingIds.add(otherId);
          reachableIds.add(otherId);
        } else if (primaryLabel === 'Software' || labels.includes('Software') || rel.type === 'INSTANCE_OF') {
          reachableIds.add(otherId);
        }
      }
    });

    // 6. Vulnerabilidades, Exploits, Remediaciones de los Findings del proyecto
    const projectRemediationIds = new Set();

    rels.forEach(rel => {
      const sourceIsFinding = projectFindingIds.has(rel.source);
      const targetIsFinding = projectFindingIds.has(rel.target);

      if (sourceIsFinding || targetIsFinding) {
        const otherId = sourceIsFinding ? rel.target : rel.source;
        const otherNode = nodeMap.get(otherId);
        if (!otherNode) return;

        const primaryLabel = otherNode.primaryLabel || otherNode.labels?.[0];
        const labels = otherNode.labels || [];

        if (primaryLabel === 'Remediation' || labels.includes('Remediation') || rel.type === 'HAS_REMEDIATION') {
          projectRemediationIds.add(otherId);
          reachableIds.add(otherId);
        } else if (primaryLabel === 'Vulnerability' || labels.includes('Vulnerability') || primaryLabel === 'Exploit' || labels.includes('Exploit') || rel.type === 'OF_VULNERABILITY' || rel.type === 'HAS_EXPLOIT') {
          reachableIds.add(otherId);
        }
      }
    });

    // 7. Patches de las Remediaciones
    rels.forEach(rel => {
      const sourceIsRem = projectRemediationIds.has(rel.source);
      const targetIsRem = projectRemediationIds.has(rel.target);

      if (sourceIsRem || targetIsRem) {
        const otherId = sourceIsRem ? rel.target : rel.source;
        const otherNode = nodeMap.get(otherId);
        if (!otherNode) return;

        reachableIds.add(otherId);
      }
    });

    // 8. Generar aristas virtuales CONTAINS_NETWORK para anclar visualmente las Redes al Proyecto
    // en caso de que la BD antigua no tenga los enlaces explícitos.
    const finalRelationships = rels.filter(r => reachableIds.has(r.source) && reachableIds.has(r.target));
    const finalNodes = graphData.nodes.filter(n => reachableIds.has(n.id));

    finalNodes.forEach(n => {
      if (n.primaryLabel === 'Network' || (n.labels && n.labels.includes('Network'))) {
        // Verificar si ya existe una relación de pertenencia/contención con el proyecto
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
  }, [graphData, selectedProjectId]);

  // Sincronizar el nodo seleccionado cuando se actualice el grafo para reflejar ediciones al momento
  useEffect(() => {
    if (selectedNode && filteredGraphData.nodes) {
      const freshNode = filteredGraphData.nodes.find(n => n.id === selectedNode.id);
      if (freshNode && JSON.stringify(freshNode) !== JSON.stringify(selectedNode)) {
        setSelectedNode(freshNode);
      }
    }
  }, [filteredGraphData, selectedNode]);

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
        toast.warning('No hay software instalado en el proyecto seleccionado.', 'Análisis de Vulnerabilidades');
        return;
      }

      let successCount = 0;
      const failedInstallations = [];

      for (const installation of installations) {
        try {
          await scanInstallationVulnerabilitiesUseCase.execute(
            installation.installationId,
            installation.softwareId,
            100
          );
          successCount++;
        } catch (err) {
          console.error(`Error analizando ${installation.softwareName || installation.installationId}:`, err);
          failedInstallations.push(installation.softwareName || installation.installationId);
        }
      }

      await fetchInfrastructure(true);

      if (failedInstallations.length === 0) {
        toast.success(`Vulnerabilidades analizadas con éxito para ${successCount} instalación(es).`, 'Análisis Completado');
      } else if (successCount > 0) {
        toast.warning(`Análisis completado para ${successCount} de ${installations.length} software(s). No se pudo analizar: ${failedInstallations.join(', ')}.`, 'Análisis Parcial');
      } else {
        const errorMsg = `No se pudo analizar ninguna instalación. Fallaron: ${failedInstallations.join(', ')}`;
        setRiskActionError(errorMsg);
        toast.error(errorMsg, 'Falló el Análisis');
      }
    } catch (err) {
      console.error(err);
      setRiskActionError(err.message);
      toast.error(`Error inesperado analizando vulnerabilidades: ${err.message}`, 'Falló el Análisis');
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
      toast.success('Riesgo calculado para el proyecto seleccionado.', 'Cálculo de Riesgo');
      await fetchInfrastructure(true);
    } catch (err) {
      console.error(err);
      setRiskActionError(err.message);
      toast.error(`Error calculando riesgo: ${err.message}`, 'Cálculo de Riesgo');
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
      toast.success('Riesgo recalculado para todos los proyectos.', 'Cálculo Global de Riesgos');
      await fetchInfrastructure(true);
    } catch (err) {
      console.error(err);
      setRiskActionError(err.message);
      toast.error(`Error recalculando todos los proyectos: ${err.message}`, 'Cálculo Global de Riesgos');
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
    updateNode,
    deleteNode,
    exportProject,
    exportMitreNavigator,
    exportInventory,
    importProject,
    riskActionLoading,
    riskActionError,
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
    findingVulnsSourceNode
  };

}

import { useState, useEffect, useCallback, useMemo } from 'react';
import { InfrastructureApiDataSource } from '../../data/datasources/InfrastructureApiDataSource';
import { InfrastructureRepositoryImpl } from '../../data/repositories/InfrastructureRepositoryImpl';
import { GetPatchQueueUseCase } from '../../domain/usecases/GetPatchQueueUseCase';

export function usePatchQueue(selectedProjectId) {
  // Filtro global de búsqueda
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Filtros avanzados específicos de Patch Queue
  const [vendorSearch, setVendorSearch] = useState('');
  const [hostnameSearch, setHostnameSearch] = useState('');
  const [environment, setEnvironment] = useState('ALL');
  const [internetExposed, setInternetExposed] = useState('ALL');
  const [inContainer, setInContainer] = useState('ALL');
  const [priorityTier, setPriorityTier] = useState('ALL');
  const [patchAvailable, setPatchAvailable] = useState('ALL');
  const [remediationKind, setRemediationKind] = useState('ALL');

  // Ordenación y Paginación
  const [sortField, setSortField] = useState('priority_score');
  const [sortDirection, setSortDirection] = useState('desc');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Estados de Datos y UI
  const [queue, setQueue] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [priorityTierCounts, setPriorityTierCounts] = useState({});
  const [overallPriorityTierCounts, setOverallPriorityTierCounts] = useState({});
  const [overallTotalItems, setOverallTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Instanciar caso de uso respetando Clean Architecture
  const getPatchQueueUseCase = useMemo(() => {
    const apiDataSource = new InfrastructureApiDataSource();
    const repository = new InfrastructureRepositoryImpl(apiDataSource);
    return new GetPatchQueueUseCase(repository);
  }, []);

  // Debounce para búsqueda general (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset overall metrics on project change
  useEffect(() => {
    setOverallPriorityTierCounts({});
    setOverallTotalItems(0);
  }, [selectedProjectId]);

  // Manejador centralizado para actualizar un filtro y resetear a página 1
  const updateFilter = (key, val) => {
    setPage(1);
    switch (key) {
      case 'search':
        setSearch(val);
        break;
      case 'vendorSearch':
        setVendorSearch(val);
        break;
      case 'hostnameSearch':
        setHostnameSearch(val);
        break;
      case 'environment':
        setEnvironment(val);
        break;
      case 'internetExposed':
        setInternetExposed(val);
        break;
      case 'inContainer':
        setInContainer(val);
        break;
      case 'priorityTier':
        setPriorityTier(val);
        break;
      case 'patchAvailable':
        setPatchAvailable(val);
        break;
      case 'remediationKind':
        setRemediationKind(val);
        break;
      default:
        break;
    }
  };

  const removeFilter = (key, val = 'ALL') => {
    setPage(1);
    if (key === 'search' || key === 'vendorSearch' || key === 'hostnameSearch') {
      updateFilter(key, '');
    } else {
      updateFilter(key, val);
    }
  };

  const clearAllFilters = () => {
    setPage(1);
    setSearch('');
    setVendorSearch('');
    setHostnameSearch('');
    setEnvironment('ALL');
    setInternetExposed('ALL');
    setInContainer('ALL');
    setPriorityTier('ALL');
    setPatchAvailable('ALL');
    setRemediationKind('ALL');
  };

  // Cambio de ordenación por columna
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'cve' || field === 'software' || field === 'hostname' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  // Petición al servidor
  const fetchPatchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPatchQueueUseCase.execute({
        projectId: selectedProjectId,
        page,
        limit,
        search: debouncedSearch,
        vendorSearch,
        hostnameSearch,
        environment,
        internetExposed,
        inContainer,
        priorityTier,
        patchAvailable,
        remediationKind,
        sortField,
        sortDirection
      });

      setQueue(data.queue || []);
      setTotalItems(data.total || 0);
      setTotalPages(data.totalPages || 0);
      setPriorityTierCounts(data.priorityTierCounts || {});

      if (priorityTier === 'ALL') {
        setOverallPriorityTierCounts(data.priorityTierCounts || {});
        setOverallTotalItems(data.total || 0);
      } else {
        // Mantener/actualizar métricas globales de prioridades sin colapsar por el filtro de prioridad
        getPatchQueueUseCase.execute({
          projectId: selectedProjectId,
          page: 1,
          limit: 1,
          search: debouncedSearch,
          vendorSearch,
          hostnameSearch,
          environment,
          internetExposed,
          inContainer,
          priorityTier: 'ALL',
          patchAvailable,
          remediationKind
        }).then(overallData => {
          if (overallData) {
            setOverallPriorityTierCounts(overallData.priorityTierCounts || {});
            setOverallTotalItems(overallData.total || 0);
          }
        }).catch(err => {
          console.warn('[usePatchQueue] Error al obtener métricas globales:', err);
        });
      }
    } catch (err) {
      console.error('[usePatchQueue] Error al cargar la cola de parcheo:', err);
      setError(err.message || 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }, [
    getPatchQueueUseCase,
    selectedProjectId,
    page,
    limit,
    debouncedSearch,
    vendorSearch,
    hostnameSearch,
    environment,
    internetExposed,
    inContainer,
    priorityTier,
    patchAvailable,
    remediationKind,
    sortField,
    sortDirection
  ]);

  useEffect(() => {
    fetchPatchQueue();
  }, [fetchPatchQueue]);

  const goToPage = (targetPage) => {
    if (targetPage >= 1 && (totalPages === 0 || targetPage <= totalPages)) {
      setPage(targetPage);
    }
  };

  return {
    search,
    setSearch,
    filters: {
      search,
      vendorSearch,
      hostnameSearch,
      environment,
      internetExposed,
      inContainer,
      priorityTier,
      patchAvailable,
      remediationKind
    },
    updateFilter,
    removeFilter,
    clearAllFilters,
    sortField,
    sortDirection,
    handleSort,
    page,
    limit,
    totalPages,
    totalItems,
    priorityTierCounts,
    overallPriorityTierCounts,
    overallTotalItems,
    queue,
    loading,
    error,
    goToPage,
    refetch: fetchPatchQueue
  };
}

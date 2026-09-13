import { useState, useEffect, useCallback, useMemo } from 'react';
import { InfrastructureApiDataSource } from '../../data/datasources/InfrastructureApiDataSource';
import { InfrastructureRepositoryImpl } from '../../data/repositories/InfrastructureRepositoryImpl';

export function useInventory(selectedProjectId) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  
  // Filtros Avanzados por Columna
  const [categories, setCategories] = useState([]);
  const [ipSearch, setIpSearch] = useState('');
  const [vendorSearch, setVendorSearch] = useState('');
  const [environment, setEnvironment] = useState('ALL');
  const [internetExposed, setInternetExposed] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [execState, setExecState] = useState('ALL');
  const [riskTier, setRiskTier] = useState('ALL');

  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [page, setPage] = useState(1);
  const [limit] = useState(50);

  const [items, setItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedNode, setSelectedNode] = useState(null);

  // Instanciar repositorio (Clean Architecture)
  const repository = useMemo(() => {
    const apiDataSource = new InfrastructureApiDataSource();
    return new InfrastructureRepositoryImpl(apiDataSource);
  }, []);

  // Debounce para el campo de búsqueda (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Resetear a página 1 al cambiar de categoría principal
  const handleCategoryChange = (newCat) => {
    setCategory(newCat);
    setPage(1);
  };

  // Manejador genérico para cambiar filtros y volver a página 1
  const updateFilter = (key, val) => {
    setPage(1);
    switch (key) {
      case 'categories':
        setCategories(val);
        break;
      case 'ipSearch':
        setIpSearch(val);
        break;
      case 'vendorSearch':
        setVendorSearch(val);
        break;
      case 'environment':
        setEnvironment(val);
        break;
      case 'internetExposed':
        setInternetExposed(val);
        break;
      case 'status':
        setStatus(val);
        break;
      case 'execState':
        setExecState(val);
        break;
      case 'riskTier':
        setRiskTier(val);
        break;
      case 'search':
        setSearch(val);
        break;
      default:
        break;
    }
  };

  const removeFilter = (key, val) => {
    setPage(1);
    if (key === 'categories') {
      setCategories(prev => prev.filter(c => c !== val));
    } else {
      updateFilter(key, val);
    }
  };

  const clearAllFilters = () => {
    setPage(1);
    setSearch('');
    setCategories([]);
    setIpSearch('');
    setVendorSearch('');
    setEnvironment('ALL');
    setInternetExposed('ALL');
    setStatus('ALL');
    setExecState('ALL');
    setRiskTier('ALL');
  };

  // Manejar ordenación de columnas
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setPage(1);
  };

  // Cargar activos paginados desde el servidor
  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await repository.getPaginatedInventory({
        projectId: selectedProjectId,
        page,
        limit,
        category,
        categories,
        search: debouncedSearch,
        ipSearch,
        vendorSearch,
        environment,
        internetExposed,
        status,
        execState,
        riskTier,
        sortField,
        sortDirection
      });

      setItems(res.items || []);
      setTotalItems(res.totalItems || 0);
      setTotalPages(res.totalPages || 0);
      setCategoryCounts(res.categoryCounts || {});
    } catch (err) {
      console.error('[useInventory] Error cargando inventario paginado:', err);
      setError(err.message || 'Error al recuperar activos del servidor');
    } finally {
      setLoading(false);
    }
  }, [
    repository,
    selectedProjectId,
    page,
    limit,
    category,
    categories,
    debouncedSearch,
    ipSearch,
    vendorSearch,
    environment,
    internetExposed,
    status,
    execState,
    riskTier,
    sortField,
    sortDirection
  ]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Funciones de navegación entre páginas
  const goToPage = (targetPage) => {
    if (targetPage >= 1 && (totalPages === 0 || targetPage <= totalPages)) {
      setPage(targetPage);
    }
  };

  const prevPage = () => goToPage(page - 1);
  const nextPage = () => goToPage(page + 1);
  const firstPage = () => goToPage(1);
  const lastPage = () => goToPage(totalPages);

  return {
    search,
    setSearch,
    category,
    setCategory: handleCategoryChange,
    
    // Objeto de filtros avanzados
    filters: {
      search,
      categories,
      ipSearch,
      vendorSearch,
      environment,
      internetExposed,
      status,
      execState,
      riskTier
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
    categoryCounts,
    processedNodes: items,
    loading,
    error,
    selectedNode,
    setSelectedNode,
    goToPage,
    prevPage,
    nextPage,
    firstPage,
    lastPage,
    refetch: fetchInventory
  };
}

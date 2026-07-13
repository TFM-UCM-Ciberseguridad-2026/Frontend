import { useState, useEffect, useMemo } from 'react';
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

  // Contar nodos por tipo
  const getNodeCountByType = (type) => {
    return graphData.nodes.filter(n => n.labels.includes(type)).length;
  };

  return {
    showDashboard,
    setShowDashboard,
    clicks,
    setClicks,
    graphData,
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
    getNodeCountByType
  };
}

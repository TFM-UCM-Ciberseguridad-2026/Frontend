/**
 * Utilidades de Filtrado y Facetas Avanzadas para el Grafo de Infraestructura.
 * Proporciona evaluación unificada de filtros, cálculo dinámico de facetas y
 * cálculo de linaje topológico (ancestros y descendientes).
 */

/**
 * Calcula dinámicamente las facetas reales y contadores a partir de los nodos del proyecto.
 * Permite que los desplegables de filtros muestren solo opciones existentes con su cantidad real.
 */
export function getGraphFacets(nodes = []) {
  const envMap = {};
  const vendorMap = {};
  const statusMap = {};
  const networkMap = {};
  const riskMap = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  let exposedCount = 0;
  let internalCount = 0;
  let vulnerableCount = 0;

  nodes.forEach(n => {
    const props = n.properties || {};
    const primaryLabel = n.primaryLabel || n.labels?.[0] || '';

    // Ignorar el nodo raíz de Proyecto en las facetas de activos
    if (primaryLabel === 'Project' || n.labels?.includes('Project')) return;

    // 1. Entorno
    const env = (props.environment || props.entorno || props.env || '').trim();
    if (env) {
      const envKey = env.toLowerCase();
      envMap[envKey] = (envMap[envKey] || 0) + 1;
    }

    // 2. Proveedor / Vendor
    const vendor = (props.vendor || props.software_vendor || props.manufacturer || props.fabricante || props.provider || '').trim();
    if (vendor) {
      vendorMap[vendor] = (vendorMap[vendor] || 0) + 1;
    }

    // 3. Estado
    const st = (props.status || props.estado || props.state || '').trim();
    if (st) {
      const stKey = st.toLowerCase();
      statusMap[stKey] = (statusMap[stKey] || 0) + 1;
    }

    // 4. Riesgo
    const risk = (props.risk_tier || props.severity || props.riskTier || props.risk_level || props.risk || '').toUpperCase().trim();
    if (risk && riskMap[risk] !== undefined) {
      riskMap[risk]++;
    }

    // 5. Exposición a Internet
    const isExp = props.internet_exposed === true || props.internet_exposed === 'true' || n.internet_exposed === true || props.internetExposed === true || props.exposed === true;
    if (isExp) {
      exposedCount++;
    } else {
      internalCount++;
    }

    // 6. Activos con Vulnerabilidades / Hallazgos
    const hasVulns = (Array.isArray(props.findings) && props.findings.length > 0) ||
      Boolean(props.cve_id || props.cve || props.vulnerability_count > 0 || primaryLabel === 'Finding' || primaryLabel === 'Vulnerability');
    if (hasVulns) {
      vulnerableCount++;
    }

    // 7. Redes / Segmentos (para datalist de filtro)
    const isNetwork = primaryLabel === 'Network' || (n.labels || []).includes('Network') || (n.categoryId || '').toLowerCase() === 'red';
    if (isNetwork) {
      const netName = (n.name || props.name || props.nombre || '').trim();
      const netCidr = (props.cidr || props.rango || props.subnet || '').trim();
      const netKey = netName || netCidr;
      if (netKey) {
        networkMap[netKey] = { name: netName, cidr: netCidr };
      }
    }
  });

  // Convertir vendors a array ordenado por frecuencia
  const sortedVendors = Object.entries(vendorMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Convertir redes a array ordenado por nombre
  const sortedNetworks = Object.values(networkMap)
    .sort((a, b) => (a.name || a.cidr || '').localeCompare(b.name || b.cidr || ''));

  return {
    environments: envMap,
    vendors: sortedVendors,
    statuses: statusMap,
    riskTiers: riskMap,
    internetExposed: { exposed: exposedCount, internal: internalCount },
    vulnerableCount,
    networks: sortedNetworks
  };
}

/**
 * Función unificada para verificar si un nodo cumple con los filtros activos del grafo:
 * - Categoría (filterType)
 * - Búsqueda de texto (searchQuery)
 * - Filtros Avanzados (graphAdvancedFilters: IP, Vendor, Entorno, Exposición, Estado, Riesgo, Solo Vulnerables, En Ruta Explotación)
 */
export function isNodeMatchingGraphFilters(node, filterType = 'ALL', searchQuery = '', graphAdvancedFilters = {}) {
  const entity = node?.entity || node;
  if (!entity) return false;

  const primaryLabel = entity.primaryLabel || entity.labels?.[0] || '';
  const labels = entity.labels || [];
  const catId = (entity.categoryId || '').toLowerCase();
  const props = entity.properties || {};

  // El nodo Project principal se preserva siempre activo
  if (primaryLabel === 'Project' || labels.includes('Project') || catId === 'proyecto') {
    return true;
  }

  // A) Filtro por Categoría
  if (filterType && filterType !== 'ALL') {
    const fLower = filterType.toLowerCase();
    const matchesCat =
      primaryLabel === filterType ||
      labels.includes(filterType) ||
      catId === fLower;
    if (!matchesCat) return false;
  }

  // B) Búsqueda general por Texto
  if (searchQuery && searchQuery.trim() !== '') {
    const q = searchQuery.toLowerCase().trim();
    const name = String(entity.name || props.name || props.nombre || props.hostname || props.title || entity.id || '').toLowerCase();
    const cve = String(props.cve_id || props.cve || '').toLowerCase();
    const title = String(props.title || '').toLowerCase();
    const desc = String(props.description || '').toLowerCase();
    const ttps = Array.isArray(props.ttps) ? props.ttps.join(' ').toLowerCase() : String(props.ttps || '').toLowerCase();
    const nid = String(entity.id || '').toLowerCase();
    const matchesProps = Object.values(props).some(v => String(v).toLowerCase().includes(q));

    const matchesSearch = name.includes(q) || cve.includes(q) || title.includes(q) || desc.includes(q) || ttps.includes(q) || nid.includes(q) || matchesProps;
    if (!matchesSearch) return false;
  }

  // C) Filtros Avanzados
  if (graphAdvancedFilters) {
    // 1. IP / Subred (CIDR)
    if (graphAdvancedFilters.ipSearch && graphAdvancedFilters.ipSearch.trim() !== '') {
      const ipQ = graphAdvancedFilters.ipSearch.toLowerCase().trim();
      const rawIps = props.ips || props.ip_addresses || props.ipAddresses;
      const ips = Array.isArray(rawIps)
        ? rawIps
        : [props.ip, props.ip_address, props.ipAddress, props.address, props.public_ip, props.private_ip].filter(Boolean);
      const cidr = props.cidr || props.rango || props.subnet || '';
      const matchesIP = ips.some(ip => String(ip).toLowerCase().includes(ipQ)) || String(cidr).toLowerCase().includes(ipQ);
      if (!matchesIP) return false;
    }

    // 2. Vendor / Proveedor
    if (graphAdvancedFilters.vendorSearch && graphAdvancedFilters.vendorSearch.trim() !== '') {
      const vQ = graphAdvancedFilters.vendorSearch.toLowerCase().trim();
      const vendor = props.vendor || props.software_vendor || props.manufacturer || props.fabricante || props.vendorSearch || props.provider || '';
      if (!String(vendor).toLowerCase().includes(vQ)) return false;
    }

    // 3. Entorno
    if (graphAdvancedFilters.environment && graphAdvancedFilters.environment !== 'ALL') {
      const env = (props.environment || props.entorno || props.env || '').toLowerCase();
      if (env !== graphAdvancedFilters.environment.toLowerCase()) return false;
    }

    // 4. Exposición a Internet
    if (graphAdvancedFilters.internetExposed && graphAdvancedFilters.internetExposed !== 'ALL') {
      const isExp = props.internet_exposed === true || props.internet_exposed === 'true' || entity.internet_exposed === true || props.internetExposed === true || props.exposed === true;
      if (graphAdvancedFilters.internetExposed === 'TRUE' && !isExp) return false;
      if (graphAdvancedFilters.internetExposed === 'FALSE' && isExp) return false;
    }

    // 5. Estado de Ejecución
    if (graphAdvancedFilters.status && graphAdvancedFilters.status !== 'ALL') {
      const st = (props.status || props.estado || props.state || '').toLowerCase();
      if (st !== graphAdvancedFilters.status.toLowerCase()) return false;
    }

    // 6. Nivel de Riesgo
    if (graphAdvancedFilters.riskTier && graphAdvancedFilters.riskTier !== 'ALL') {
      const risk = (props.risk_tier || props.severity || props.riskTier || props.risk_level || props.risk || '').toUpperCase();
      if (risk !== graphAdvancedFilters.riskTier.toUpperCase()) return false;
    }

    // 7. Solo Activos Vulnerables
    if (graphAdvancedFilters.onlyVulnerable) {
      const hasVulns = (Array.isArray(props.findings) && props.findings.length > 0) ||
        Boolean(props.cve_id || props.cve || props.vulnerability_count > 0 || primaryLabel === 'Finding' || primaryLabel === 'Vulnerability');
      if (!hasVulns) return false;
    }

    // 8. En Ruta de Explotación
    if (graphAdvancedFilters.inExploitationPath) {
      const inPath = props.inExploitationPath === true || props.isPartOfPath === true || entity.inExploitationPath === true;
      if (!inPath) return false;
    }
    // 8. Red / Segmento de Red
    if (graphAdvancedFilters.networkSearch && graphAdvancedFilters.networkSearch.trim() !== '') {
      const netQ = graphAdvancedFilters.networkSearch.toLowerCase().trim();
      const isNetwork = primaryLabel === 'Network' || labels.includes('Network') || catId === 'red';
      if (isNetwork) {
        const netName = String(entity.name || props.name || props.nombre || '').toLowerCase();
        const netCidr = String(props.cidr || props.rango || props.subnet || '').toLowerCase();
        if (!netName.includes(netQ) && !netCidr.includes(netQ)) return false;
      } else {
        // Para nodos que no son redes: pasar (la propagación se maneja en lineageMaps)
        return false;
      }
    }
  }

  return true;
}

/**
 * Calcula los mapas de nodos con coincidencia directa y nodos de contexto (linaje estructural de ancestros/descendientes)
 * para otorgar opacidad graduada (1.0 directo, 0.6 linaje de contexto, 0.2 fuera de filtro).
 */
export function getGraphFilterLineageMaps(nodes = [], relationships = [], filterType = 'ALL', searchQuery = '', graphAdvancedFilters = {}) {
  const directMatches = new Set();
  const nodeByIdMap = new Map();

  nodes.forEach(n => {
    const nid = String(n.id);
    nodeByIdMap.set(nid, n);
    if (isNodeMatchingGraphFilters(n, filterType, searchQuery, graphAdvancedFilters)) {
      directMatches.add(nid);
    }
  });

  const hasActiveFilters = Boolean(
    (filterType && filterType !== 'ALL') ||
    (searchQuery && searchQuery.trim() !== '') ||
    (graphAdvancedFilters && Object.values(graphAdvancedFilters).some(v => v !== 'ALL' && v !== '' && v !== false))
  );

  // Propagación: cuando un nodo Network coincide con el filtro activo (por nombre, CIDR o filterType),
  // sus vecinos directos (Endpoints, Containers) también se marcan como directMatch para iluminarlos.
  if (hasActiveFilters && directMatches.size > 0) {
    const networkFilterActive = Boolean(
      (filterType && filterType !== 'ALL' && filterType.toLowerCase() === 'network') ||
      (graphAdvancedFilters?.networkSearch && graphAdvancedFilters.networkSearch.trim() !== '') ||
      (graphAdvancedFilters?.ipSearch && graphAdvancedFilters.ipSearch.trim() !== '')
    );

    if (networkFilterActive) {
      // Construir mapa de adyacencia para propagar
      const adjMap = new Map();
      relationships.forEach(r => {
        const sId = String(typeof r.source === 'object' ? r.source.id : r.source);
        const tId = String(typeof r.target === 'object' ? r.target.id : r.target);
        if (!adjMap.has(sId)) adjMap.set(sId, []);
        if (!adjMap.has(tId)) adjMap.set(tId, []);
        adjMap.get(sId).push(tId);
        adjMap.get(tId).push(sId);
      });

      const toAdd = new Set();
      directMatches.forEach(nid => {
        const node = nodeByIdMap.get(nid);
        if (!node) return;
        const label = node.primaryLabel || node.labels?.[0] || '';
        const isNet = label === 'Network' || (node.labels || []).includes('Network') || (node.categoryId || '').toLowerCase() === 'red';
        if (!isNet) return;

        // Añadir todos los vecinos conectados a esta red como directMatch
        const neighbors = adjMap.get(nid) || [];
        neighbors.forEach(neighborId => {
          if (!directMatches.has(neighborId)) {
            toAdd.add(neighborId);
          }
        });
      });

      toAdd.forEach(id => directMatches.add(id));
    }
  }

  const contextMatches = new Set();

  if (hasActiveFilters && graphAdvancedFilters.includeAncestors && directMatches.size > 0) {
    // Mapa de padres e hijos por relación
    const parentMap = new Map();
    const childMap = new Map();

    relationships.forEach(r => {
      const sId = String(typeof r.source === 'object' ? r.source.id : r.source);
      const tId = String(typeof r.target === 'object' ? r.target.id : r.target);

      if (!parentMap.has(tId)) parentMap.set(tId, []);
      parentMap.get(tId).push(sId);

      if (!childMap.has(sId)) childMap.set(sId, []);
      childMap.get(sId).push(tId);
    });

    directMatches.forEach(startId => {
      // 1. Recorrer ancestros hacia arriba
      const queue = [startId];
      const visited = new Set([startId]);

      while (queue.length > 0) {
        const curr = queue.shift();
        const parents = parentMap.get(curr) || [];
        parents.forEach(pId => {
          if (!visited.has(pId)) {
            visited.add(pId);
            if (!directMatches.has(pId)) {
              contextMatches.add(pId);
            }
            queue.push(pId);
          }
        });
      }

      // 2. Recorrer hijos directos hacia abajo (Findings/Vulnerabilidades)
      const children = childMap.get(startId) || [];
      children.forEach(cId => {
        if (!directMatches.has(cId)) {
          contextMatches.add(cId);
        }
      });
    });
  }

  return { directMatches, contextMatches, hasActiveFilters };
}

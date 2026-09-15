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
 * Verifica si un nodo pertenece a la categoría especificada por filterType.
 */
export function matchesCategory(node, filterType = 'ALL') {
  if (!filterType || filterType === 'ALL') return true;

  const entity = node?.entity || node;
  if (!entity) return false;

  const primaryLabel = entity.primaryLabel || entity.labels?.[0] || '';
  const labels = entity.labels || [];
  const catId = typeof entity.categoryId === 'string'
    ? entity.categoryId.toLowerCase()
    : (node.categoryId || '').toLowerCase();
  const fLower = filterType.toLowerCase();

  if (fLower === 'container') {
    // Solo Contenedores (excluyendo Imagen Contenedor)
    return (primaryLabel === 'Container' || labels.includes('Container') || catId === 'container') &&
      primaryLabel !== 'ContainerImage' && !labels.includes('ContainerImage');
  }
  if (fLower === 'containerimage') {
    // Solo Imágenes de Contenedor
    return primaryLabel === 'ContainerImage' || labels.includes('ContainerImage') || catId === 'containerimage';
  }
  if (fLower === 'software') {
    // Solo Software (excluyendo SoftwareInstallation)
    return (primaryLabel === 'Software' || labels.includes('Software') || catId === 'software') &&
      primaryLabel !== 'SoftwareInstallation' && !labels.includes('SoftwareInstallation');
  }
  if (fLower === 'softwareinstallation' || fLower === 'instalacion') {
    // Solo Instalaciones de Software
    return primaryLabel === 'SoftwareInstallation' || labels.includes('SoftwareInstallation') || catId === 'instalacion';
  }
  if (fLower === 'network' || fLower === 'red') {
    // Solo Redes
    return primaryLabel === 'Network' || labels.includes('Network') || catId === 'red';
  }
  if (fLower === 'endpoint') {
    return primaryLabel === 'Endpoint' || labels.includes('Endpoint') || catId === 'endpoint';
  }
  if (fLower === 'project' || fLower === 'proyecto') {
    return primaryLabel === 'Project' || labels.includes('Project') || catId === 'proyecto';
  }
  if (fLower === 'finding' || fLower === 'hallazgo') {
    return primaryLabel === 'Finding' || labels.includes('Finding') || catId === 'hallazgo';
  }
  if (fLower === 'hardware') {
    return primaryLabel === 'Hardware' || labels.includes('Hardware') || catId === 'hardware';
  }

  return primaryLabel === filterType || labels.includes(filterType) || catId === fLower;
}

/**
 * Convierte una dirección IPv4 en formato string a un número entero de 32 bits (unsigned).
 */
function ipToLong(ip) {
  if (!ip || typeof ip !== 'string') return null;
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return null;
  let num = 0;
  for (let i = 0; i < 4; i++) {
    const n = parseInt(parts[i], 10);
    if (isNaN(n) || n < 0 || n > 255) return null;
    num = (num << 8) + n;
  }
  return num >>> 0;
}

/**
 * Comprueba si una dirección IP cae dentro de una subred CIDR (ej. "10.30.0.4" en "10.30.0.0/24").
 */
export function isIpInCidr(ipStr, cidrStr) {
  if (!ipStr || !cidrStr) return false;
  const cleanIp = String(ipStr).trim();
  const cleanCidr = String(cidrStr).trim();

  if (!cleanCidr.includes('/')) return false;

  const [rangeIp, prefixLengthStr] = cleanCidr.split('/');
  const prefixLength = parseInt(prefixLengthStr, 10);
  if (isNaN(prefixLength) || prefixLength < 0 || prefixLength > 32) return false;

  const ipNum = ipToLong(cleanIp);
  const rangeNum = ipToLong(rangeIp);
  if (ipNum === null || rangeNum === null) return false;

  if (prefixLength === 0) return true;
  const mask = (0xFFFFFFFF << (32 - prefixLength)) >>> 0;
  return (ipNum & mask) === (rangeNum & mask);
}

/**
 * Extrae todas las direcciones IP en formato string de un objeto de propiedades,
 * contemplando arrays de strings, arrays de objetos { ip, vlan_id }, y campos escalares.
 */
export function extractIpStringsFromProps(props) {
  if (!props) return [];
  const result = [];

  const rawIps = props.ips || props.ip_addresses || props.ipAddresses;
  if (Array.isArray(rawIps)) {
    rawIps.forEach(item => {
      if (typeof item === 'string' && item.trim()) {
        result.push(item.trim());
      } else if (item && typeof item === 'object') {
        const str = item.ip || item.address || item.ip_address || item.ipAddress || '';
        if (typeof str === 'string' && str.trim()) {
          result.push(str.trim());
        }
      }
    });
  } else if (typeof rawIps === 'string' && rawIps.trim()) {
    result.push(rawIps.trim());
  }

  const scalarFields = [props.ip, props.ip_address, props.ipAddress, props.address, props.public_ip, props.private_ip];
  scalarFields.forEach(f => {
    if (typeof f === 'string' && f.trim() && !result.includes(f.trim())) {
      result.push(f.trim());
    } else if (f && typeof f === 'object') {
      const str = f.ip || f.address || f.ip_address || f.ipAddress || '';
      if (typeof str === 'string' && str.trim() && !result.includes(str.trim())) {
        result.push(str.trim());
      }
    }
  });

  return result;
}

/**
 * Verifica si un nodo cumple los criterios de búsqueda y filtros avanzados (sin la restricción de categoría).
 * Si skipNetworkCheck es true, omite la comprobación directa de ipSearch/networkSearch en las propiedades del nodo
 * (útil al evaluar vecinos conectados a una red que ya ha coincidido por IP/CIDR).
 */
export function matchesAdvancedCriteria(node, searchQuery = '', graphAdvancedFilters = {}, skipNetworkCheck = false) {
  const entity = node?.entity || node;
  if (!entity) return false;

  const primaryLabel = entity.primaryLabel || entity.labels?.[0] || '';
  const labels = entity.labels || [];
  const catId = typeof entity.categoryId === 'string'
    ? entity.categoryId.toLowerCase()
    : (node.categoryId || '').toLowerCase();
  const props = entity.properties || {};

  // Búsqueda general por Texto
  if (searchQuery && searchQuery.trim() !== '') {
    const q = searchQuery.toLowerCase().trim();
    const name = String(entity.name || props.name || props.nombre || props.hostname || props.title || entity.id || '').toLowerCase();
    const cve = String(props.cve_id || props.cve || '').toLowerCase();
    const title = String(props.title || '').toLowerCase();
    const desc = String(props.description || '').toLowerCase();
    const ttps = Array.isArray(props.ttps) ? props.ttps.join(' ').toLowerCase() : String(props.ttps || '').toLowerCase();
    const nid = String(entity.id || '').toLowerCase();

    const extractedIps = extractIpStringsFromProps(props);
    const matchesIPSearch = extractedIps.some(ip => ip.toLowerCase().includes(q));
    const matchesProps = Object.values(props).some(v => typeof v === 'string' || typeof v === 'number' ? String(v).toLowerCase().includes(q) : false);

    const matchesSearch = name.includes(q) || cve.includes(q) || title.includes(q) || desc.includes(q) || ttps.includes(q) || nid.includes(q) || matchesIPSearch || matchesProps;
    if (!matchesSearch) return false;
  }

  // Filtros Avanzados
  if (graphAdvancedFilters) {
    // 1. IP / Subred (CIDR)
    if (!skipNetworkCheck && graphAdvancedFilters.ipSearch && graphAdvancedFilters.ipSearch.trim() !== '') {
      const ipQ = graphAdvancedFilters.ipSearch.toLowerCase().trim();
      const extractedIps = extractIpStringsFromProps(props);
      const cidr = String(props.cidr || props.rango || props.subnet || '').toLowerCase().trim();

      // a) Coincidencia directa o parcial de IP en cualquier dirección del activo (ej. "10.30.0.4" o "10.30.0.")
      const matchesDirectIP = extractedIps.some(ip => ip.toLowerCase().includes(ipQ));

      // b) Inclusión Inversa: Si ipQ es una subred CIDR (ej. "10.30.0.0/24"), verificar si las IPs del activo caen dentro de ipQ
      const matchesReverseCIDRContainment = ipQ.includes('/') && extractedIps.some(ip => isIpInCidr(ip, ipQ));

      // c) Si el nodo es un nodo de Red (Network) y se busca su CIDR o una IP contenida en él
      const isNetwork = primaryLabel === 'Network' || labels.includes('Network') || catId === 'red';
      const matchesNetworkCIDR = isNetwork && cidr !== '' && (cidr.includes(ipQ) || isIpInCidr(ipQ, cidr));

      const matchesIP = matchesDirectIP || matchesReverseCIDRContainment || matchesNetworkCIDR;
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

    // 9. Red / Segmento de Red (Filtro avanzado)
    if (!skipNetworkCheck && graphAdvancedFilters.networkSearch && graphAdvancedFilters.networkSearch.trim() !== '') {
      const netQ = graphAdvancedFilters.networkSearch.toLowerCase().trim();
      const isNetwork = primaryLabel === 'Network' || labels.includes('Network') || catId === 'red';
      if (isNetwork) {
        const netName = String(entity.name || props.name || props.nombre || '').toLowerCase();
        const netCidr = String(props.cidr || props.rango || props.subnet || '').toLowerCase();
        if (!netName.includes(netQ) && !netCidr.includes(netQ)) return false;
      } else {
        return false;
      }
    }
  }

  return true;
}

/**
 * Función unificada para verificar si un nodo cumple con los filtros activos del grafo:
 * - Categoría (filterType)
 * - Búsqueda de texto (searchQuery)
 * - Filtros Avanzados (graphAdvancedFilters: IP, Vendor, Entorno, Exposición, Estado, Riesgo, Solo Vulnerables, En Ruta Explotación)
 */
export function isNodeMatchingGraphFilters(node, filterType = 'ALL', searchQuery = '', graphAdvancedFilters = {}) {
  // A) Comprobar Filtro de Categoría
  if (!matchesCategory(node, filterType)) return false;

  // B) Comprobar Criterios de Búsqueda y Filtros Avanzados
  if (!matchesAdvancedCriteria(node, searchQuery, graphAdvancedFilters)) return false;

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

  // Propagación forzada de vecinos de Red únicamente cuando se filtra por Segmento de Red (networkSearch)
  const advancedNetworkFilterActive = Boolean(
    graphAdvancedFilters?.networkSearch && graphAdvancedFilters.networkSearch.trim() !== ''
  );

  if (hasActiveFilters && advancedNetworkFilterActive) {
    const adjMap = new Map();
    relationships.forEach(r => {
      const sId = String(typeof r.source === 'object' ? r.source.id : r.source);
      const tId = String(typeof r.target === 'object' ? r.target.id : r.target);
      if (!adjMap.has(sId)) adjMap.set(sId, []);
      if (!adjMap.has(tId)) adjMap.set(tId, []);
      adjMap.get(sId).push(tId);
      adjMap.get(tId).push(sId);
    });

    nodes.forEach(n => {
      const nid = String(n.id);
      const label = n.primaryLabel || n.labels?.[0] || '';
      const isNet = label === 'Network' || (n.labels || []).includes('Network') || (n.categoryId || '').toLowerCase() === 'red';
      if (!isNet) return;

      // Verificar si la red coincide con la búsqueda de red/ip (omitiendo filtro de categoría en la red misma)
      if (matchesAdvancedCriteria(n, searchQuery, graphAdvancedFilters)) {
        // Si el filtro de categoría es 'ALL' o 'Network'/'red', la red misma es directMatch
        if (!filterType || filterType === 'ALL' || filterType.toLowerCase() === 'network' || filterType.toLowerCase() === 'red') {
          directMatches.add(nid);
        }

        // Propagar a los vecinos conectados
        const neighbors = adjMap.get(nid) || [];
        neighbors.forEach(neighborId => {
          const neighborNode = nodeByIdMap.get(neighborId);
          if (!neighborNode) return;

          // Excluir nodo Proyecto
          const nLabel = neighborNode.primaryLabel || neighborNode.labels?.[0] || '';
          const nCatId = (neighborNode.categoryId || '').toLowerCase();
          const isProject = nLabel === 'Project' || (neighborNode.labels || []).includes('Project') || nCatId === 'proyecto';
          if (isProject) return;

          // 1. Debe coincidir con la categoría seleccionada (si hay una activa)
          if (!matchesCategory(neighborNode, filterType)) return;

          // 2. Debe coincidir con los demás criterios avanzados (vendedores, entornos, vulnerables, etc.), omitiendo la comprobación directa de IP/Red en el vecino ya que le llega vía la Red
          if (!matchesAdvancedCriteria(neighborNode, searchQuery, graphAdvancedFilters, true)) return;

          directMatches.add(neighborId);
        });
      }
    });
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

/**
 * Índice de navegación sobre el grafo que devuelve /api/projects/{id}/export.
 *
 * El export llega como dos listas planas —nodos y relaciones, ambas con
 * identificadores internos de Neo4j— así que cualquier dato compuesto ("qué CVE,
 * en qué máquina, en qué software") exige recorrerlas. Este módulo hace ese
 * recorrido una sola vez y deja los caminos ya resueltos.
 *
 * Es la pieza que le faltaba al export anterior: sin joins, cada hoja solo podía
 * enseñar las propiedades sueltas de un nodo, y las columnas que necesitaban un
 * salto —el hardware de un endpoint, la versión de una instalación— quedaban en
 * blanco por fuerza.
 */

export function esLabel(nodo, label) {
  return nodo?.labels?.includes(label) || nodo?.primaryLabel === label;
}

export function indexarGrafo(grafo) {
  const nodos = grafo?.nodes || [];
  const relaciones = grafo?.relationships || [];

  const porId = new Map();
  const porEtiqueta = new Map();

  for (const n of nodos) {
    porId.set(n.id, n);
    const etiquetas = n.labels && n.labels.length > 0 ? n.labels : [n.primaryLabel].filter(Boolean);
    for (const et of etiquetas) {
      if (!porEtiqueta.has(et)) porEtiqueta.set(et, []);
      porEtiqueta.get(et).push(n);
    }
  }

  // salidas: tipo -> (idOrigen -> [nodosDestino]);  entradas: al revés.
  const salidas = new Map();
  const entradas = new Map();

  for (const r of relaciones) {
    if (!salidas.has(r.type)) salidas.set(r.type, new Map());
    if (!entradas.has(r.type)) entradas.set(r.type, new Map());

    const destino = porId.get(r.target);
    const origen = porId.get(r.source);

    if (destino) {
      const m = salidas.get(r.type);
      if (!m.has(r.source)) m.set(r.source, []);
      m.get(r.source).push(destino);
    }
    if (origen) {
      const m = entradas.get(r.type);
      if (!m.has(r.target)) m.set(r.target, []);
      m.get(r.target).push(origen);
    }
  }

  const idx = {
    nodos,
    relaciones,
    porId,

    /** Todos los nodos con una etiqueta. */
    de(etiqueta) {
      return porEtiqueta.get(etiqueta) || [];
    },

    /** Vecinos siguiendo una relación hacia delante. Acepta varios tipos. */
    hacia(nodo, ...tipos) {
      if (!nodo) return [];
      const out = [];
      for (const t of tipos) out.push(...(salidas.get(t)?.get(nodo.id) || []));
      return out;
    },

    /** Vecinos siguiendo una relación hacia atrás. */
    desde(nodo, ...tipos) {
      if (!nodo) return [];
      const out = [];
      for (const t of tipos) out.push(...(entradas.get(t)?.get(nodo.id) || []));
      return out;
    },

    /** Primer vecino, o null. Para relaciones que sabemos de cardinalidad 1. */
    uno(nodo, ...tipos) {
      return idx.hacia(nodo, ...tipos)[0] || null;
    },
    unoDesde(nodo, ...tipos) {
      return idx.desde(nodo, ...tipos)[0] || null;
    },
  };

  return idx;
}

/** Nombre legible de un nodo, sea cual sea su etiqueta. */
export function nombreDeNodo(nodo) {
  if (!nodo) return null;
  const p = nodo.properties || {};
  return p.hostname || p.name || p.nombre || p.cve_id || p.ttp_id || p.actor_id ||
         p.image_id || p.ip || p.modelo || p.capec_id || p.cwe_id || null;
}

/**
 * Localiza el activo que sostiene un Finding y devuelve su contexto completo:
 * la instalación o la imagen de la que cuelga, el contenedor si lo hay, y el
 * endpoint que está al final de la cadena.
 *
 * Los hallazgos llegan por cuatro caminos distintos según dónde se detectaran
 * (software del host, software del contenedor, imagen del contenedor, o
 * directamente sobre el endpoint), y todas las hojas necesitan resolverlos igual.
 */
export function contextoDeHallazgo(idx, hallazgo) {
  const soporte = idx.unoDesde(hallazgo, 'HAS_FINDING');
  const ctx = {
    instalacion: null,
    imagen: null,
    contenedor: null,
    endpoint: null,
    software: null,
  };
  if (!soporte) return ctx;

  if (esLabel(soporte, 'SoftwareInstallation')) {
    ctx.instalacion = soporte;
    ctx.software = idx.uno(soporte, 'INSTANCE_OF');
    const padre = idx.unoDesde(soporte, 'HAS_INSTALLATION');
    if (padre && esLabel(padre, 'Container')) {
      ctx.contenedor = padre;
      ctx.endpoint = idx.unoDesde(padre, 'HOSTS') || idx.unoDesde(padre, 'HAS_ENDPOINT');
    } else if (padre) {
      ctx.endpoint = padre;
    }
  } else if (esLabel(soporte, 'ContainerImage')) {
    ctx.imagen = soporte;
    ctx.contenedor = idx.unoDesde(soporte, 'USES_IMAGE');
    if (ctx.contenedor) {
      ctx.endpoint = idx.unoDesde(ctx.contenedor, 'HOSTS') || idx.unoDesde(ctx.contenedor, 'HAS_ENDPOINT');
    }
  } else if (esLabel(soporte, 'Container')) {
    ctx.contenedor = soporte;
    ctx.endpoint = idx.unoDesde(soporte, 'HOSTS') || idx.unoDesde(soporte, 'HAS_ENDPOINT');
  } else if (esLabel(soporte, 'Endpoint')) {
    ctx.endpoint = soporte;
  }

  return ctx;
}

/**
 * Resuelve la CVE de un hallazgo.
 *
 * Lo normal es seguir la arista (:Finding)-[:OF_VULNERABILITY]->(:Vulnerability),
 * pero una parte de los hallazgos no la tiene: en el proyecto de validación son
 * 261 de 751. No es que se desconozca la CVE —la clave del hallazgo la lleva
 * dentro, con la forma "<idActivo>|CVE-aaaa-nnnn"—, es que la relación no llegó a
 * escribirse. Recuperarla de la clave evita dejar en blanco un tercio de la hoja
 * de hallazgos por una arista que falta en el grafo.
 *
 * Devuelve también de dónde salió, para que la hoja pueda distinguir el dato
 * medido del derivado en lugar de presentarlos como si fueran lo mismo.
 */
export function cveDeHallazgo(idx, hallazgo, vulnPorCVE) {
  const directa = idx.uno(hallazgo, 'OF_VULNERABILITY');
  if (directa) return { nodo: directa, cveID: directa.properties?.cve_id || null, origen: 'Relación en el grafo' };

  const clave = hallazgo?.properties?.finding_key || hallazgo?.properties?.unique_ref || '';
  const m = /(CVE-\d{4}-\d+)/i.exec(String(clave));
  if (!m) return { nodo: null, cveID: null, origen: null };

  const cveID = m[1].toUpperCase();
  return { nodo: vulnPorCVE.get(cveID) || null, cveID, origen: 'Derivado de la clave del hallazgo' };
}

/** Índice cve_id -> nodo Vulnerability. */
export function vulnerabilidadesPorCVE(idx) {
  return new Map(idx.de('Vulnerability').map(v => [v.properties?.cve_id, v]).filter(([k]) => k));
}

/** IPs de un endpoint, con su VLAN cuando la tiene. */
export function ipsDeEndpoint(idx, endpoint) {
  return idx.hacia(endpoint, 'HAS_IP').map(ip => {
    const p = ip.properties || {};
    return p.vlan_id ? `${p.ip} (VLAN ${p.vlan_id})` : String(p.ip || '');
  }).filter(Boolean);
}

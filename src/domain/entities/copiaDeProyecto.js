/**
 * Prepara el contenido exportado de un proyecto para importarlo como un proyecto nuevo.
 *
 * Da ids nuevos a los activos del proyecto y conserva la identidad de los catálogos
 * compartidos (CVE, TTP, CWE…), reescribiendo las referencias de relaciones y findings para
 * que la copia no se fusione con el proyecto de origen. Modifica `dataToImport` en sitio.
 *
 * @param {object} dataToImport  Grafo exportado (nodes/relationships o graphData)
 * @param {string} nuevoNombre   Nombre del proyecto copia
 * @param {number} newProjId     Id del proyecto copia
 */
export function prepararCopiaDeProyecto(dataToImport, nuevoNombre, newProjId = Date.now()) {
  if (dataToImport.project) {
    dataToImport.project.name = nuevoNombre;
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
  const globalLabels = ['Vulnerability', 'ThreatActor', 'TTP', 'Mitigation', 'Software', 'CAPEC', 'CWE'];
  const isImage = (n) => n.labels?.includes('ContainerImage');
  // El marco de gobierno conserva sus ids (pol-1, PROC-01, role-1…): son los códigos que se
  // ven en pantalla y que citan los informes. No chocan con los del proyecto de origen
  // porque el backend los fusiona por id y proyecto, no solo por id.
  const governanceLabels = ['PolicyDocument', 'Procedure', 'Role', 'RACIActivity', 'SLAConfig'];
  const isGovernance = (n) => n.labels?.some(l => governanceLabels.includes(l));

  // Ids nuevos consecutivos a partir de una base común: con Date.now() + idx + un
  // aleatorio, dos nodos podían recibir el mismo id y la importación los fusionaba.
  const baseId = newProjId + 1;
  let nextOffset = 0;

  // Las imágenes se resuelven aparte, después de los contenedores: su id se deriva del
  // del contenedor. Se indexan antes de tocar ningún id.
  const imageByRef = new Map();
  const findingByRef = new Map();
  nodes.forEach((n) => {
    const index = isImage(n) ? imageByRef : n.labels?.includes('Finding') ? findingByRef : null;
    if (!index) return;
    index.set(String(n.id), n);
    if (n.properties?.id !== undefined && n.properties?.id !== null) {
      index.set(String(n.properties.id), n);
    }
  });

  nodes.forEach((n) => {
    const isGlobal = n.labels?.some(l => globalLabels.includes(l));

    if (!isGlobal && !isImage(n) && !isGovernance(n)) {
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
          n.properties.name = nuevoNombre;
        }
      }
    }
  });

  // Cada contenedor tiene su propia imagen, con id <container_id>_<imagen>. Antes la
  // copia conservaba el id de la imagen del original, así que sus contenedores se
  // enganchaban a ella y arrastraban sus CVE. Si en el fichero varios contenedores
  // comparten imagen, cada uno recibe su nodo: el primero se queda con el del fichero
  // y los demás con uno nuevo, sin metadatos de escaneo ni HAS_VULNERABILITY, que
  // llegarán cuando se escanee, y con los findings cuyo contenedor es el suyo.
  const imageRemap = new Map(); // `${contenedor antiguo}|${imagen antigua}` -> id nuevo
  // La relación HAS_FINDING manda: el finding que cuelga de una imagen lleva su id en
  // image_id y en finding_key, sea cual sea el que trajera el fichero.
  const findingImage = new Map(); // nodo de finding -> id de su imagen
  const findingsOf = (image, visit) => rels.forEach((r) => {
    if (r.type !== 'HAS_FINDING' || imageByRef.get(String(r.source)) !== image) return;
    const finding = findingByRef.get(String(r.target));
    if (finding) visit(r, finding);
  });
  const imageOwners = new Map(); // nodo de imagen -> [{ rel, newContainer }]
  rels.forEach((rel) => {
    if (rel.type !== 'USES_IMAGE') return;
    const image = imageByRef.get(String(rel.target));
    const oldContainer = String(rel.source);
    const newContainer = idMapping[oldContainer];
    if (!image || !newContainer || ambiguousRefs.has(oldContainer)) return;
    if (!imageOwners.has(image)) imageOwners.set(image, []);
    imageOwners.get(image).push({ rel, newContainer });
  });

  const clones = [];
  nodes.forEach((n) => {
    if (!isImage(n)) return;
    const p = n.properties || (n.properties = {});
    const oldNodeId = String(n.id);
    const oldPropId = p.id !== undefined && p.id !== null ? String(p.id) : oldNodeId;
    const imageName = String(p.image_id || p.name || '').trim();
    const owners = imageOwners.get(n) || [];

    // Sin contenedor en el fichero: id nuevo cualquiera, para que no se fusione con la
    // imagen del proyecto de origen.
    if (owners.length === 0 || !imageName) {
      const newId = String(baseId + nextOffset++);
      mapRef(oldNodeId, newId);
      mapRef(oldPropId, newId);
      p.id = newId;
      n.id = newId;
      return;
    }

    owners.forEach(({ rel, newContainer }, k) => {
      const newId = `${newContainer}_${imageName}`;
      // Los ids antiguos del contenedor con los que puede aparecer en sus findings.
      const containerRefs = Object.keys(idMapping).filter(ref => idMapping[ref] === newContainer);
      containerRefs.forEach(ref => imageRemap.set(`${ref}|${oldPropId}`, newId));

      if (k === 0) {
        mapRef(oldNodeId, newId);
        mapRef(oldPropId, newId);
        p.id = newId;
        n.id = newId;
        findingsOf(n, (_, finding) => findingImage.set(finding, newId));
        return;
      }

      const cloneProps = Object.fromEntries(
        Object.entries(p).filter(([key]) => !key.startsWith('vuln_scan_'))
      );
      cloneProps.id = newId;
      clones.push({ ...n, id: newId, labels: [...(n.labels || [])], properties: cloneProps });
      rel.target = newId;

      // Findings de la imagen compartida que son de este contenedor.
      findingsOf(n, (r, finding) => {
        const owner = finding.properties?.container_id;
        if (owner !== undefined && owner !== null && containerRefs.includes(String(owner))) {
          r.source = newId;
          findingImage.set(finding, newId);
        }
      });
    });
  });
  nodes.push(...clones);

  // Un finding se identifica por finding_key (activo|CVE, o contenedor|imagen|CVE en
  // los de imagen). Si la copia conservara la clave del activo original, la importación
  // la fusionaría con el finding del proyecto de origen. Se reescribe el activo con su
  // id nuevo; si no se puede remapear, se quita la clave para que la copia no pise al
  // original.
  nodes.forEach((n) => {
    if (!n.labels?.includes('Finding') || !n.properties) return;
    const p = n.properties;

    const ownImage = findingImage.get(n);
    if (p.container_id !== undefined && p.container_id !== null && p.image_id !== undefined && p.image_id !== null) {
      const newImage = ownImage || imageRemap.get(`${String(p.container_id)}|${String(p.image_id)}`);
      if (newImage) {
        p.image_id = newImage;
      }
    }

    if (typeof p.finding_key === 'string' && p.finding_key.split('|').length === 3) {
      const parts = p.finding_key.split('|');
      const newImage = ownImage || imageRemap.get(`${parts[0]}|${parts[1]}`);
      if (newImage) {
        parts[1] = newImage;
        p.finding_key = parts.join('|');
      }
    }

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

/**
 * Reglas del nombre de proyecto compartidas por los formularios que lo crean, lo renombran
 * o lo importan. El backend aplica el mismo criterio y es quien tiene la última palabra;
 * esto solo evita llegar hasta él con un nombre que ya se sabe repetido.
 */

/** Nombre normalizado para comparar: sin espacios alrededor y sin distinguir mayúsculas. */
export function normalizeProjectName(name) {
  return String(name ?? '').trim().toLowerCase();
}

/**
 * Proyecto de la lista que ya usa ese nombre, o null. `excludeId` deja fuera al propio
 * proyecto cuando se renombra.
 */
export function findProjectByName(projects, name, excludeId = null) {
  const key = normalizeProjectName(name);
  if (!key) return null;
  return (projects || []).find(p =>
    (excludeId === null || String(p.id) !== String(excludeId)) &&
    normalizeProjectName(p.name) === key
  ) || null;
}

/**
 * Nombre del proyecto declarado en un fichero exportado. Los ficheros anteriores a la
 * unificación del esquema lo guardan en `nombre` en lugar de `name`.
 */
export function projectNameFromExport(parsed) {
  const nodo = parsed?.nodes?.find(n => n.labels?.includes('Project') || n.primaryLabel === 'Project');
  return parsed?.project?.name || nodo?.properties?.name || nodo?.properties?.nombre || '';
}

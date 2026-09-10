/**
 * Validación y normalización de subredes en el cliente.
 *
 * Refleja las mismas reglas que aplica el backend (domain.ValidateAndNormalizeNetwork)
 * para poder avisar al usuario antes de enviar la petición. El backend sigue siendo la
 * autoridad: estas comprobaciones son una comodidad, no una barrera de seguridad.
 */

const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/** Convierte una IPv4 en su entero de 32 bits, o null si no es válida. */
export function ipv4ToInt(ip) {
  const match = IPV4_RE.exec((ip || '').trim());
  if (!match) return null;
  let result = 0;
  for (let i = 1; i <= 4; i++) {
    const octet = Number(match[i]);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) return null;
    result = result * 256 + octet;
  }
  return result;
}

/**
 * Normaliza un CIDR a su forma canónica de red: "10.0.1.37/24" -> "10.0.1.0/24".
 * Devuelve null si el CIDR no es válido.
 */
export function normalizeCidr(cidr) {
  const trimmed = (cidr || '').trim();
  const parts = trimmed.split('/');
  if (parts.length !== 2) return null;

  const base = ipv4ToInt(parts[0]);
  if (base === null) return null;

  const prefix = Number(parts[1]);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return null;

  // >>> 0 evita el desbordamiento a negativo de los operadores bit a bit de JS.
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = (base & mask) >>> 0;
  const octets = [network >>> 24, (network >>> 16) & 255, (network >>> 8) & 255, network & 255];
  return `${octets.join('.')}/${prefix}`;
}

/** Indica si una IP cae dentro de un CIDR ya validado. */
export function cidrContains(cidr, ip) {
  const normalized = normalizeCidr(cidr);
  const target = ipv4ToInt(ip);
  if (!normalized || target === null) return false;

  const [baseStr, prefixStr] = normalized.split('/');
  const base = ipv4ToInt(baseStr);
  const prefix = Number(prefixStr);
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return ((target & mask) >>> 0) === base;
}

/**
 * Devuelve el número de bits de host de un CIDR: cuantos menos, más específico es
 * (un /24 devuelve 8; un /16, 16). Null si el CIDR no es válido.
 *
 * Espejo de domain.CIDRSpecificity del backend. Se cuentan los bits de host y no el prefijo
 * porque es lo que expresa "el rango más pequeño", que es la regla de desempate cuando una
 * IP cae dentro de varias redes.
 */
export function cidrSpecificity(cidr) {
  const normalized = normalizeCidr(cidr);
  if (!normalized) return null;
  return 32 - Number(normalized.split('/')[1]);
}

/**
 * Indica si el rango `outer` abarca por completo al rango `inner`, y es estrictamente mayor
 * que él. Dos redes con el mismo CIDR no son padre e hija, son un duplicado.
 */
export function cidrContainsCidr(outer, inner) {
  const fuera = cidrSpecificity(outer);
  const dentro = cidrSpecificity(inner);
  if (fuera === null || dentro === null || fuera <= dentro) return false;
  return cidrContains(outer, normalizeCidr(inner).split('/')[0]);
}

/**
 * Busca, entre las redes ya existentes, cuál contendría a este CIDR (su futura red padre) y
 * cuáles quedarían dentro de él (sus futuras subredes).
 *
 * Sirve para avisar al usuario antes de guardar: al declarar una subred más específica
 * dentro de un rango que ya tenía activos, esos activos se reasignan a la subred nueva, y
 * conviene que no le parezca un cambio espontáneo.
 *
 * @returns {{padre: object|null, hijas: Array}}
 */
export function findSubnetRelations(cidr, existing = [], currentId = null) {
  const currentIdStr = currentId === null || currentId === undefined ? null : String(currentId);
  const otras = (existing || []).filter(
    n => currentIdStr === null || String(n?.id ?? '') !== currentIdStr
  );

  let padre = null;
  const hijas = [];

  for (const otra of otras) {
    const suCidr = otra?.cidr || otra?.properties?.cidr;
    if (!suCidr) continue;

    if (cidrContainsCidr(suCidr, cidr)) {
      // De entre todas las que lo contienen, la red padre es la más pequeña.
      if (padre === null || cidrSpecificity(suCidr) < cidrSpecificity(padre.cidr || padre.properties?.cidr)) {
        padre = otra;
      }
    } else if (cidrContainsCidr(cidr, suCidr)) {
      hijas.push(otra);
    }
  }

  return { padre, hijas };
}

/**
 * Mensaje de aviso (no de error: no bloquea el guardado) sobre las consecuencias de crear
 * esta red dentro de una jerarquía de subredes.
 *
 * Cubre las dos cosas que de otro modo serían reglas invisibles:
 *  - Que declarar una subred más específica se lleva los activos del rango padre.
 *  - Que la VLAN se compara exactamente y el 0 no es un comodín, así que una red padre
 *    solo capta las IPs que estén en su misma VLAN, tenga la que tenga.
 *
 * @returns {string|null}
 */
export function describeSubnetImpact(data, existing = [], currentId = null) {
  const cidr = normalizeCidr((data?.cidr || '').trim());
  if (!cidr) return null;

  const vlanRaw = data?.vlan_id;
  const vlan = vlanRaw === '' || vlanRaw === undefined || vlanRaw === null ? 0 : Number(vlanRaw);
  const { padre, hijas } = findSubnetRelations(cidr, existing, currentId);
  const avisos = [];

  if (padre) {
    const nombrePadre = padre.nombre || padre.name || padre.properties?.cidr || 'la red que la contiene';
    avisos.push(
      `${cidr} queda dentro de ${nombrePadre}. Los activos con una IP en este rango se reasignarán a esta subred, ` +
      `porque cuando una IP cae en varias redes gana siempre la más específica.`
    );
  }

  if (hijas.length > 0) {
    const nombres = hijas.map(h => h.nombre || h.name || h.cidr || h.properties?.cidr).join(', ');
    avisos.push(
      `${cidr} es una red padre: contiene a ${nombres}. Solo captará las IPs que no caigan en ninguna de sus subredes.`
    );
    avisos.push(
      vlan > 0
        ? `Ojo: esta red padre solo captará IPs declaradas en la VLAN ${vlan}. Las de otras VLANs no ` +
          `entrarán aunque su dirección caiga en el rango, y si tampoco encajan en una subred se quedarán sin red.`
        : `Ojo: la VLAN 0 no es un comodín, es la VLAN nativa. Esta red padre solo captará IPs sin VLAN; ` +
          `las etiquetadas necesitan una subred declarada en su misma VLAN o se quedarán sin red.`
    );
  }

  return avisos.length > 0 ? avisos.join(' ') : null;
}

/**
 * Valida los datos de una red y comprueba que no colisione con las ya existentes.
 *
 * @param {object} data          Datos del formulario (nombre, cidr, gateway, vlan_id).
 * @param {Array}  existing      Redes ya conocidas, con {id, nombre, cidr, vlan_id}.
 * @param {string} currentId     ID de la red que se está editando (para excluirse a sí misma).
 * @returns {string|null}        Mensaje de error, o null si todo es correcto.
 */
export function validateNetworkForm(data, existing = [], currentId = null) {
  const nombre = (data?.nombre || '').trim();
  if (!nombre) return 'El nombre de la red es obligatorio.';

  const rawCidr = (data?.cidr || '').trim();
  if (!rawCidr) return 'El CIDR de la red es obligatorio.';

  // Este validador solo entiende IPv4. Para IPv6 no bloqueamos: dejamos que decida el
  // backend (net.ParseCIDR sí lo soporta) en lugar de ser más estrictos que él.
  const isIPv6 = rawCidr.includes(':');
  const cidr = isIPv6 ? rawCidr : normalizeCidr(rawCidr);
  if (!cidr) return `El CIDR "${rawCidr}" no es válido (formato esperado: 10.0.1.0/24).`;

  const gateway = (data?.gateway || '').trim();
  if (!gateway) return 'La IP del gateway es obligatoria.';
  if (!isIPv6) {
    if (ipv4ToInt(gateway) === null) return `El gateway "${gateway}" no es una dirección IP válida.`;
    if (!cidrContains(cidr, gateway)) return `El gateway ${gateway} está fuera del rango ${cidr}.`;
    const gatewayError = checkGatewayIsUsableHost(cidr, gateway);
    if (gatewayError) return gatewayError;
  }

  const vlanRaw = data?.vlan_id;
  const vlan = vlanRaw === '' || vlanRaw === undefined || vlanRaw === null ? 0 : Number(vlanRaw);
  if (!Number.isInteger(vlan) || vlan < 0 || vlan > 4094) {
    return 'El VLAN ID debe ser un número entero entre 0 y 4094.';
  }

  const currentIdStr = currentId === null || currentId === undefined ? null : String(currentId);
  const others = (existing || []).filter(n => currentIdStr === null || String(n?.id ?? '') !== currentIdStr);

  const nameKey = nombre.toLowerCase();
  if (others.some(n => (n?.nombre || n?.name || '').trim().toLowerCase() === nameKey)) {
    return 'Ya existe una red con este nombre. Por favor, elige un nombre único.';
  }

  if (!isIPv6 && others.some(n => normalizeCidr(n?.cidr) === cidr)) {
    return `El rango ${cidr} ya está asignado a otra red. Por favor, elige un CIDR único.`;
  }

  if (vlan > 0 && others.some(n => Number(n?.vlan_id ?? n?.vlan ?? 0) === vlan)) {
    return 'El VLAN ID ya está asignado a otra red. Por favor, elige un VLAN ID único.';
  }

  return null;
}

/**
 * Comprueba que el gateway sea una IP asignable a un host: ni la dirección de red ni la de
 * broadcast del rango. Refleja checkGatewayIsUsableHost del backend, con la misma excepción
 * para /31 (RFC 3021) y /32, donde ambas direcciones sí son utilizables.
 *
 * @returns {string|null} Mensaje de error, o null si el gateway es válido.
 */
export function checkGatewayIsUsableHost(cidr, gateway) {
  const normalized = normalizeCidr(cidr);
  const target = ipv4ToInt(gateway);
  if (!normalized || target === null) return null;

  const [baseStr, prefixStr] = normalized.split('/');
  const prefix = Number(prefixStr);
  if (prefix >= 31) return null;

  const base = ipv4ToInt(baseStr);
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const broadcast = (base | (~mask >>> 0)) >>> 0;

  if (target === base) {
    return `El gateway ${gateway} es la dirección de red de ${normalized}, no una IP asignable a un host.`;
  }
  if (target === broadcast) {
    return `El gateway ${gateway} es la dirección de broadcast de ${normalized}, no una IP asignable a un host.`;
  }
  return null;
}

/**
 * Valida las IPs declaradas por un activo (endpoint o contenedor).
 *
 * Refleja domain.NormalizeAssetIPs del backend: formato válido, sin repeticiones dentro del
 * propio activo, y sin colisionar con otro activo del proyecto. Las filas vacías se ignoran,
 * porque el formulario permite añadir filas y dejarlas sin rellenar.
 *
 * @param {Array}  ips          Filas del formulario, {ip, vlan_id}.
 * @param {Array}  otrosActivos Activos ya existentes, con {id, name, ips:[{ip}]}.
 * @param {string} currentId    ID del activo que se edita, para excluirse a sí mismo.
 * @returns {string|null}       Mensaje de error, o null si todo es correcto.
 */
export function validateAssetIps(ips, otrosActivos = [], currentId = null) {
  const vistas = new Map();

  for (const fila of ips || []) {
    const raw = (fila?.ip || '').trim();
    if (!raw) continue;

    // Solo validamos formato IPv4; una IPv6 se deja pasar y decide el backend.
    if (!raw.includes(':') && ipv4ToInt(raw) === null) {
      return `"${raw}" no es una dirección IP válida.`;
    }
    if (vistas.has(raw)) {
      return `La dirección ${raw} está repetida en este activo.`;
    }
    vistas.set(raw, true);

    const vlanRaw = fila?.vlan_id;
    const vlan = vlanRaw === '' || vlanRaw === undefined || vlanRaw === null ? 0 : Number(vlanRaw);
    if (!Number.isInteger(vlan) || vlan < 0 || vlan > 4094) {
      return `El VLAN ID de la IP ${raw} debe ser un número entero entre 0 y 4094.`;
    }
  }

  if (vistas.size === 0) return null;

  const currentIdStr = currentId === null || currentId === undefined ? null : String(currentId);
  for (const activo of otrosActivos || []) {
    if (currentIdStr !== null && String(activo?.id ?? '') === currentIdStr) continue;

    for (const suya of activo?.ips || []) {
      const ip = (typeof suya === 'string' ? suya : suya?.ip || '').trim();
      if (ip && vistas.has(ip)) {
        const nombre = activo?.name || activo?.hostname || activo?.id;
        return `La dirección ${ip} ya está asignada a "${nombre}". Dos activos del mismo proyecto no pueden compartir IP.`;
      }
    }
  }

  return null;
}

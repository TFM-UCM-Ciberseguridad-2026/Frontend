/**
 * Tácticas de MITRE ATT&CK Enterprise y traducción de la cadena que devuelve el
 * backend a las claves internas de la matriz.
 *
 * Fuente única: antes esta traducción vivía duplicada en TtpsPage.jsx y en
 * reporting/reportData.js, y las dos copias ya habían divergido.
 *
 * Las tácticas están alineadas con ATT&CK v19, que es la versión del catálogo que
 * ingiere el backend. Dos cambios respecto de versiones anteriores:
 *
 *  - TA0005 se llama ahora **Stealth** (antes "Defense Evasion"), y el backend
 *    emite su nombre corto como `stealth`.
 *  - **TA0112 Defense Impairment** es una táctica NUEVA, con 56 técnicas propias
 *    que no comparte con TA0005.
 *
 * Faltaba la columna TA0112 y su nombre corto (`defense-impairment`) acababa
 * clasificado como TA0005 por una coincidencia de subcadena: la traducción se
 * hacía con `includes('defense')`. Por eso ahora el reconocimiento es por
 * coincidencia EXACTA de nombre corto o de identificador, y no por subcadena.
 */

export const TACTICS = [
  { key: 'reco', id: 'TA0043', label: 'Reconnaissance' },
  { key: 'resdev', id: 'TA0042', label: 'Resource Development' },
  { key: 'ia', id: 'TA0001', label: 'Initial Access' },
  { key: 'exec', id: 'TA0002', label: 'Execution' },
  { key: 'pers', id: 'TA0003', label: 'Persistence' },
  { key: 'pe', id: 'TA0004', label: 'Privilege Escalation' },
  { key: 'de', id: 'TA0005', label: 'Stealth' },
  { key: 'di', id: 'TA0112', label: 'Defense Impairment' },
  { key: 'ca', id: 'TA0006', label: 'Credential Access' },
  { key: 'disc', id: 'TA0007', label: 'Discovery' },
  { key: 'lm', id: 'TA0008', label: 'Lateral Movement' },
  { key: 'coll', id: 'TA0009', label: 'Collection' },
  { key: 'c2', id: 'TA0011', label: 'Command & Control' },
  { key: 'exfil', id: 'TA0010', label: 'Exfiltration' },
  { key: 'impact', id: 'TA0040', label: 'Impact' },
];

/**
 * Nombres cortos (`x_mitre_shortname`) tal y como los emite el backend, que los
 * toma literalmente de las fases de la cadena de ataque del bundle STIX.
 */
const POR_NOMBRE_CORTO = {
  reconnaissance: 'reco',
  'resource-development': 'resdev',
  'initial-access': 'ia',
  execution: 'exec',
  persistence: 'pers',
  'privilege-escalation': 'pe',
  stealth: 'de',
  'defense-impairment': 'di',
  'credential-access': 'ca',
  discovery: 'disc',
  'lateral-movement': 'lm',
  collection: 'coll',
  'command-and-control': 'c2',
  exfiltration: 'exfil',
  impact: 'impact',
};

/**
 * Nomenclatura de versiones anteriores de ATT&CK. Se conserva para que un grafo
 * poblado o importado antes de la v19 siga clasificándose bien; sin esto, esas
 * técnicas caerían todas en la columna por defecto.
 */
const ALIAS_HISTORICOS = {
  'defense-evasion': 'de',
  'defense evasion': 'de',
  'command and control': 'c2',
  'initial access': 'ia',
  'credential access': 'ca',
  'lateral movement': 'lm',
  'privilege escalation': 'pe',
  'resource development': 'resdev',
};

const POR_ID = Object.fromEntries(TACTICS.map(t => [t.id.toLowerCase(), t.key]));
const CLAVES = new Set(TACTICS.map(t => t.key));

/** Clave a la que van a parar las fases que no se reconocen. */
export const TACTICA_POR_DEFECTO = 'de';

/**
 * Traduce UNA fase de la cadena de ataque a su clave de táctica.
 *
 * El reconocimiento es exacto (nombre corto, identificador TAxxxx o clave
 * interna). La versión anterior encadenaba comprobaciones de subcadena, y eso
 * hacía que `defense-impairment` —una táctica distinta— se clasificara como
 * TA0005 solo porque contiene la palabra "defense".
 *
 * @returns {string} clave de táctica; TACTICA_POR_DEFECTO si no se reconoce.
 */
export const normalizeTacticKey = (tacticStr = '') => {
  const str = String(tacticStr).toLowerCase().trim();
  if (!str) return TACTICA_POR_DEFECTO;

  if (CLAVES.has(str)) return str;
  if (POR_NOMBRE_CORTO[str]) return POR_NOMBRE_CORTO[str];
  if (POR_ID[str]) return POR_ID[str];
  if (ALIAS_HISTORICOS[str]) return ALIAS_HISTORICOS[str];

  return TACTICA_POR_DEFECTO;
};

/**
 * Traduce la cadena COMPLETA que llega del backend a la lista de tácticas de la
 * técnica.
 *
 * El proveedor STIX une todas las fases de la cadena en un solo texto
 * (strings.Join(tactics, ", ")), así que T1078 llega como
 * "stealth, persistence, privilege-escalation, initial-access". Devolver un único
 * valor —la primera rama que casaba— colocaba cada técnica multitáctica en una
 * sola columna, elegida por el orden en que están escritos los `if`, y dejaba
 * columnas vacías respecto de la matriz oficial de MITRE.
 *
 * @returns {string[]} claves de táctica, sin repetir y en el orden de llegada.
 */
export const normalizeTacticKeys = (raw = '') => {
  const claves = String(raw)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(normalizeTacticKey)
    .filter((v, i, a) => v && a.indexOf(v) === i);

  return claves.length > 0 ? claves : [TACTICA_POR_DEFECTO];
};

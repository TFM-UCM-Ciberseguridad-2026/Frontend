/**
 * Tácticas de MITRE ATT&CK Enterprise y traducción de la cadena que devuelve el
 * backend a las claves internas de la matriz.
 *
 * Fuente única: antes esta traducción vivía duplicada en TtpsPage.jsx y en
 * reporting/reportData.js, y las dos copias ya habían divergido.
 */

export const TACTICS = [
  { key: 'reco', id: 'TA0043', label: 'Reconnaissance' },
  { key: 'resdev', id: 'TA0042', label: 'Resource Development' },
  { key: 'ia', id: 'TA0001', label: 'Initial Access' },
  { key: 'exec', id: 'TA0002', label: 'Execution' },
  { key: 'pers', id: 'TA0003', label: 'Persistence' },
  { key: 'pe', id: 'TA0004', label: 'Privilege Escalation' },
  { key: 'de', id: 'TA0005', label: 'Defense Evasion' },
  { key: 'ca', id: 'TA0006', label: 'Credential Access' },
  { key: 'disc', id: 'TA0007', label: 'Discovery' },
  { key: 'lm', id: 'TA0008', label: 'Lateral Movement' },
  { key: 'coll', id: 'TA0009', label: 'Collection' },
  { key: 'c2', id: 'TA0011', label: 'Command & Control' },
  { key: 'exfil', id: 'TA0010', label: 'Exfiltration' },
  { key: 'impact', id: 'TA0040', label: 'Impact' },
];

const CLAVES = TACTICS.map(t => t.key);

/** Traduce UNA fase de la cadena de ataque a su clave de táctica. */
export const normalizeTacticKey = (tacticStr = '') => {
  if (!tacticStr) return 'de';
  const str = String(tacticStr).toLowerCase().trim();

  if (CLAVES.includes(str)) return str;

  if (str.includes('recon') || str === 'ta0043') return 'reco';
  if (str.includes('resource') || str === 'ta0042') return 'resdev';
  if (str.includes('initial') || (str.includes('access') && !str.includes('cred')) || str === 'ta0001') return 'ia';
  if (str.includes('execution') || str === 'exec' || str === 'ta0002') return 'exec';
  if (str.includes('persist') || str === 'ta0003') return 'pers';
  if (str.includes('privilege') || str.includes('escalat') || str === 'ta0004') return 'pe';
  if (str.includes('defense') || str.includes('evasion') || str.includes('stealth') || str === 'ta0005') return 'de';
  if (str.includes('credential') || str === 'ta0006') return 'ca';
  if (str.includes('discovery') || str === 'ta0007') return 'disc';
  if (str.includes('lateral') || str.includes('movement') || str === 'ta0008') return 'lm';
  if (str.includes('collection') || str === 'ta0009') return 'coll';
  if (str.includes('command') || str.includes('control') || str === 'c2' || str === 'ta0011') return 'c2';
  if (str.includes('exfil') || str === 'ta0010') return 'exfil';
  if (str.includes('impact') || str === 'ta0040') return 'impact';

  return 'de';
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

  return claves.length > 0 ? claves : ['de'];
};

/**
 * Validación de componentes de hardware en el cliente.
 *
 * Refleja las reglas de domain.ValidateAndNormalizeHardware para avisar antes de enviar la
 * petición. El backend sigue siendo la autoridad; esto es una comodidad, no una barrera.
 */

// Vocabulario cerrado de arquitecturas. Debe coincidir con ValidArchitectures del backend.
export const ARQUITECTURAS = [
  { value: 'x86_64', label: 'x86_64 (Intel/AMD 64 bits)' },
  { value: 'arm64', label: 'arm64' },
  { value: 'aarch64', label: 'aarch64' },
  { value: 'ppc64le', label: 'ppc64le (POWER)' },
  { value: 'riscv64', label: 'riscv64' },
  { value: 's390x', label: 's390x (IBM Z)' },
  { value: 'otro', label: 'Otra' }
];

export const LIMITES = {
  cpuCores: 1024,
  ramGB: 65536,      // 64 TB
  storageGB: 1048576, // 1 PB
  texto: 120,
  serie: 100
};

/** Convierte el valor de un input numérico a entero, o null si está vacío o no es válido. */
function aEntero(valor) {
  if (valor === '' || valor === undefined || valor === null) return 0;
  const n = Number(valor);
  return Number.isInteger(n) ? n : null;
}

function validarMagnitud(etiqueta, valor, maximo) {
  const n = aEntero(valor);
  if (n === null) return `${etiqueta} debe ser un número entero.`;
  if (n <= 0) return `${etiqueta} debe ser mayor que 0.`;
  if (n > maximo) return `${etiqueta} no puede superar ${maximo.toLocaleString('es-ES')}.`;
  return null;
}

/**
 * Valida los datos de un componente de hardware.
 *
 * @param {object} data  Datos del formulario.
 * @returns {string|null} Mensaje de error, o null si todo es correcto.
 */
export function validateHardwareForm(data) {
  const fabricante = (data?.manufacturer || '').trim();
  const modelo = (data?.modelo || '').trim();

  if (!fabricante) {
    return 'El fabricante del componente de hardware es obligatorio.';
  }
  if (!modelo) {
    return 'El modelo del componente de hardware es obligatorio.';
  }
  if (fabricante.length > LIMITES.texto) {
    return `El fabricante no puede superar los ${LIMITES.texto} caracteres.`;
  }
  if (modelo.length > LIMITES.texto) {
    return `El modelo no puede superar los ${LIMITES.texto} caracteres.`;
  }
  if ((data?.serial_number || '').trim().length > LIMITES.serie) {
    return `El número de serie no puede superar los ${LIMITES.serie} caracteres.`;
  }

  const arq = (data?.tipo || '').trim().toLowerCase();
  if (arq && !ARQUITECTURAS.some(a => a.value === arq)) {
    return `La arquitectura "${data.tipo}" no es válida.`;
  }

  return validarMagnitud('El número de núcleos', data?.cpu, LIMITES.cpuCores)
    || validarMagnitud('La memoria RAM (GB)', data?.ram_gb, LIMITES.ramGB)
    || validarMagnitud('El almacenamiento (GB)', data?.storage_gb, LIMITES.storageGB);
}

/**
 * Traduce los valores heredados del campo CPU, que se guardaron como texto ("4 vCPU"),
 * al número de núcleos. Devuelve '' si no se puede deducir: preferimos el campo vacío a
 * un número inventado. Espeja domain.LegacyCPUCores del backend.
 */
export function legacyCpuCores(raw) {
  if (typeof raw === 'number') return Number.isInteger(raw) && raw > 0 ? raw : '';
  const match = /^\s*(\d+)/.exec(String(raw || ''));
  if (!match) return '';
  const cores = Number(match[1]);
  return cores > 0 && cores <= LIMITES.cpuCores ? cores : '';
}

/**
 * Prepara el payload de hardware para el backend: las magnitudes viajan como enteros
 * (el struct de Go las espera así) y 0 significa "sin dato". Los inputs de un formulario
 * siempre devuelven texto, así que sin esta conversión el JSON no decodifica.
 */
export function normalizeHardwarePayload(data) {
  const entero = (v) => {
    if (v === '' || v === undefined || v === null) return 0;
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : 0;
  };

  return {
    ...data,
    manufacturer: (data?.manufacturer || '').trim(),
    modelo: (data?.modelo || '').trim(),
    serial_number: (data?.serial_number || '').trim(),
    tipo: (data?.tipo || '').trim().toLowerCase(),
    cpu: entero(data?.cpu),
    ram_gb: entero(data?.ram_gb),
    storage_gb: entero(data?.storage_gb)
  };
}

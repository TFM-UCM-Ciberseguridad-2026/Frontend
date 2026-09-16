// Progreso del análisis de vulnerabilidades del proyecto.
//
// Reparto del porcentaje:
//   0-90   escaneo, un tramo igual por elemento (software o imagen)
//   90-95  recarga del grafo
//   95-100 cálculo de riesgos; el 100 solo se publica al terminar todo
//
// Mientras se espera la respuesta de una fase, la barra avanza de forma asintótica
// hacia el final de su tramo sin alcanzarlo nunca (como mucho CREEP_SHARE del tramo).
// Si la espera se alarga, el avance es imperceptible, así que a partir de
// STALL_AFTER_MS se marca `stalled` y la UI muestra los segundos de espera.

export const SCAN_END = 90;
export const GRAPH_END = 95;
export const CREEP_SHARE = 0.85;
export const CREEP_TAU_MS = 4000;
export const STALL_AFTER_MS = 8000;
export const TICK_MS = 250;
export const DONE_HOLD_MS = 600;
export const ERROR_HOLD_MS = 5000;

// phase: idle | scanning | graph | risk | done | error
// current: elemento en curso (1-based); completed: elementos terminados (con o sin error).
export const VULN_SCAN_IDLE = Object.freeze({
  phase: 'idle',
  current: 0,
  completed: 0,
  total: 0,
  failed: 0,
  percent: 0,
  statusText: '',
  waitingMs: 0,
  stalled: false,
  error: null
});

export function itemSlot(index, total) {
  const width = SCAN_END / total;
  return { start: index * width, end: (index + 1) * width };
}

export function creepPercent(start, end, elapsedMs) {
  const t = Math.max(0, elapsedMs);
  return start + (end - start) * CREEP_SHARE * (1 - Math.exp(-t / CREEP_TAU_MS));
}

// Seguimiento de un análisis: publica estados con porcentaje monótono y hace avanzar
// la fase en curso con un único temporizador.
export function createVulnScanTracker(total, publish, now = () => Date.now()) {
  let shown = { ...VULN_SCAN_IDLE, phase: 'scanning', total, statusText: 'Iniciando...' };
  let stage = { start: 0, end: 0, since: now() };
  let timer = null;

  const update = (patch) => {
    const next = { ...shown, ...patch };
    next.percent = Math.min(100, Math.max(shown.percent, next.percent));
    shown = next;
    publish(next);
  };

  const tick = () => {
    const waitingMs = now() - stage.since;
    const percent = creepPercent(stage.start, stage.end, waitingMs);
    const stalled = waitingMs >= STALL_AFTER_MS;
    // Solo se publica si cambia algo que la UI muestra (evita renders cada 250 ms).
    const samePercent = Math.floor(percent) <= Math.floor(shown.percent);
    const sameSecond = Math.floor(waitingMs / 1000) === Math.floor(shown.waitingMs / 1000);
    if (samePercent && stalled === shown.stalled && (!stalled || sameSecond)) return;
    update({ percent, waitingMs, stalled });
  };

  return {
    get state() { return shown; },
    start() {
      update({});
      timer = setInterval(tick, TICK_MS);
    },
    enterStage(start, end, patch = {}) {
      stage = { start, end, since: now() };
      update({ ...patch, percent: start, waitingMs: 0, stalled: false });
    },
    update,
    tick,
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    }
  };
}

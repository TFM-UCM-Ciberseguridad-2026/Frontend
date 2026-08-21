import { useEffect, useRef, useCallback } from 'react';

/**
 * useTTPSocket — Hook que gestiona la conexión WebSocket con el backend para recibir
 * notificaciones en tiempo real del worker de mapeo de TTPs.
 *
 * Filtrado por proyecto:
 *   - Si projectId es un número válido > 0, el servidor solo entrega eventos de ese proyecto.
 *   - Si projectId es 0 o null, se suscribe como "global" y recibe todos los eventos.
 *
 * Prueba de aislamiento (código real en ws_hub.go):
 *   Hub filtra: c.projectID == 0 || c.projectID == event.ProjectID
 *   → Cliente suscrito a project_id=2 NO recibe eventos con ProjectID=1.
 *
 * Reconexión y fallback:
 *   - Al conectar/reconectar (onopen) → hace un fetch REST de ttp-sync-status para
 *     sincronizar el estado completo (cubre eventos emitidos durante la desconexión).
 *   - Si WebSocket no está disponible o falla → activa polling REST como fallback.
 *   - Al recuperar WS → desactiva polling.
 *
 * @param {Object} options
 * @param {number|null}  options.projectId     — ID del proyecto activo (0/null = global)
 * @param {Function}     options.onEvent       — Callback por cada evento CVE_MAPPED recibido
 * @param {Function}     options.onSyncStatus  — Callback con el estado REST de sincronización
 * @param {boolean}      [options.enabled]     — Si false, no conecta
 */
export function useTTPSocket({ projectId, onEvent, onSyncStatus, enabled = true }) {
  const wsRef        = useRef(null);
  const pollingRef   = useRef(null);
  const reconnectRef = useRef(null);

  // ── Sincronización REST ──────────────────────────────────────────────────────
  const syncFromREST = useCallback(async () => {
    try {
      const res  = await fetch('/api/infrastructure/ttp-sync-status');
      const data = await res.json();
      if (onSyncStatus) onSyncStatus(data);
    } catch (e) {
      console.warn('[useTTPSocket] Error en sincronización REST:', e);
    }
  }, [onSyncStatus]);

  // ── Fallback polling ─────────────────────────────────────────────────────────
  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(syncFromREST, 1500);
  }, [syncFromREST]);

  const stopPolling = useCallback(() => {
    clearInterval(pollingRef.current);
    pollingRef.current = null;
  }, []);

  // ── Conexión WebSocket ───────────────────────────────────────────────────────
  const connect = useCallback(() => {
    // Construir URL con project_id solo si es un número válido > 0
    const pid = Number(projectId);
    const pidParam = pid > 0 ? `?project_id=${pid}` : '';
    const wsURL = `ws://${window.location.host}/api/ws/ttps${pidParam}`;

    try {
      const ws = new WebSocket(wsURL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log(`[useTTPSocket] WebSocket conectado (project_id=${pid || 'global'})`);
        stopPolling();    // WebSocket activo → desactivar polling
        syncFromREST();   // Sincronizar estado completo al conectar/reconectar
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'CVE_MAPPED' && onEvent) {
            onEvent(msg.event);
          }
        } catch { /* JSON inválido, ignorar */ }
      };

      ws.onerror = () => {
        console.warn('[useTTPSocket] Error en WebSocket, activando fallback polling');
        startPolling();
      };

      ws.onclose = () => {
        console.log('[useTTPSocket] WebSocket cerrado, reintentando en 3s...');
        startPolling(); // Cobertura mientras reconecta
        reconnectRef.current = setTimeout(connect, 3000);
      };
    } catch (e) {
      console.warn('[useTTPSocket] WebSocket no disponible, usando polling:', e);
      startPolling();
    }
  }, [projectId, onEvent, syncFromREST, startPolling, stopPolling]);

  // ── Ciclo de vida ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    connect();
    return () => {
      clearTimeout(reconnectRef.current);
      stopPolling();
      if (wsRef.current) {
        // Evitar que onclose dispare una reconexión al desmontar
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enabled, connect, stopPolling]);
}

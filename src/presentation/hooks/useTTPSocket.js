import { useEffect, useRef } from 'react';

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
  // Referencias mutables para los callbacks (evita ciclos de dependencias infinitos)
  const onEventRef = useRef(onEvent);
  const onSyncStatusRef = useRef(onSyncStatus);

  // Mantener las referencias siempre actualizadas con los callbacks más recientes en cada render
  useEffect(() => {
    onEventRef.current = onEvent;
    onSyncStatusRef.current = onSyncStatus;
  });

  // ── Ciclo de vida y Conexión ──────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    let isUnmounted = false;
    let ws = null;
    let pollingInterval = null;
    let reconnectTimeout = null;

    const stopPolling = () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    };

    const syncFromREST = async () => {
      if (isUnmounted) return;
      try {
        const pid = Number(projectId);
        const pidParam = pid > 0 ? `?project_id=${pid}` : '';
        const res = await fetch(`/api/infrastructure/ttp-sync-status${pidParam}`);
        const data = await res.json();
        
        if (!isUnmounted && onSyncStatusRef.current) {
          onSyncStatusRef.current(data);
        }
      } catch (e) {
        console.warn('[useTTPSocket] Error en sincronización REST:', e);
      }
    };

    const startPolling = () => {
      if (pollingInterval || isUnmounted) return;
      pollingInterval = setInterval(syncFromREST, 1500);
    };

    const connect = () => {
      if (isUnmounted) return;

      const pid = Number(projectId);
      const pidParam = pid > 0 ? `?project_id=${pid}` : '';
      const wsURL = `ws://${window.location.host}/api/ws/ttps${pidParam}`;

      try {
        ws = new WebSocket(wsURL);

        ws.onopen = () => {
          if (isUnmounted) return;
          console.log(`[useTTPSocket] WebSocket conectado (project_id=${pid || 'global'})`);
          stopPolling();    // WebSocket activo → desactivar polling
          syncFromREST();   // Sincronizar estado completo al conectar/reconectar
        };

        ws.onmessage = (e) => {
          if (isUnmounted) return;
          try {
            const msg = JSON.parse(e.data);
            if (msg.type === 'CVE_MAPPED' && onEventRef.current) {
              onEventRef.current(msg.event);
            }
          } catch { /* JSON inválido, ignorar */ }
        };

        ws.onerror = () => {
          if (isUnmounted) return;
          console.warn('[useTTPSocket] Error en WebSocket, activando fallback polling');
          startPolling();
        };

        ws.onclose = () => {
          if (isUnmounted) return;
          console.log('[useTTPSocket] WebSocket cerrado, reintentando en 3s...');
          startPolling(); // Cobertura mientras reconecta
          reconnectTimeout = setTimeout(connect, 3000);
        };
      } catch (e) {
        console.warn('[useTTPSocket] WebSocket no disponible, usando polling:', e);
        startPolling();
      }
    };

    // Iniciar conexión inicial
    connect();

    // Limpieza al desmontar o al cambiar las dependencias [projectId, enabled]
    return () => {
      isUnmounted = true;
      stopPolling();
      
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      
      if (ws) {
        ws.onclose = null; // Evitar reconexiones huérfanas
        ws.close();
      }
    };
  }, [projectId, enabled]);
}

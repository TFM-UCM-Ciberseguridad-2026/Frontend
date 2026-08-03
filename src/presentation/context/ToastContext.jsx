import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prevToasts) => prevToasts.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((options) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);

    let message = options.message || '';
    let title = options.title || null;
    let type = options.type || 'info'; // 'error' | 'success' | 'warning' | 'info'
    const duration = options.duration ?? 4500;

    // Helper: Formateo inteligente si el mensaje incluye NetworkError o prefijos conocidos
    if (typeof message === 'string') {
      if (!title && message.includes('NetworkError')) {
        title = 'Error de Conexión de Red';
      } else if (!title && type === 'error') {
        title = 'Error del Sistema';
      } else if (!title && type === 'success') {
        title = 'Operación Exitosa';
      }
    }

    const newToast = {
      id,
      type,
      title,
      message,
      duration
    };

    setToasts((prev) => [...prev, newToast]);

    return id;
  }, []);

  const showToast = useCallback((message, type = 'info', title = null, duration = 4500) => {
    return addToast({ message, type, title, duration });
  }, [addToast]);

  const error = useCallback((message, title = null, duration = 4500) => {
    return addToast({ message, type: 'error', title, duration });
  }, [addToast]);

  const success = useCallback((message, title = null, duration = 4500) => {
    return addToast({ message, type: 'success', title, duration });
  }, [addToast]);

  const warning = useCallback((message, title = null, duration = 4500) => {
    return addToast({ message, type: 'warning', title, duration });
  }, [addToast]);

  const info = useCallback((message, title = null, duration = 4500) => {
    return addToast({ message, type: 'info', title, duration });
  }, [addToast]);

  const toastHelpers = {
    showToast,
    error,
    success,
    warning,
    info,
    removeToast,
    toasts
  };

  return (
    <ToastContext.Provider value={toastHelpers}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe ser utilizado dentro de un ToastProvider');
  }
  return context;
}

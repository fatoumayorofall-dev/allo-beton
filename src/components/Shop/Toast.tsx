/**
 * ALLO BÉTON — Toast Provider unifié
 * Toasts empilables, accessibles, swipe-to-dismiss mobile.
 *
 * Usage :
 *   const { toast } = useToast();
 *   toast.success('Produit ajouté au panier');
 *   toast.error('Échec de la connexion', { description: '...' });
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  description?: string;
  duration?: number;          // ms; 0 = persistent
  action?: { label: string; onClick: () => void };
  id?: string;                // pour dédupliquer
}

interface ToastItem extends Required<Pick<ToastOptions, 'duration'>> {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  createdAt: number;
}

interface ToastContextValue {
  toast: {
    success: (title: string, opts?: ToastOptions) => string;
    error: (title: string, opts?: ToastOptions) => string;
    info: (title: string, opts?: ToastOptions) => string;
    warning: (title: string, opts?: ToastOptions) => string;
  };
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TYPE_CONFIG: Record<ToastType, { icon: React.ElementType; ring: string; iconBg: string; iconColor: string; barColor: string }> = {
  success: { icon: CheckCircle, ring: 'ring-emerald-100', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', barColor: 'bg-emerald-500' },
  error:   { icon: XCircle,     ring: 'ring-red-100',     iconBg: 'bg-red-50',     iconColor: 'text-red-600',     barColor: 'bg-red-500' },
  info:    { icon: Info,        ring: 'ring-blue-100',    iconBg: 'bg-blue-50',    iconColor: 'text-blue-600',    barColor: 'bg-blue-500' },
  warning: { icon: AlertTriangle, ring: 'ring-amber-100', iconBg: 'bg-amber-50',   iconColor: 'text-amber-600',   barColor: 'bg-amber-500' },
};

const DEFAULT_DURATION = 4000;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const tm = timersRef.current.get(id);
    if (tm) {
      window.clearTimeout(tm);
      timersRef.current.delete(id);
    }
  }, []);

  const dismissAll = useCallback(() => {
    timersRef.current.forEach(t => window.clearTimeout(t));
    timersRef.current.clear();
    setToasts([]);
  }, []);

  const push = useCallback((type: ToastType, title: string, opts?: ToastOptions): string => {
    const id = opts?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const duration = opts?.duration ?? DEFAULT_DURATION;
    setToasts(prev => {
      const filtered = prev.filter(t => t.id !== id);
      const next: ToastItem = {
        id, type, title,
        description: opts?.description,
        action: opts?.action,
        duration,
        createdAt: Date.now(),
      };
      // max 4 toasts visibles
      const trimmed = [...filtered, next].slice(-4);
      return trimmed;
    });
    if (duration > 0) {
      const tm = window.setTimeout(() => dismiss(id), duration);
      timersRef.current.set(id, tm);
    }
    return id;
  }, [dismiss]);

  useEffect(() => () => {
    timersRef.current.forEach(t => window.clearTimeout(t));
    timersRef.current.clear();
  }, []);

  const value: ToastContextValue = {
    toast: {
      success: (title, opts) => push('success', title, opts),
      error:   (title, opts) => push('error',   title, opts),
      info:    (title, opts) => push('info',    title, opts),
      warning: (title, opts) => push('warning', title, opts),
    },
    dismiss,
    dismissAll,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

/* ──────────────────────────────────────────────── */
/*  Viewport                                        */
/* ──────────────────────────────────────────────── */
const ToastViewport: React.FC<{ toasts: ToastItem[]; onDismiss: (id: string) => void }> = ({ toasts, onDismiss }) => {
  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Notifications"
      className="fixed z-[100] pointer-events-none flex flex-col gap-2 px-4 sm:px-0
                 bottom-4 left-0 right-0 sm:bottom-6 sm:right-6 sm:left-auto sm:max-w-sm"
    >
      {toasts.map(t => (
        <ToastCard key={t.id} item={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
};

/* ──────────────────────────────────────────────── */
/*  Toast card (with swipe-to-dismiss on mobile)    */
/* ──────────────────────────────────────────────── */
const ToastCard: React.FC<{ item: ToastItem; onDismiss: () => void }> = ({ item, onDismiss }) => {
  const cfg = TYPE_CONFIG[item.type];
  const Icon = cfg.icon;
  const [enter, setEnter] = useState(false);
  const [drag, setDrag] = useState(0);
  const startX = useRef<number | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setEnter(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current == null) return;
    setDrag(e.clientX - startX.current);
  };
  const onPointerUp = () => {
    if (Math.abs(drag) > 80) onDismiss();
    else setDrag(0);
    startX.current = null;
  };

  const progress = item.duration > 0
    ? Math.max(0, 1 - (Date.now() - item.createdAt) / item.duration)
    : 1;

  return (
    <div
      role="status"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        transform: `translateX(${drag}px) translateY(${enter ? 0 : 16}px)`,
        opacity: enter ? Math.max(0.2, 1 - Math.abs(drag) / 200) : 0,
        transition: drag === 0 ? 'transform 280ms cubic-bezier(.22,1,.36,1), opacity 200ms' : 'none',
      }}
      className={`pointer-events-auto relative overflow-hidden bg-white rounded-2xl shadow-[0_12px_36px_-8px_rgba(0,0,0,0.18)] ring-1 ${cfg.ring} ring-inset border border-gray-100 flex items-start gap-3 p-3.5 pr-9 select-none touch-pan-y cursor-grab active:cursor-grabbing`}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 w-9 h-9 ${cfg.iconBg} rounded-xl flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-gray-900 leading-snug">{item.title}</p>
        {item.description && (
          <p className="text-[12px] text-gray-500 leading-snug mt-0.5">{item.description}</p>
        )}
        {item.action && (
          <button
            onClick={item.action.onClick}
            className="mt-2 text-[12px] font-bold text-orange-700 hover:text-orange-800 underline-offset-2 hover:underline"
          >
            {item.action.label}
          </button>
        )}
      </div>

      {/* Close */}
      <button
        onClick={onDismiss}
        aria-label="Fermer"
        className="absolute top-2 right-2 w-6 h-6 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Progress bar */}
      {item.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-100">
          <div
            className={`h-full ${cfg.barColor} origin-left`}
            style={{
              animation: `toast-shrink ${item.duration}ms linear forwards`,
              transform: `scaleX(${progress})`,
            }}
          />
        </div>
      )}
    </div>
  );
};

/* CSS keyframes injectées une fois */
if (typeof document !== 'undefined' && !document.getElementById('allo-toast-css')) {
  const style = document.createElement('style');
  style.id = 'allo-toast-css';
  style.textContent = `
    @keyframes toast-shrink { from { transform: scaleX(1); } to { transform: scaleX(0); } }
  `;
  document.head.appendChild(style);
}

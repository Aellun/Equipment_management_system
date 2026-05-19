"use client";

import { createContext, useContext, useState, useCallback } from "react";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
}

interface ToastContextType {
  toast: {
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
  };
}

const ToastContext = createContext<ToastContextType>({
  toast: { success: () => {}, error: () => {}, warning: () => {}, info: () => {} },
});

export function useToast() {
  return useContext(ToastContext);
}

const toastConfig = {
  success: {
    borderColor: "border-l-emerald-500",
    iconColor: "text-emerald-500",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  error: {
    borderColor: "border-l-red-500",
    iconColor: "text-red-500",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  warning: {
    borderColor: "border-l-amber-500",
    iconColor: "text-amber-500",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  info: {
    borderColor: "border-l-blue-500",
    iconColor: "text-blue-500",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, title?: string) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev.slice(-4), { id, type, message, title }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss]
  );

  const toast = {
    success: (msg: string, title?: string) => addToast("success", msg, title),
    error: (msg: string, title?: string) => addToast("error", msg, title),
    warning: (msg: string, title?: string) => addToast("warning", msg, title),
    info: (msg: string, title?: string) => addToast("info", msg, title),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-[200] flex flex-col gap-2.5 w-80 pointer-events-none"
      >
        {toasts.map((t) => {
          const cfg = toastConfig[t.type];
          return (
            <div
              key={t.id}
              className={`bg-white border border-slate-200 border-l-4 ${cfg.borderColor} rounded-xl shadow-lg shadow-slate-200/60 p-4 flex gap-3 items-start animate-slideToast pointer-events-auto`}
            >
              <span className={`shrink-0 mt-0.5 ${cfg.iconColor}`}>{cfg.icon}</span>
              <div className="flex-1 min-w-0">
                {t.title && (
                  <p className="text-sm font-semibold text-slate-800 mb-0.5">{t.title}</p>
                )}
                <p className="text-sm text-slate-600 leading-snug">{t.message}</p>
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 text-slate-300 hover:text-slate-500 transition-colors mt-0.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

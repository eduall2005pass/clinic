"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: number;
  type: ToastType;
  message: string;
};

type ToastContextValue = {
  showToast: (type: ToastType, message: string) => void;
};

const AdminToastContext = createContext<ToastContextValue | null>(null);

const STYLES: Record<ToastType, string> = {
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 admin-dark:text-emerald-400",
  error: "border-red-500/30 bg-red-500/10 text-red-600 admin-dark:text-red-400",
  info: "border-sky-500/30 bg-sky-500/10 text-sky-600 admin-dark:text-sky-400",
};

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <path d="M20 6 9 17l-5-5" />,
  error: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </>
  ),
};

export function useAdminToast(): ToastContextValue {
  const context = useContext(AdminToastContext);
  if (!context) {
    return { showToast: () => {} };
  }
  return context;
}

export default function AdminToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <AdminToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[90] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg shadow-black/10 backdrop-blur animate-fade-up ${STYLES[toast.type]}`}
          >
            <svg
              className="mt-0.5 h-4 w-4 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
            >
              {ICONS[toast.type]}
            </svg>
            <span className="min-w-0 flex-1">{toast.message}</span>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() =>
                setToasts((prev) => prev.filter((item) => item.id !== toast.id))
              }
              className="shrink-0 opacity-60 transition hover:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </AdminToastContext.Provider>
  );
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";
import type { ActionResult } from "@/lib/types";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: number;
  success: boolean;
  message: string;
  action?: ToastAction;
}

type PushOptions = { action?: ToastAction };

const ToastContext = createContext<{
  push: (result: ActionResult, options?: PushOptions) => void;
} | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

let nextToastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (result: ActionResult, options?: PushOptions) => {
      if (!result) return;
      const id = nextToastId++;
      setToasts((prev) => [...prev, { ...result, id, action: options?.action }]);
      setTimeout(() => dismiss(id), options?.action ? 6000 : 3500);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg ${
              toast.success ? "bg-green-600" : "bg-red-600"
            }`}
          >
            {toast.success ? (
              <CheckCircle2 className="h-4 w-4 flex-none" />
            ) : (
              <XCircle className="h-4 w-4 flex-none" />
            )}
            {toast.message}
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  dismiss(toast.id);
                }}
                className="ml-1 flex-none underline decoration-white/60 underline-offset-2 hover:decoration-white"
              >
                {toast.action.label}
              </button>
            )}
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="ml-1 flex-none opacity-80 hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

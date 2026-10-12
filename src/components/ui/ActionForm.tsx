"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useToast } from "./ToastProvider";
import { useOnlineStatus } from "./OnlineStatusProvider";
import type { ActionResult } from "@/lib/types";

type Action = (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;

export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  confirmMessage,
  onResult,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  confirmMessage?: string;
  onResult?: (result: ActionResult) => void;
}) {
  const [state, formAction] = useActionState<ActionResult, FormData>(
    action,
    undefined,
  );
  const { push } = useToast();
  const isOnline = useOnlineStatus();
  const formRef = useRef<HTMLFormElement>(null);
  const lastHandled = useRef<ActionResult>(undefined);

  useEffect(() => {
    if (state && state !== lastHandled.current) {
      lastHandled.current = state;
      push(state);
      if (state.success && resetOnSuccess) formRef.current?.reset();
      onResult?.(state);
    }
  }, [state, push, resetOnSuccess, onResult]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (!isOnline) {
          e.preventDefault();
          push({
            success: false,
            message: "You're offline. Try again once you're reconnected.",
          });
          return;
        }
        if (confirmMessage && !window.confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      {children}
    </form>
  );
}

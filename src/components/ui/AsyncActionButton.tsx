"use client";

import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "./Button";
import { useToast } from "./ToastProvider";
import { useOnlineStatus } from "./OnlineStatusProvider";
import type { ActionResult } from "@/lib/types";

export function AsyncActionButton<TArgs>({
  action,
  actionArgs,
  children,
  variant,
  size,
  confirmMessage,
}: {
  action: (args: TArgs) => Promise<ActionResult>;
  actionArgs: TArgs;
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  confirmMessage?: string;
}) {
  const [pending, setPending] = useState(false);
  const { push } = useToast();
  const isOnline = useOnlineStatus();

  const handleClick = async () => {
    if (!isOnline) {
      push({
        success: false,
        message: "You're offline. Try again once you're reconnected.",
      });
      return;
    }
    if (confirmMessage && !window.confirm(confirmMessage)) return;

    setPending(true);
    const result = await action(actionArgs);
    setPending(false);
    push(result);
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={pending}
      onClick={handleClick}
    >
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </Button>
  );
}

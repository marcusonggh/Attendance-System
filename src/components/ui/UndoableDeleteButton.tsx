"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useToast } from "./ToastProvider";
import { useOnlineStatus } from "./OnlineStatusProvider";
import type { ActionResult } from "@/lib/types";

export function UndoableDeleteButton<TSnapshot, TArgs>({
  icon,
  className,
  ariaLabel,
  confirmMessage,
  deleteArgs,
  onDelete,
  onRestore,
}: {
  icon: ReactNode;
  className: string;
  ariaLabel: string;
  confirmMessage: string;
  deleteArgs: TArgs;
  onDelete: (
    args: TArgs,
  ) => Promise<
    { success: true; message: string; snapshot: TSnapshot } | { success: false; message: string }
  >;
  onRestore: (snapshot: TSnapshot) => Promise<ActionResult>;
}) {
  const [pending, setPending] = useState(false);
  const { push } = useToast();
  const isOnline = useOnlineStatus();
  const router = useRouter();

  const handleClick = async () => {
    if (!isOnline) {
      push({
        success: false,
        message: "You're offline. Try again once you're reconnected.",
      });
      return;
    }
    if (!window.confirm(confirmMessage)) return;

    setPending(true);
    const result = await onDelete(deleteArgs);
    setPending(false);

    push(
      { success: result.success, message: result.message },
      result.success
        ? {
            action: {
              label: "Undo",
              onClick: async () => {
                const restoreResult = await onRestore(result.snapshot);
                push(restoreResult);
                router.refresh();
              },
            },
          }
        : undefined,
    );
    if (result.success) router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label={ariaLabel}
      className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
    </button>
  );
}

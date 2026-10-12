"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

export function StatusSubmitButton({
  value,
  active,
  activeClassName,
  inactiveClassName,
  icon,
  children,
}: {
  value: string;
  active: boolean;
  activeClassName: string;
  inactiveClassName: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  const { pending, data } = useFormStatus();
  const isThisPending = pending && data?.get("status") === value;

  return (
    <button
      type="submit"
      name="status"
      value={value}
      disabled={pending}
      className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed ${
        active ? activeClassName : inactiveClassName
      } ${pending && !isThisPending ? "opacity-60" : ""}`}
    >
      {isThisPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}

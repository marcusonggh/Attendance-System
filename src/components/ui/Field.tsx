import type { ReactNode } from "react";

export const inputClass =
  "rounded-md border border-zinc-300 bg-transparent px-2.5 py-1.5 text-sm shadow-sm focus:border-teal-600 focus:outline-2 focus:outline-offset-1 focus:outline-teal-600/40 dark:border-zinc-700";

export function Field({
  label,
  htmlFor,
  className = "",
  children,
}: {
  label: string;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

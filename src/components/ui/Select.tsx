import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { selectClass } from "./Field";

// Native select arrows sit flush against the border on narrow controls
// (hour/minute pickers especially) no matter how much right padding the
// select itself gets, since the browser draws the arrow in its own fixed
// area. Hiding the native arrow and drawing our own gives control over the
// gap between the arrow and the edge.
export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className = "", ...props }, ref) => {
  return (
    <span className={`relative inline-block ${className}`}>
      <select
        ref={ref}
        className={`w-full appearance-none ${selectClass}`}
        {...props}
      />
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
    </span>
  );
});
Select.displayName = "Select";

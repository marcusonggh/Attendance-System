"use client";

import { useState } from "react";
import { NotebookPen } from "lucide-react";
import { ActionForm } from "@/components/ui/ActionForm";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import { updateSessionNotes } from "./actions";

export function SessionNotes({
  sessionId,
  initialNotes,
}: {
  sessionId: string;
  initialNotes: string | null;
}) {
  const [open, setOpen] = useState(!!initialNotes);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-teal-700 hover:text-teal-800 dark:text-teal-400"
      >
        <NotebookPen className="h-3.5 w-3.5" />
        Add note
      </button>
    );
  }

  return (
    <ActionForm action={updateSessionNotes} className="space-y-1.5">
      <input type="hidden" name="session_id" value={sessionId} />
      <textarea
        name="notes"
        defaultValue={initialNotes ?? ""}
        rows={2}
        placeholder="What was covered, homework assigned, etc."
        className={`w-full resize-none ${inputClass}`}
      />
      <Button type="submit" variant="secondary" size="sm">
        Save note
      </Button>
    </ActionForm>
  );
}

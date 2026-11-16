"use client";

import { ActionForm } from "@/components/ui/ActionForm";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import { updateSessionNotes } from "./actions";

// Visibility is controlled by the caller (only rendered while the session
// is marked present) — no collapse toggle here, just the field.
export function SessionNotes({
  sessionId,
  initialNotes,
}: {
  sessionId: string;
  initialNotes: string | null;
}) {
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

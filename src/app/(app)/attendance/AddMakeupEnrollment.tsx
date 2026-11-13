"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { ActionForm } from "@/components/ui/ActionForm";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { subjectLabel } from "@/lib/rateCard";
import { DURATION_OPTIONS, HOUR_OPTIONS, MINUTE_OPTIONS } from "@/lib/types";
import type { Enrollment, Student } from "@/lib/types";
import { addMakeupSession } from "./actions";

export function AddMakeupEnrollment({
  date,
  enrollments,
  studentNameById,
}: {
  date: string;
  enrollments: Enrollment[];
  studentNameById: Map<string, Student["name"]>;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-zinc-300 py-1.5 text-xs text-zinc-400 hover:border-teal-400 hover:text-teal-600"
      >
        <Plus className="h-3.5 w-3.5" />
        Add make-up
      </button>
    );
  }

  return (
    <ActionForm
      action={addMakeupSession}
      className="space-y-1.5 rounded-md border border-zinc-200 bg-white p-2"
      onResult={(result) => {
        if (result?.success) setOpen(false);
      }}
    >
      <input type="hidden" name="date" value={date} />
      <Select name="enrollment_id" required className="w-full text-xs">
        <option value="">Select enrollment</option>
        {enrollments.map((e) => (
          <option key={e.id} value={e.id}>
            {studentNameById.get(e.student_id) ?? "Unknown"} ·{" "}
            {subjectLabel(e.subject)}
          </option>
        ))}
      </Select>
      <div className="flex gap-1">
        <Select name="hour" defaultValue="15" required className="text-xs">
          {HOUR_OPTIONS.map((h) => (
            <option key={h.value} value={h.value}>
              {h.label}
            </option>
          ))}
        </Select>
        <Select name="minute" defaultValue="00" required className="text-xs">
          {MINUTE_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
        <Select name="duration" defaultValue="1" required className="flex-1 text-xs">
          {DURATION_OPTIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex gap-1">
        <Button type="submit" size="sm" className="flex-1">
          Add
        </Button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex items-center justify-center rounded-md border border-zinc-300 px-2 text-zinc-500 hover:bg-zinc-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </ActionForm>
  );
}

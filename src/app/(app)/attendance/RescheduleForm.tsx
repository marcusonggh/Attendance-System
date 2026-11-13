"use client";

import { useState } from "react";
import { Plus, X, CalendarClock } from "lucide-react";
import { ActionForm } from "@/components/ui/ActionForm";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { DURATION_OPTIONS, HOUR_OPTIONS, MINUTE_OPTIONS, type DurationHours } from "@/lib/types";
import { rescheduleSession } from "./actions";

type Part = { date: string; hour: string; minute: string; duration: DurationHours };

export function RescheduleForm({
  enrollmentId,
  fromDate,
  defaultHour,
  defaultMinute,
  originalDuration,
}: {
  enrollmentId: string;
  fromDate: string;
  defaultHour: string;
  defaultMinute: string;
  originalDuration: DurationHours;
}) {
  const [parts, setParts] = useState<Part[]>([
    { date: "", hour: defaultHour, minute: defaultMinute, duration: originalDuration },
  ]);

  const total = parts.reduce((sum, p) => sum + Number(p.duration), 0);
  const mismatched = parts.length > 1 && total !== Number(originalDuration);

  function updatePart(index: number, patch: Partial<Part>) {
    setParts((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function addPart() {
    setParts((prev) => [
      ...prev,
      { date: "", hour: defaultHour, minute: defaultMinute, duration: 0.5 },
    ]);
  }

  function removePart(index: number) {
    setParts((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <ActionForm
      action={rescheduleSession}
      className="space-y-2 border-t border-zinc-100 pt-2 dark:border-zinc-800"
    >
      <input type="hidden" name="enrollment_id" value={enrollmentId} />
      <input type="hidden" name="from_date" value={fromDate} />

      <div className="space-y-2">
        {parts.map((part, i) => (
          <div key={i} className="flex flex-wrap items-end gap-1.5">
            <Field
              label={i === 0 ? "Reschedule to" : "Also reschedule to"}
              className="flex-1 basis-32"
            >
              <input
                type="date"
                name="to_date"
                required
                value={part.date}
                onChange={(e) => updatePart(i, { date: e.target.value })}
                className={`w-full ${inputClass}`}
              />
            </Field>
            <select
              name="to_hour"
              required
              value={part.hour}
              onChange={(e) => updatePart(i, { hour: e.target.value })}
              className={`${inputClass}`}
            >
              {HOUR_OPTIONS.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </select>
            <select
              name="to_minute"
              required
              value={part.minute}
              onChange={(e) => updatePart(i, { minute: e.target.value })}
              className={`${inputClass}`}
            >
              {MINUTE_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <select
              name="to_duration"
              required
              value={part.duration}
              onChange={(e) =>
                updatePart(i, { duration: Number(e.target.value) as DurationHours })
              }
              className={`${inputClass}`}
            >
              {DURATION_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
            {parts.length > 1 && (
              <button
                type="button"
                onClick={() => removePart(i)}
                aria-label="Remove date"
                className="flex h-8 w-8 flex-none items-center justify-center rounded-md border border-zinc-300 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={addPart}
          className="flex items-center gap-1 text-xs text-teal-700 hover:text-teal-800 dark:text-teal-400"
        >
          <Plus className="h-3.5 w-3.5" />
          Split into another date
        </button>
        {parts.length > 1 && (
          <p className={`text-xs ${mismatched ? "text-amber-600" : "text-zinc-500"}`}>
            Total: {total}hr{total === 1 ? "" : "s"} · original class was{" "}
            {originalDuration}hr{Number(originalDuration) === 1 ? "" : "s"}
          </p>
        )}
      </div>

      <Button type="submit" variant="secondary" size="sm">
        <CalendarClock className="h-3.5 w-3.5" />
        Reschedule
      </Button>
    </ActionForm>
  );
}

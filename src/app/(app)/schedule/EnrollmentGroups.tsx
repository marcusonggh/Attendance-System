"use client";

import { useMemo, useState } from "react";
import { Search, Trash2 } from "lucide-react";
import {
  DURATION_OPTIONS,
  SUBJECTS,
  WEEKDAY_LABELS,
  type Enrollment,
} from "@/lib/types";
import { subjectLabel } from "@/lib/rateCard";
import {
  updateEnrollment,
  toggleEnrollmentActive,
  deleteEnrollmentWithUndo,
  restoreEnrollment,
} from "./actions";
import { StartTimeFields } from "./StartTimeFields";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, inputClass } from "@/components/ui/Field";
import { ActionForm } from "@/components/ui/ActionForm";
import { Select } from "@/components/ui/Select";
import { UndoableDeleteButton } from "@/components/ui/UndoableDeleteButton";

const fieldGridClass = "grid grid-cols-2 gap-3 sm:grid-cols-4";

type Group = {
  studentId: string;
  studentName: string;
  items: Enrollment[];
};

export function EnrollmentGroups({ groups }: { groups: Group[] }) {
  const [query, setQuery] = useState("");
  const [day, setDay] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups
      .filter((g) => !q || g.studentName.toLowerCase().includes(q))
      .map((g) =>
        day === ""
          ? g
          : { ...g, items: g.items.filter((e) => String(e.day_of_week) === day) },
      )
      .filter((g) => g.items.length > 0);
  }, [groups, query, day]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students..."
            className={`w-full pl-8 ${inputClass}`}
          />
        </div>
        <Select value={day} onChange={(e) => setDay(e.target.value)}>
          <option value="">All days</option>
          {WEEKDAY_LABELS.map((label, i) => (
            <option key={i} value={i}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      {filtered.map((group) => (
        <Card key={group.studentId} className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold tracking-tight">{group.studentName}</h3>
            <Badge tone="accent">
              {group.items.length} class{group.items.length === 1 ? "" : "es"}
            </Badge>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {group.items.map((enrollment, i) => (
              <div key={enrollment.id} className={i === 0 ? "space-y-4" : "space-y-4 pt-4"}>
                <ActionForm action={updateEnrollment} className="space-y-4">
                  <input type="hidden" name="id" value={enrollment.id} />
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      {subjectLabel(enrollment.subject)} ·{" "}
                      {WEEKDAY_LABELS[enrollment.day_of_week]}
                    </span>
                    <Badge tone={enrollment.active ? "success" : "neutral"}>
                      {enrollment.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className={fieldGridClass}>
                    <Field label="Subject">
                      <Select name="subject" defaultValue={enrollment.subject} required>
                        {SUBJECTS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Level">
                      <Select name="level" defaultValue={enrollment.level} required>
                        <option value="preschool">Preschool</option>
                        <option value="primary">Primary</option>
                      </Select>
                    </Field>
                    <Field label="Group size">
                      <Select name="group_size" defaultValue={String(enrollment.group_size)}>
                        <option value="1">1:1</option>
                        <option value="2">1:2</option>
                      </Select>
                    </Field>
                    <Field label="Day">
                      <Select
                        name="day_of_week"
                        defaultValue={enrollment.day_of_week}
                        required
                      >
                        {WEEKDAY_LABELS.map((label, day) => (
                          <option key={day} value={day}>
                            {label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <StartTimeFields
                      defaultHour={enrollment.start_time.slice(0, 2)}
                      defaultMinute={enrollment.start_time.slice(3, 5)}
                    />
                    <Field label="Duration">
                      <Select
                        name="duration_hours"
                        defaultValue={String(enrollment.duration_hours)}
                        required
                      >
                        {DURATION_OPTIONS.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Start date">
                      <input
                        type="date"
                        name="start_date"
                        defaultValue={enrollment.start_date}
                        required
                        className={inputClass}
                      />
                    </Field>
                    <Field label="End date (optional)">
                      <input
                        type="date"
                        name="end_date"
                        defaultValue={enrollment.end_date ?? ""}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Location" className="col-span-2">
                      <input
                        name="location"
                        defaultValue={enrollment.location}
                        className={`w-full ${inputClass}`}
                      />
                    </Field>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" variant="secondary" size="sm">
                      Save
                    </Button>
                  </div>
                </ActionForm>

                <div className="flex items-center justify-end gap-2">
                  <ActionForm action={toggleEnrollmentActive}>
                    <input type="hidden" name="id" value={enrollment.id} />
                    <input type="hidden" name="active" value={String(enrollment.active)} />
                    <Button
                      type="submit"
                      variant={enrollment.active ? "danger" : "secondary"}
                      size="sm"
                    >
                      {enrollment.active ? "Deactivate" : "Activate"}
                    </Button>
                  </ActionForm>
                  <UndoableDeleteButton
                    deleteArgs={enrollment.id}
                    onDelete={deleteEnrollmentWithUndo}
                    onRestore={restoreEnrollment}
                    confirmMessage="Delete this enrollment? Its session and invoice history will be deleted too. This can't be undone."
                    ariaLabel="Delete enrollment"
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 text-zinc-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                    icon={<Trash2 className="h-4 w-4" />}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
      {filtered.length === 0 && groups.length > 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No classes match the current filters.
        </p>
      )}
      {groups.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No enrollments yet.
        </p>
      )}
    </div>
  );
}

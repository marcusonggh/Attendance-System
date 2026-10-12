"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import Link from "next/link";
import type { Level, RateCard, Student, StudentRate, Enrollment } from "@/lib/types";
import { formatDayTime, getRate, groupSizeLabel, subjectLabel } from "@/lib/rateCard";
import { updateStudent, toggleActive, saveStudentRate } from "./actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, inputClass } from "@/components/ui/Field";
import { ActionForm } from "@/components/ui/ActionForm";

const ALL_TIERS: { level: Level; groupSize: 1 | 2 }[] = [
  { level: "preschool", groupSize: 1 },
  { level: "preschool", groupSize: 2 },
  { level: "primary", groupSize: 1 },
  { level: "primary", groupSize: 2 },
];

export function StudentList({
  students,
  enrollments,
  rateCard,
  studentRates,
}: {
  students: Student[];
  enrollments: Enrollment[];
  rateCard: RateCard[];
  studentRates: StudentRate[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.parent_contact ?? "").toLowerCase().includes(q),
    );
  }, [students, query]);

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search students..."
          className={`w-full pl-8 ${inputClass}`}
        />
      </div>

      <div className="space-y-3">
        {filtered.map((student) => (
          <Card key={student.id} className={student.active ? "" : "opacity-60"}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <ActionForm
                action={updateStudent}
                className="flex flex-wrap items-end gap-3"
              >
                <input type="hidden" name="id" value={student.id} />
                <Field label="Name">
                  <input
                    name="name"
                    defaultValue={student.name}
                    required
                    className={inputClass}
                  />
                </Field>
                <Field label="Parent name">
                  <input
                    name="parent_name"
                    defaultValue={student.parent_name ?? ""}
                    className={inputClass}
                  />
                </Field>
                <Field label="Parent contact">
                  <input
                    name="parent_contact"
                    defaultValue={student.parent_contact ?? ""}
                    className={inputClass}
                  />
                </Field>
                <Badge tone={student.active ? "success" : "neutral"}>
                  {student.active ? "Active" : "Inactive"}
                </Badge>
                <Button type="submit" variant="secondary" size="sm">
                  Save
                </Button>
              </ActionForm>
              <ActionForm action={toggleActive}>
                <input type="hidden" name="id" value={student.id} />
                <input type="hidden" name="active" value={String(student.active)} />
                <Button
                  type="submit"
                  variant={student.active ? "danger" : "secondary"}
                  size="sm"
                >
                  {student.active ? "Deactivate" : "Activate"}
                </Button>
              </ActionForm>
            </div>

            <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Rates
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {ALL_TIERS.map(({ level, groupSize }) => {
                  const override = studentRates.find(
                    (r) =>
                      r.student_id === student.id &&
                      r.level === level &&
                      r.group_size === groupSize,
                  );
                  const defaultRate = getRate(rateCard, level, groupSize);
                  return (
                    <ActionForm
                      key={`${level}-${groupSize}`}
                      action={saveStudentRate}
                      className="flex items-end gap-1.5"
                    >
                      <input type="hidden" name="student_id" value={student.id} />
                      <input type="hidden" name="level" value={level} />
                      <input type="hidden" name="group_size" value={groupSize} />
                      <Field
                        label={`${level === "preschool" ? "Preschool" : "Primary"} ${groupSizeLabel(groupSize)}`}
                        className="flex-1"
                      >
                        <input
                          name="rate"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={`RM${defaultRate}`}
                          defaultValue={override?.rate ?? ""}
                          className={`w-full ${inputClass}`}
                        />
                      </Field>
                      <Button type="submit" variant="secondary" size="sm">
                        Save
                      </Button>
                    </ActionForm>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Enrollments
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {enrollments
                  .filter((e) => e.student_id === student.id)
                  .map((e) => (
                    <Badge key={e.id} tone={e.active ? "accent" : "neutral"}>
                      {groupSizeLabel(e.group_size)} {subjectLabel(e.subject)} ·{" "}
                      {formatDayTime(e)}
                      {e.location ? ` · ${e.location}` : ""}
                    </Badge>
                  ))}
                <Link
                  href="/schedule"
                  className="text-xs text-teal-700 underline hover:text-teal-800 dark:text-teal-400"
                >
                  Manage schedule
                </Link>
              </div>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && students.length > 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No students match &quot;{query}&quot;.
          </p>
        )}
        {students.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No students yet.
          </p>
        )}
      </div>
    </div>
  );
}

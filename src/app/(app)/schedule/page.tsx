import { format } from "date-fns";
import { CalendarPlus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  DURATION_OPTIONS,
  HOUR_OPTIONS,
  MINUTE_OPTIONS,
  SUBJECTS,
  WEEKDAY_LABELS,
  type Enrollment,
  type Student,
} from "@/lib/types";
import { subjectLabel } from "@/lib/rateCard";
import {
  addEnrollment,
  updateEnrollment,
  toggleEnrollmentActive,
  deleteEnrollmentWithUndo,
  restoreEnrollment,
} from "./actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, inputClass } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { ActionForm } from "@/components/ui/ActionForm";
import { UndoableDeleteButton } from "@/components/ui/UndoableDeleteButton";

const fieldGridClass = "grid grid-cols-2 gap-3 sm:grid-cols-4";

function StartTimeFields({
  defaultHour,
  defaultMinute,
}: {
  defaultHour?: string;
  defaultMinute?: string;
}) {
  return (
    <Field label="Start time">
      <div className="flex gap-1.5">
        <select
          name="start_time_hour"
          defaultValue={defaultHour}
          required
          className={`flex-1 ${inputClass}`}
        >
          {HOUR_OPTIONS.map((h) => (
            <option key={h.value} value={h.value}>
              {h.label}
            </option>
          ))}
        </select>
        <select
          name="start_time_minute"
          defaultValue={defaultMinute}
          required
          className={`flex-1 ${inputClass}`}
        >
          {MINUTE_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
    </Field>
  );
}

export default async function SchedulePage() {
  const supabase = await createClient();
  const [{ data: studentsData }, { data: enrollmentData }] = await Promise.all([
    supabase.from("students").select("*").eq("active", true).order("name"),
    supabase.from("enrollments").select("*").order("day_of_week"),
  ]);

  const students = (studentsData ?? []) as Student[];
  const enrollments = (enrollmentData ?? []) as Enrollment[];
  const studentNameById = new Map(students.map((s) => [s.id, s.name]));
  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Group enrollments by student so a student with several classes shows
  // as one card with each class as a row, instead of repeating separate
  // cards with the same name at the top of each.
  const studentIds = Array.from(new Set(enrollments.map((e) => e.student_id)));
  studentIds.sort((a, b) =>
    (studentNameById.get(a) ?? "").localeCompare(studentNameById.get(b) ?? ""),
  );
  const groups = studentIds.map((id) => ({
    studentId: id,
    studentName: studentNameById.get(id) ?? "Unknown",
    items: enrollments.filter((e) => e.student_id === id),
  }));

  return (
    <div className="space-y-10">
      <div>
        <PageHeader
          title="Enrollments"
          description="Each row is one student's weekly class for one subject."
        />

        <Card className="mb-4">
          <ActionForm action={addEnrollment} resetOnSuccess className="space-y-4">
            <div className={fieldGridClass}>
              <Field label="Student">
                <select name="student_id" required className={inputClass}>
                  <option value="">Select student</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Subject">
                <select name="subject" required className={inputClass}>
                  {SUBJECTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Level">
                <select name="level" required className={inputClass}>
                  <option value="preschool">Preschool</option>
                  <option value="primary">Primary</option>
                </select>
              </Field>
              <Field label="Group size">
                <select name="group_size" className={inputClass}>
                  <option value="1">1:1</option>
                  <option value="2">1:2</option>
                </select>
              </Field>
              <Field label="Day">
                <select name="day_of_week" required className={inputClass}>
                  {WEEKDAY_LABELS.map((label, day) => (
                    <option key={day} value={day}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <StartTimeFields />
              <Field label="Duration">
                <select name="duration_hours" required className={inputClass}>
                  {DURATION_OPTIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Start date">
                <input
                  type="date"
                  name="start_date"
                  defaultValue={todayStr}
                  required
                  className={inputClass}
                />
              </Field>
              <Field label="End date (optional)">
                <input type="date" name="end_date" className={inputClass} />
              </Field>
              <Field label="Location" className="col-span-2">
                <input
                  name="location"
                  placeholder="e.g. Taman Desa, student's home"
                  className={`w-full ${inputClass}`}
                />
              </Field>
            </div>
            <div className="flex justify-end">
              <Button type="submit">
                <CalendarPlus className="h-4 w-4" />
                Add enrollment
              </Button>
            </div>
          </ActionForm>
        </Card>

        <div className="space-y-4">
          {groups.map((group) => (
            <Card key={group.studentId} className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold tracking-tight">{group.studentName}</h3>
                {group.items.length > 1 && (
                  <Badge tone="accent">{group.items.length} classes</Badge>
                )}
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
                          <select
                            name="subject"
                            defaultValue={enrollment.subject}
                            required
                            className={inputClass}
                          >
                            {SUBJECTS.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Level">
                          <select
                            name="level"
                            defaultValue={enrollment.level}
                            required
                            className={inputClass}
                          >
                            <option value="preschool">Preschool</option>
                            <option value="primary">Primary</option>
                          </select>
                        </Field>
                        <Field label="Group size">
                          <select
                            name="group_size"
                            defaultValue={String(enrollment.group_size)}
                            className={inputClass}
                          >
                            <option value="1">1:1</option>
                            <option value="2">1:2</option>
                          </select>
                        </Field>
                        <Field label="Day">
                          <select
                            name="day_of_week"
                            defaultValue={enrollment.day_of_week}
                            required
                            className={inputClass}
                          >
                            {WEEKDAY_LABELS.map((label, day) => (
                              <option key={day} value={day}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <StartTimeFields
                          defaultHour={enrollment.start_time.slice(0, 2)}
                          defaultMinute={enrollment.start_time.slice(3, 5)}
                        />
                        <Field label="Duration">
                          <select
                            name="duration_hours"
                            defaultValue={String(enrollment.duration_hours)}
                            required
                            className={inputClass}
                          >
                            {DURATION_OPTIONS.map((d) => (
                              <option key={d.value} value={d.value}>
                                {d.label}
                              </option>
                            ))}
                          </select>
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
                        <input
                          type="hidden"
                          name="active"
                          value={String(enrollment.active)}
                        />
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
          {groups.length === 0 && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No enrollments yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

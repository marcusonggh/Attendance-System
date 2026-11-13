import { format } from "date-fns";
import { CalendarPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  DURATION_OPTIONS,
  SUBJECTS,
  WEEKDAY_LABELS,
  type Enrollment,
  type Student,
} from "@/lib/types";
import { addEnrollment } from "./actions";
import { StartTimeFields } from "./StartTimeFields";
import { EnrollmentGroups } from "./EnrollmentGroups";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { ActionForm } from "@/components/ui/ActionForm";
import { Select } from "@/components/ui/Select";

const fieldGridClass = "grid grid-cols-2 gap-3 sm:grid-cols-4";

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
    items: enrollments
      .filter((e) => e.student_id === id)
      .sort(
        (a, b) =>
          a.day_of_week - b.day_of_week ||
          a.start_time.localeCompare(b.start_time),
      ),
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
                <Select name="student_id" required>
                  <option value="">Select student</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Subject">
                <Select name="subject" required>
                  {SUBJECTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Level">
                <Select name="level" required>
                  <option value="preschool">Preschool</option>
                  <option value="primary">Primary</option>
                </Select>
              </Field>
              <Field label="Group size">
                <Select name="group_size">
                  <option value="1">1:1</option>
                  <option value="2">1:2</option>
                </Select>
              </Field>
              <Field label="Day">
                <Select name="day_of_week" required>
                  {WEEKDAY_LABELS.map((label, day) => (
                    <option key={day} value={day}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
              <StartTimeFields />
              <Field label="Duration">
                <Select name="duration_hours" required>
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

        <EnrollmentGroups groups={groups} />
      </div>
    </div>
  );
}

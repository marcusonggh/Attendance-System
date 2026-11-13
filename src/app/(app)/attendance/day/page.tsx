import { addDays, format, parseISO } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  CalendarPlus,
  CalendarX,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { ClassSession, Enrollment, Student } from "@/lib/types";
import {
  groupPairedEnrollments,
  groupSizeLabel,
  isScheduledOn,
  sessionTimeRange,
  subjectLabel,
} from "@/lib/rateCard";
import {
  markAttendance,
  markAllPresent,
  addMakeupSession,
  deleteSessionWithUndo,
  restoreSession,
  cancelReschedule,
  restoreCanceledReschedule,
} from "../actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, inputClass } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { PageHeader } from "@/components/ui/PageHeader";
import { ActionForm } from "@/components/ui/ActionForm";
import { StatusSubmitButton } from "@/components/ui/StatusSubmitButton";
import { UndoableDeleteButton } from "@/components/ui/UndoableDeleteButton";
import { ViewSwitcher } from "../ViewSwitcher";
import { RescheduleForm } from "../RescheduleForm";
import { SessionNotes } from "../SessionNotes";

const navLinkClass =
  "flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 text-zinc-600 hover:bg-zinc-100";

export default async function AttendanceDayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const date = dateParam ?? format(new Date(), "yyyy-MM-dd");
  const current = parseISO(date);
  const dayOfWeek = current.getDay();
  const prevDate = format(addDays(current, -1), "yyyy-MM-dd");
  const nextDate = format(addDays(current, 1), "yyyy-MM-dd");

  const supabase = await createClient();

  const [{ data: enrollmentData }, { data: studentsData }, { data: sessionRows }] =
    await Promise.all([
      supabase.from("enrollments").select("*"),
      supabase.from("students").select("*"),
      supabase.from("sessions").select("*").eq("date", date),
    ]);

  const allEnrollments = (enrollmentData ?? []) as Enrollment[];
  const students = (studentsData ?? []) as Student[];
  const studentNameById = new Map(students.map((s) => [s.id, s.name]));
  const sessions = (sessionRows ?? []) as ClassSession[];
  const sessionByEnrollmentId = new Map(sessions.map((s) => [s.enrollment_id, s]));
  const activeEnrollments = allEnrollments.filter((e) => e.active);

  // A reschedule can be split across several target dates — look up every
  // date each rescheduled session's group was split into, so the badge can
  // list all of them instead of just the single rescheduled_to_date.
  const rescheduledGroupIds = sessions
    .filter((s) => s.status === "rescheduled" && s.reschedule_group_id)
    .map((s) => s.reschedule_group_id as string);
  const { data: groupPartRows } =
    rescheduledGroupIds.length > 0
      ? await supabase
          .from("sessions")
          .select("date, reschedule_group_id")
          .eq("status", "present")
          .in("reschedule_group_id", rescheduledGroupIds)
      : { data: [] as { date: string; reschedule_group_id: string }[] };
  const targetDatesByGroup = new Map<string, string[]>();
  for (const row of groupPartRows ?? []) {
    const list = targetDatesByGroup.get(row.reschedule_group_id) ?? [];
    list.push(row.date);
    targetDatesByGroup.set(row.reschedule_group_id, [...list].sort());
  }
  function rescheduledTargetLabel(session: ClassSession) {
    const dates = session.reschedule_group_id
      ? targetDatesByGroup.get(session.reschedule_group_id)
      : undefined;
    return dates && dates.length > 0
      ? dates.join(", ")
      : session.rescheduled_to_date;
  }

  const scheduledToday = activeEnrollments.filter(
    (e) => e.day_of_week === dayOfWeek && isScheduledOn(e, date),
  );
  const scheduledIds = new Set(scheduledToday.map((e) => e.id));
  const extraFromSessions = allEnrollments.filter(
    (e) => !scheduledIds.has(e.id) && sessionByEnrollmentId.has(e.id),
  );
  const cards = [...scheduledToday, ...extraFromSessions].sort((a, b) =>
    a.start_time.localeCompare(b.start_time),
  );
  // Two students sharing the same 1:2 class look identical except for the
  // name — group them into one card instead of two side by side.
  const cardGroups = groupPairedEnrollments(cards);

  return (
    <div className="space-y-6">
      <ViewSwitcher active="day" anchor={date} />

      <PageHeader
        title={format(current, "EEEE, MMMM d, yyyy")}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <a href={`/attendance/day?date=${prevDate}`} className={navLinkClass}>
              <ChevronLeft className="h-4 w-4" />
            </a>
            <form className="flex items-center gap-2">
              <input
                type="date"
                name="date"
                defaultValue={date}
                className={inputClass}
              />
              <Button type="submit" variant="secondary" size="sm">
                Go
              </Button>
            </form>
            <a href={`/attendance/day?date=${nextDate}`} className={navLinkClass}>
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        }
      />

      {cards.length > 0 && (
        <div className="flex justify-end">
          <ActionForm action={markAllPresent}>
            <input type="hidden" name="date" value={date} />
            <Button type="submit" variant="secondary" size="sm">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Mark all present
            </Button>
          </ActionForm>
        </div>
      )}

      {cards.length === 0 && (
        <p className="text-sm text-zinc-500">
          No classes scheduled for this day. Add an enrollment on the Schedule
          page, or add a make-up class below.
        </p>
      )}

      {cardGroups.map((group) => (
        <Card key={group[0].id} className="space-y-3">
          {group.map((enrollment, i) => {
            const session = sessionByEnrollmentId.get(enrollment.id);
            const studentName = studentNameById.get(enrollment.student_id) ?? "Unknown";
            const isRescheduled = session?.status === "rescheduled";

            return (
              <div
                key={enrollment.id}
                className={
                  i === 0
                    ? "space-y-3"
                    : "space-y-3 border-t border-zinc-100 pt-3 dark:border-zinc-800"
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold">{studentName}</h2>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">
                      {groupSizeLabel(enrollment.group_size)}{" "}
                      {subjectLabel(enrollment.subject)}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {sessionTimeRange(session, enrollment)}
                    </p>
                    {enrollment.location && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {enrollment.location}
                      </p>
                    )}
                    <div className="mt-1 flex gap-1.5">
                      {session?.is_makeup && <Badge tone="accent">Make-up</Badge>}
                      {isRescheduled && session && (
                        <Badge tone="accent">
                          Rescheduled → {rescheduledTargetLabel(session)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {session &&
                    (isRescheduled ? (
                      <UndoableDeleteButton
                        deleteArgs={session.id}
                        onDelete={cancelReschedule}
                        onRestore={restoreCanceledReschedule}
                        confirmMessage="Cancel this reschedule? This removes both the original slot and the moved class."
                        ariaLabel="Cancel reschedule"
                        className="flex h-8 w-8 flex-none items-center justify-center rounded-md border border-zinc-300 text-zinc-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                        icon={<CalendarX className="h-3.5 w-3.5" />}
                      />
                    ) : (
                      <UndoableDeleteButton
                        deleteArgs={session.id}
                        onDelete={deleteSessionWithUndo}
                        onRestore={restoreSession}
                        confirmMessage="Delete this session? This can't be undone."
                        ariaLabel="Delete session"
                        className="flex h-8 w-8 flex-none items-center justify-center rounded-md border border-zinc-300 text-zinc-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                        icon={<Trash2 className="h-3.5 w-3.5" />}
                      />
                    ))}
                </div>

                {session && (
                  <SessionNotes sessionId={session.id} initialNotes={session.notes} />
                )}

                {!isRescheduled && (
                  <>
                    <ActionForm
                      action={markAttendance}
                      className="flex flex-col gap-2 sm:flex-row sm:items-center"
                    >
                      <input type="hidden" name="date" value={date} />
                      <input type="hidden" name="enrollment_id" value={enrollment.id} />
                      <div className="flex items-center gap-2">
                        <StatusSubmitButton
                          value="present"
                          active={session?.status === "present"}
                          activeClassName="bg-green-600 text-white"
                          inactiveClassName="border border-zinc-300 text-zinc-600 hover:bg-zinc-100"
                          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                        >
                          Present
                        </StatusSubmitButton>
                        <StatusSubmitButton
                          value="absent"
                          active={session?.status === "absent"}
                          activeClassName="bg-amber-600 text-white"
                          inactiveClassName="border border-zinc-300 text-zinc-600 hover:bg-zinc-100"
                          icon={<XCircle className="h-3.5 w-3.5" />}
                        >
                          Absent
                        </StatusSubmitButton>
                      </div>
                      <input
                        name="reason"
                        placeholder="Absence reason (optional)"
                        defaultValue={session?.absence_reason ?? ""}
                        className={`flex-1 text-xs ${inputClass}`}
                      />
                    </ActionForm>

                    <RescheduleForm
                      enrollmentId={enrollment.id}
                      fromDate={date}
                      defaultHour={(session?.start_time ?? enrollment.start_time).slice(0, 2)}
                      defaultMinute={(session?.start_time ?? enrollment.start_time).slice(3, 5)}
                      originalDuration={session?.duration_hours ?? enrollment.duration_hours}
                    />
                  </>
                )}
              </div>
            );
          })}
        </Card>
      ))}

      <Card className="space-y-3">
        <h2 className="flex items-center gap-2 font-medium">
          <CalendarPlus className="h-4 w-4 text-teal-600" />
          Add a make-up class
        </h2>
        <ActionForm
          action={addMakeupSession}
          resetOnSuccess
          className="flex flex-wrap items-end gap-2"
        >
          <input type="hidden" name="date" value={date} />
          <Field label="Enrollment">
            <Select name="enrollment_id" required>
              <option value="">Select enrollment</option>
              {activeEnrollments.map((e) => (
                <option key={e.id} value={e.id}>
                  {studentNameById.get(e.student_id) ?? "Unknown"} ·{" "}
                  {subjectLabel(e.subject)}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit">Add</Button>
        </ActionForm>
      </Card>
    </div>
  );
}

import {
  addDays,
  addWeeks,
  endOfWeek,
  format,
  parseISO,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { ClassSession, Enrollment, RateCard, Student } from "@/lib/types";
import { formatTimeRange, groupSizeLabel, isScheduledOn, subjectLabel } from "@/lib/rateCard";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import { AddMakeupEnrollment } from "./AddMakeupEnrollment";
import { ViewSwitcher } from "./ViewSwitcher";
import { GettingStartedChecklist } from "./GettingStartedChecklist";

const navLinkClass =
  "flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 text-zinc-600 hover:bg-zinc-100";

const MAX_VISIBLE_ENROLLMENTS = 5;

export default async function AttendanceCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week: weekParam } = await searchParams;
  const anchor = weekParam ? parseISO(weekParam) : new Date();
  const anchorStr = format(anchor, "yyyy-MM-dd");
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(anchor, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const prevWeek = format(addWeeks(anchor, -1), "yyyy-MM-dd");
  const nextWeek = format(addWeeks(anchor, 1), "yyyy-MM-dd");
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(weekEnd, "yyyy-MM-dd");
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const supabase = await createClient();

  const [
    { data: enrollmentData },
    { data: sessionRows },
    { data: studentsData },
    { data: rateData },
  ] = await Promise.all([
    supabase.from("enrollments").select("*"),
    supabase
      .from("sessions")
      .select("*")
      .gte("date", weekStartStr)
      .lte("date", weekEndStr),
    supabase.from("students").select("*").order("name"),
    supabase.from("rate_card").select("*"),
  ]);

  const allEnrollments = (enrollmentData ?? []) as Enrollment[];
  const activeEnrollments = allEnrollments.filter((e) => e.active);
  const sessions = (sessionRows ?? []) as ClassSession[];
  const allStudents = (studentsData ?? []) as Student[];
  const studentNameById = new Map(allStudents.map((s) => [s.id, s.name]));
  const rateCard = (rateData ?? []) as RateCard[];
  const enrollmentById = new Map(allEnrollments.map((e) => [e.id, e]));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Week of ${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/attendance?week=${prevWeek}`} className={navLinkClass}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <Link
              href="/attendance"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100"
            >
              This week
            </Link>
            <Link href={`/attendance?week=${nextWeek}`} className={navLinkClass}>
              <ChevronRight className="h-4 w-4" />
            </Link>
            <form action="/attendance" className="flex items-center gap-2">
              <input
                type="date"
                name="week"
                defaultValue={anchorStr}
                className={inputClass}
              />
              <Button type="submit" variant="secondary" size="sm">
                Go
              </Button>
            </form>
          </div>
        }
      />

      <ViewSwitcher active="week" anchor={anchorStr} />

      <GettingStartedChecklist
        hasStudents={allStudents.some((s) => s.active)}
        hasSchedule={activeEnrollments.length > 0}
        hasPricing={rateCard.some((r) => Number(r.rate) > 0)}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayOfWeek = day.getDay();
          const isToday = dateStr === todayStr;

          const scheduledToday = activeEnrollments.filter(
            (e) => e.day_of_week === dayOfWeek && isScheduledOn(e, dateStr),
          );
          const scheduledIds = new Set(scheduledToday.map((e) => e.id));
          const daySessions = sessions.filter((s) => s.date === dateStr);
          const extraEnrollmentIds = daySessions
            .map((s) => s.enrollment_id)
            .filter((id) => !scheduledIds.has(id));
          const cardEnrollments = [
            ...scheduledToday,
            ...extraEnrollmentIds
              .map((id) => enrollmentById.get(id))
              .filter((e): e is Enrollment => !!e),
          ].sort((a, b) => a.start_time.localeCompare(b.start_time));
          const sessionByEnrollmentId = new Map(
            daySessions.map((s) => [s.enrollment_id, s]),
          );
          const visible = cardEnrollments.slice(0, MAX_VISIBLE_ENROLLMENTS);
          const extra = cardEnrollments.length - visible.length;

          return (
            <Card
              key={dateStr}
              className={isToday ? "ring-2 ring-teal-500" : undefined}
            >
              <p className="text-xs font-medium text-zinc-500">
                {format(day, "EEE")}
              </p>
              <p className="mb-3 text-sm font-semibold">{format(day, "MMM d")}</p>

              <div className="space-y-1.5">
                {cardEnrollments.length > 0 ? (
                  <Link
                    href={`/attendance/day?date=${dateStr}`}
                    className="block rounded-md border border-teal-200 bg-teal-50 p-2 text-xs hover:border-teal-400"
                  >
                    <ul className="space-y-1">
                      {visible.map((e) => {
                        const session = sessionByEnrollmentId.get(e.id);
                        const dotClass = !session
                          ? "bg-zinc-300"
                          : session.status === "present"
                            ? "bg-green-500"
                            : session.status === "absent"
                              ? "bg-amber-500"
                              : "bg-sky-500";
                        return (
                          <li key={e.id} className="text-teal-800">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`h-1.5 w-1.5 flex-none rounded-full ${dotClass}`}
                              />
                              <span className="truncate">
                                {studentNameById.get(e.student_id) ?? "Unknown"} ·{" "}
                                {groupSizeLabel(e.group_size)}{" "}
                                {subjectLabel(e.subject)}
                              </span>
                            </div>
                            <p className="pl-3 text-teal-600">
                              {formatTimeRange(e.start_time, e.duration_hours)}
                              {session?.status === "rescheduled" &&
                                ` · moved to ${session.rescheduled_to_date}`}
                            </p>
                          </li>
                        );
                      })}
                      {extra > 0 && (
                        <li className="text-teal-600">+{extra} more</li>
                      )}
                    </ul>
                  </Link>
                ) : null}

                <AddMakeupEnrollment
                  date={dateStr}
                  enrollments={activeEnrollments}
                  studentNameById={studentNameById}
                />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLastView } from "../lastView";
import { SaveLastView } from "../SaveLastView";
import type { ClassSession, Enrollment, Student } from "@/lib/types";
import {
  groupPairedEnrollments,
  groupSizeLabel,
  isScheduledOn,
  sessionTimeRange,
  subjectLabel,
} from "@/lib/rateCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import { ViewSwitcher } from "../ViewSwitcher";

const WEEKDAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const navLinkClass =
  "flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800";

export default async function AttendanceMonthPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const todayStr = format(new Date(), "yyyy-MM-dd");

  // A bare "/attendance/month" (no month) resumes the last-viewed month,
  // as long as Month was actually the last view — otherwise just today.
  if (!monthParam) {
    const last = await getLastView();
    if (last?.view === "month") redirect(`/attendance/month?month=${last.anchor}`);
  }

  const anchor = monthParam ? parseISO(monthParam) : new Date();
  const anchorStr = format(anchor, "yyyy-MM-dd");
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const gridDays = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const prevMonth = format(addMonths(anchor, -1), "yyyy-MM-dd");
  const nextMonth = format(addMonths(anchor, 1), "yyyy-MM-dd");
  const gridStartStr = format(gridStart, "yyyy-MM-dd");
  const gridEndStr = format(gridEnd, "yyyy-MM-dd");

  const supabase = await createClient();

  const [{ data: enrollmentData }, { data: sessionRows }, { data: studentsData }] =
    await Promise.all([
      supabase.from("enrollments").select("*").eq("active", true),
      supabase
        .from("sessions")
        .select("*")
        .gte("date", gridStartStr)
        .lte("date", gridEndStr),
      supabase.from("students").select("*").order("name"),
    ]);

  const enrollments = (enrollmentData ?? []) as Enrollment[];
  const sessions = (sessionRows ?? []) as ClassSession[];
  const students = (studentsData ?? []) as Student[];
  const studentNameById = new Map(students.map((s) => [s.id, s.name]));
  const enrollmentById = new Map(enrollments.map((e) => [e.id, e]));

  return (
    <div className="space-y-6">
      <PageHeader
        title={format(monthStart, "MMMM yyyy")}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/attendance/month?month=${prevMonth}`} className={navLinkClass}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <Link
              href={`/attendance/month?month=${todayStr}`}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              This month
            </Link>
            <Link href={`/attendance/month?month=${nextMonth}`} className={navLinkClass}>
              <ChevronRight className="h-4 w-4" />
            </Link>
            <form action="/attendance/month" className="flex items-center gap-2">
              <input
                type="date"
                name="month"
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

      <ViewSwitcher active="month" anchor={anchorStr} />
      <SaveLastView view="month" anchor={anchorStr} />

      <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {WEEKDAY_HEADERS.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {gridDays.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayOfWeek = day.getDay();
          const inCurrentMonth = day >= monthStart && day <= monthEnd;
          const isToday = dateStr === todayStr;

          const scheduledToday = enrollments.filter(
            (e) => e.day_of_week === dayOfWeek && isScheduledOn(e, dateStr),
          );
          const scheduledIds = new Set(scheduledToday.map((e) => e.id));
          const daySessions = sessions.filter((s) => s.date === dateStr);
          const extraEnrollments = daySessions
            .map((s) => enrollmentById.get(s.enrollment_id))
            .filter(
              (e): e is Enrollment => !!e && !scheduledIds.has(e.id),
            );
          const cardEnrollments = [...scheduledToday, ...extraEnrollments].sort(
            (a, b) => a.start_time.localeCompare(b.start_time),
          );
          const sessionByEnrollmentId = new Map(
            daySessions.map((s) => [s.enrollment_id, s]),
          );
          // Two students sharing the same 1:2 class look identical except
          // for the name — show them as one entry instead of two.
          const cardGroups = groupPairedEnrollments(cardEnrollments);

          return (
            <Link
              key={dateStr}
              href={`/attendance/day?date=${dateStr}`}
              className={`block min-h-32 rounded-md border p-1.5 text-[11px] leading-tight ${
                isToday
                  ? "border-teal-500 ring-1 ring-teal-500"
                  : "border-zinc-200 hover:border-teal-300 dark:border-zinc-800 dark:hover:border-teal-700"
              } ${inCurrentMonth ? "bg-white dark:bg-zinc-900" : "bg-zinc-50 text-zinc-400 dark:bg-zinc-950 dark:text-zinc-600"}`}
            >
              <p className="mb-1 text-xs font-medium">{format(day, "d")}</p>

              <div className="space-y-1">
                {cardGroups.map((group) => {
                  const session = sessionByEnrollmentId.get(group[0].id);
                  const statuses = group.map(
                    (e) => sessionByEnrollmentId.get(e.id)?.status ?? null,
                  );
                  const mixed = !statuses.every((s) => s === statuses[0]);

                  const cellClass = !session
                    ? "border border-dashed border-zinc-300 text-zinc-400 dark:border-zinc-700 dark:text-zinc-500"
                    : session.status === "present"
                      ? "bg-teal-50 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300"
                      : session.status === "absent"
                        ? "bg-amber-50 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                        : "bg-sky-50 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300";

                  return (
                    <div
                      key={group[0].id}
                      className={`rounded px-1 py-0.5 ${cellClass}`}
                    >
                      {group.map((e) => (
                        <p key={e.id} className="truncate font-medium">
                          {studentNameById.get(e.student_id) ?? "Unknown"}
                        </p>
                      ))}
                      <p className="truncate">
                        {groupSizeLabel(group[0].group_size)}{" "}
                        {subjectLabel(group[0].subject)}
                      </p>
                      <p className="truncate">
                        {sessionTimeRange(session, group[0])}
                        {mixed
                          ? " · mixed"
                          : session
                            ? session.status === "rescheduled"
                              ? ` · moved to ${session.rescheduled_to_date}`
                              : ` · ${session.status}`
                            : " · not marked"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

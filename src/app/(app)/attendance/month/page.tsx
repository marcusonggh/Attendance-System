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
import { createClient } from "@/lib/supabase/server";
import type { ClassSession, Enrollment, Student } from "@/lib/types";
import { formatTimeRange, groupSizeLabel, isScheduledOn, subjectLabel } from "@/lib/rateCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import { ViewSwitcher } from "../ViewSwitcher";

const WEEKDAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const navLinkClass =
  "flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 text-zinc-600 hover:bg-zinc-100";

export default async function AttendanceMonthPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
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
  const todayStr = format(new Date(), "yyyy-MM-dd");

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
              href="/attendance/month"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100"
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

      <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-zinc-500">
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
          const cardEnrollments = [...scheduledToday, ...extraEnrollments];
          const sessionByEnrollmentId = new Map(
            daySessions.map((s) => [s.enrollment_id, s]),
          );

          return (
            <Link
              key={dateStr}
              href={`/attendance/day?date=${dateStr}`}
              className={`block min-h-32 rounded-md border p-1.5 text-[11px] leading-tight ${
                isToday
                  ? "border-teal-500 ring-1 ring-teal-500"
                  : "border-zinc-200 hover:border-teal-300"
              } ${inCurrentMonth ? "bg-white" : "bg-zinc-50 text-zinc-400"}`}
            >
              <p className="mb-1 text-xs font-medium">{format(day, "d")}</p>
              <div className="space-y-1">
                {cardEnrollments.map((enrollment) => {
                  const session = sessionByEnrollmentId.get(enrollment.id);
                  const name = studentNameById.get(enrollment.student_id) ?? "Unknown";

                  const cellClass = !session
                    ? "border border-dashed border-zinc-300 text-zinc-400"
                    : session.status === "present"
                      ? "bg-teal-50 text-teal-800"
                      : session.status === "absent"
                        ? "bg-amber-50 text-amber-800"
                        : "bg-sky-50 text-sky-800";

                  return (
                    <div
                      key={enrollment.id}
                      className={`rounded px-1 py-0.5 ${cellClass}`}
                    >
                      <p className="truncate font-medium">
                        {name} · {groupSizeLabel(enrollment.group_size)}{" "}
                        {subjectLabel(enrollment.subject)}
                      </p>
                      <p className="truncate">
                        {formatTimeRange(enrollment.start_time, enrollment.duration_hours)}
                        {session
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

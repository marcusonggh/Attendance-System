import { addMonths, endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveRate, overlapsMonth, subjectLabel } from "@/lib/rateCard";
import type {
  Student,
  ClassSession,
  Enrollment,
  Invoice,
  RateCard,
  StudentRate,
} from "@/lib/types";
import DashboardCharts from "./DashboardCharts";
import { ScheduleHeatmap } from "./ScheduleHeatmap";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";

const LOW_ATTENDANCE_THRESHOLD = 70;
const MIN_SESSIONS_TO_FLAG = 2;

const navLinkClass =
  "flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800";

function StatTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: "neutral" | "success" | "warning";
}) {
  const toneClass = {
    neutral: "text-zinc-900 dark:text-zinc-50",
    success: "text-green-600 dark:text-green-400",
    warning: "text-amber-600 dark:text-amber-400",
  }[tone];

  return (
    <Card>
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${toneClass}`}>
        {value}
      </p>
    </Card>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const { month: monthParam, year: yearParam } = await searchParams;
  const month = monthParam ?? format(new Date(), "yyyy-MM");
  const monthStart = startOfMonth(parseISO(`${month}-01`));
  const monthEnd = endOfMonth(monthStart);
  const monthLabel = format(monthStart, "MMMM yyyy");
  const prevMonth = format(addMonths(monthStart, -1), "yyyy-MM");
  const nextMonth = format(addMonths(monthStart, 1), "yyyy-MM");
  const monthStartStr = format(monthStart, "yyyy-MM-dd");
  const monthEndStr = format(monthEnd, "yyyy-MM-dd");

  // The trend charts at the bottom cover the whole selected year rather
  // than following the month selector above — a monthly breakdown is more
  // useful there than one month's worth of daily dots.
  const year = Number(yearParam) || new Date().getFullYear();
  const prevYear = year - 1;
  const nextYear = year + 1;
  const yearStartStr = `${year}-01-01`;
  const yearEndStr = `${year}-12-31`;
  const monthsOfYear = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));

  const supabase = await createClient();

  const [
    { data: yearSessionRows },
    { data: monthSessionRows },
    { data: studentsData },
    { data: invoiceRows },
    { data: enrollmentData },
    { data: rateCardData },
    { data: studentRateData },
  ] = await Promise.all([
    supabase
      .from("sessions")
      .select("*")
      .gte("date", yearStartStr)
      .lte("date", yearEndStr)
      .order("date"),
    supabase
      .from("sessions")
      .select("*")
      .gte("date", monthStartStr)
      .lte("date", monthEndStr),
    supabase.from("students").select("*").order("name"),
    supabase.from("invoices").select("*").order("year_month"),
    supabase.from("enrollments").select("*"),
    supabase.from("rate_card").select("*"),
    supabase.from("student_rates").select("*"),
  ]);

  // Rescheduled slots didn't actually happen on their original date — they
  // moved to a new date (which gets its own present/absent row there), so
  // they're excluded from attendance-rate math entirely.
  const yearSessions = ((yearSessionRows ?? []) as ClassSession[]).filter(
    (s) => s.status !== "rescheduled",
  );
  const monthSessions = ((monthSessionRows ?? []) as ClassSession[]).filter(
    (s) => s.status !== "rescheduled",
  );
  const allStudents = (studentsData ?? []) as Student[];
  const invoices = (invoiceRows ?? []) as Invoice[];
  const enrollments = (enrollmentData ?? []) as Enrollment[];
  const rateCard = (rateCardData ?? []) as RateCard[];
  const studentRates = (studentRateData ?? []) as StudentRate[];
  const studentIdByEnrollmentId = new Map(
    enrollments.map((e) => [e.id, e.student_id]),
  );

  // "Active" is month-specific here, not the student's current global flag
  // — a student counts as active for a given month if they had an active
  // enrollment overlapping it, same rule invoicing uses to decide who gets
  // billed that month.
  const activeStudentIdsThisMonth = new Set(
    enrollments
      .filter((e) => e.active && overlapsMonth(e, monthStartStr, monthEndStr))
      .map((e) => e.student_id),
  );
  const students = allStudents.filter((s) => activeStudentIdsThisMonth.has(s.id));

  const attendanceByYearMonth = new Map<string, { present: number; total: number }>();
  for (const session of yearSessions) {
    const key = session.date.slice(0, 7);
    const entry = attendanceByYearMonth.get(key) ?? { present: 0, total: 0 };
    entry.present += session.status === "present" ? 1 : 0;
    entry.total += 1;
    attendanceByYearMonth.set(key, entry);
  }
  const attendanceOverTime = monthsOfYear.map((m) => {
    const entry = attendanceByYearMonth.get(format(m, "yyyy-MM"));
    return {
      date: format(m, "MMM"),
      rate: entry && entry.total > 0 ? Math.round((entry.present / entry.total) * 100) : 0,
    };
  });

  const perStudent = students
    .map((student) => {
      const records = monthSessions.filter(
        (s) => studentIdByEnrollmentId.get(s.enrollment_id) === student.id,
      );
      const present = records.filter((r) => r.status === "present").length;
      const total = records.length;
      return {
        id: student.id,
        name: student.name,
        present,
        total,
        rate: total > 0 ? Math.round((present / total) * 100) : 0,
      };
    })
    .sort((a, b) => b.rate - a.rate);

  // Before a month's invoices are finalized there's nothing in `invoices`
  // yet to chart — fall back to what each active student's enrollments
  // would bill at today's rates, so the dashboard still shows a number
  // instead of a blank chart.
  const monthInvoices = invoices.filter((inv) => inv.year_month === month);
  const monthIsFinalized = monthInvoices.length > 0;
  const monthActiveEnrollments = enrollments.filter(
    (e) => e.active && overlapsMonth(e, monthStartStr, monthEndStr),
  );
  const revenueBySubjectMap = new Map<string, number>();
  for (const e of monthActiveEnrollments) {
    const amount = getEffectiveRate(studentRates, rateCard, e);
    revenueBySubjectMap.set(e.subject, (revenueBySubjectMap.get(e.subject) ?? 0) + amount);
  }
  const revenueBySubject = Array.from(revenueBySubjectMap.entries())
    .map(([subject, amount]) => ({ label: subjectLabel(subject), amount }))
    .sort((a, b) => b.amount - a.amount);
  const maxSubjectRevenue = revenueBySubject[0]?.amount ?? 0;
  const projectedRevenue = monthActiveEnrollments.reduce(
    (sum, e) => sum + getEffectiveRate(studentRates, rateCard, e),
    0,
  );

  const invoicedByYearMonth = new Map<string, { paid: number; unpaid: number }>();
  for (const invoice of invoices) {
    if (!invoice.year_month.startsWith(`${year}-`)) continue;
    const entry = invoicedByYearMonth.get(invoice.year_month) ?? {
      paid: 0,
      unpaid: 0,
    };
    if (invoice.status === "paid") entry.paid += Number(invoice.amount_owed);
    else entry.unpaid += Number(invoice.amount_owed);
    invoicedByYearMonth.set(invoice.year_month, entry);
  }
  const currentMonthStart = startOfMonth(new Date());
  const revenue = monthsOfYear.map((m) => {
    const key = format(m, "yyyy-MM");
    const label = format(m, "MMM");
    const invoiced = invoicedByYearMonth.get(key);
    if (invoiced) {
      return { month: label, paid: invoiced.paid, unpaid: invoiced.unpaid, projected: 0 };
    }
    // Only project forward (this month or later) — projecting today's roster
    // of active enrollments onto a past month that was never invoiced would
    // just be fabricating history.
    if (m < currentMonthStart) {
      return { month: label, paid: 0, unpaid: 0, projected: 0 };
    }
    const mStartStr = format(startOfMonth(m), "yyyy-MM-dd");
    const mEndStr = format(endOfMonth(m), "yyyy-MM-dd");
    const projected = enrollments
      .filter((e) => e.active && overlapsMonth(e, mStartStr, mEndStr))
      .reduce((sum, e) => sum + getEffectiveRate(studentRates, rateCard, e), 0);
    return { month: label, paid: 0, unpaid: 0, projected };
  });

  let runningRevenue = 0;
  const revenueWithCumulative = revenue.map((r) => {
    runningRevenue += r.paid + r.unpaid + r.projected;
    return { ...r, cumulative: runningRevenue };
  });

  const monthPresent = monthSessions.filter((s) => s.status === "present").length;
  const attendanceRate =
    monthSessions.length > 0
      ? Math.round((monthPresent / monthSessions.length) * 100)
      : 0;

  const needsAttention = perStudent
    .filter((s) => s.total >= MIN_SESSIONS_TO_FLAG && s.rate < LOW_ATTENDANCE_THRESHOLD)
    .sort((a, b) => a.rate - b.rate);

  const collected = monthInvoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + Number(i.amount_owed), 0);
  const outstanding = monthIsFinalized
    ? monthInvoices
        .filter((i) => i.status === "unpaid")
        .reduce((sum, i) => sum + Number(i.amount_owed), 0)
    : projectedRevenue;

  return (
    <div className="space-y-6">
      <PageHeader
        title={monthLabel}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <a href={`/dashboard?month=${prevMonth}&year=${year}`} className={navLinkClass}>
              <ChevronLeft className="h-4 w-4" />
            </a>
            <form className="flex items-center gap-2">
              <input type="hidden" name="year" value={year} />
              <input
                type="month"
                name="month"
                defaultValue={month}
                className={inputClass}
              />
              <Button type="submit" variant="secondary" size="sm">
                Go
              </Button>
            </form>
            <a href={`/dashboard?month=${nextMonth}&year=${year}`} className={navLinkClass}>
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Attendance rate" value={`${attendanceRate}%`} />
        <StatTile label="Active students" value={students.length} />
        <StatTile
          label="Collected"
          value={`RM${collected.toFixed(2)}`}
          tone="success"
        />
        <StatTile
          label={monthIsFinalized ? "Outstanding" : "Projected (not yet invoiced)"}
          value={`RM${outstanding.toFixed(2)}`}
          tone="warning"
        />
      </div>

      {revenueBySubject.length > 0 && (
        <Card>
          <h2 className="mb-1 font-medium">Revenue by subject</h2>
          <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
            {monthIsFinalized ? "This month's billing" : "Projected billing"}, by
            subject, at current rates.
          </p>
          <div className="space-y-3">
            {revenueBySubject.map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <span className="w-24 flex-none truncate text-sm">{s.label}</span>
                <div className="h-2 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-2 rounded-full bg-teal-500"
                    style={{
                      width: `${maxSubjectRevenue > 0 ? (s.amount / maxSubjectRevenue) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="w-20 flex-none text-right text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
                  RM{s.amount.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {needsAttention.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <h2 className="mb-3 flex items-center gap-2 font-medium text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4" />
            Needs attention
          </h2>
          <div className="space-y-2">
            {needsAttention.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <span>{s.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {s.present}/{s.total} sessions
                  </span>
                  <Badge tone="warning">{s.rate}%</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="mb-4 font-medium">Attendance by student</h2>
        <div className="space-y-3">
          {perStudent.map((s) => (
            <div key={s.id} className="flex items-center gap-3">
              <span className="w-28 flex-none truncate text-sm">{s.name}</span>
              <div className="h-2 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className={`h-2 rounded-full ${
                    s.rate >= 80
                      ? "bg-green-500"
                      : s.rate >= 50
                        ? "bg-amber-500"
                        : "bg-red-500"
                  }`}
                  style={{ width: `${s.rate}%` }}
                />
              </div>
              <span className="w-16 flex-none text-right text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
                {s.present}/{s.total}
              </span>
            </div>
          ))}
          {perStudent.length === 0 && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No attendance data yet.
            </p>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="mb-1 font-medium">Weekly schedule</h2>
        <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
          Currently active classes by day and time — lighter slots have room
          for more students. Independent of the selectors above.
        </p>
        <ScheduleHeatmap enrollments={enrollments.filter((e) => e.active)} />
      </Card>

      <PageHeader
        title={`Yearly trends — ${year}`}
        description="These charts track the full year, independent of the month selected above."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <a href={`/dashboard?month=${month}&year=${prevYear}`} className={navLinkClass}>
              <ChevronLeft className="h-4 w-4" />
            </a>
            <form className="flex items-center gap-2">
              <input type="hidden" name="month" value={month} />
              <input
                type="number"
                name="year"
                defaultValue={year}
                className={`w-24 ${inputClass}`}
              />
              <Button type="submit" variant="secondary" size="sm">
                Go
              </Button>
            </form>
            <a href={`/dashboard?month=${month}&year=${nextYear}`} className={navLinkClass}>
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        }
      />

      <DashboardCharts attendanceOverTime={attendanceOverTime} revenue={revenueWithCumulative} />
    </div>
  );
}

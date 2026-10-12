import { format, parseISO } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Student, ClassSession, Enrollment, Invoice } from "@/lib/types";
import DashboardCharts from "./DashboardCharts";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const LOW_ATTENDANCE_THRESHOLD = 70;
const MIN_SESSIONS_TO_FLAG = 2;

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

export default async function DashboardPage() {
  const supabase = await createClient();

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const sinceStr = ninetyDaysAgo.toISOString().slice(0, 10);
  const currentMonth = format(new Date(), "yyyy-MM");

  const [
    { data: sessionRows },
    { data: studentsData },
    { data: invoiceRows },
    { data: enrollmentData },
  ] = await Promise.all([
    supabase.from("sessions").select("*").gte("date", sinceStr).order("date"),
    supabase.from("students").select("*").eq("active", true).order("name"),
    supabase.from("invoices").select("*").order("year_month"),
    supabase.from("enrollments").select("*"),
  ]);

  // Rescheduled slots didn't actually happen on their original date — they
  // moved to a new date (which gets its own present/absent row there), so
  // they're excluded from attendance-rate math entirely.
  const sessions = ((sessionRows ?? []) as ClassSession[]).filter(
    (s) => s.status !== "rescheduled",
  );
  const students = (studentsData ?? []) as Student[];
  const invoices = (invoiceRows ?? []) as Invoice[];
  const enrollments = (enrollmentData ?? []) as Enrollment[];
  const studentIdByEnrollmentId = new Map(
    enrollments.map((e) => [e.id, e.student_id]),
  );

  const byDate = new Map<string, { present: number; total: number }>();
  for (const session of sessions) {
    const entry = byDate.get(session.date) ?? { present: 0, total: 0 };
    entry.present += session.status === "present" ? 1 : 0;
    entry.total += 1;
    byDate.set(session.date, entry);
  }
  const attendanceOverTime = Array.from(byDate.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, { present, total }]) => ({
      date: format(parseISO(date), "MMM d"),
      rate: total > 0 ? Math.round((present / total) * 100) : 0,
    }));

  const perStudent = students
    .map((student) => {
      const records = sessions.filter(
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

  const revenueByMonth = new Map<string, { paid: number; unpaid: number }>();
  for (const invoice of invoices) {
    const entry = revenueByMonth.get(invoice.year_month) ?? {
      paid: 0,
      unpaid: 0,
    };
    if (invoice.status === "paid") entry.paid += Number(invoice.amount_owed);
    else entry.unpaid += Number(invoice.amount_owed);
    revenueByMonth.set(invoice.year_month, entry);
  }
  const revenue = Array.from(revenueByMonth.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([month, { paid, unpaid }]) => ({ month, paid, unpaid }));

  const thisMonthAttendance = sessions.filter((s) =>
    s.date.startsWith(currentMonth),
  );
  const thisMonthPresent = thisMonthAttendance.filter(
    (s) => s.status === "present",
  ).length;
  const attendanceRateThisMonth =
    thisMonthAttendance.length > 0
      ? Math.round((thisMonthPresent / thisMonthAttendance.length) * 100)
      : 0;

  const needsAttention = perStudent
    .filter((s) => s.total >= MIN_SESSIONS_TO_FLAG && s.rate < LOW_ATTENDANCE_THRESHOLD)
    .sort((a, b) => a.rate - b.rate);

  const thisMonthInvoices = invoices.filter((inv) => inv.year_month === currentMonth);
  const collected = thisMonthInvoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + Number(i.amount_owed), 0);
  const outstanding = thisMonthInvoices
    .filter((i) => i.status === "unpaid")
    .reduce((sum, i) => sum + Number(i.amount_owed), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Attendance this month" value={`${attendanceRateThisMonth}%`} />
        <StatTile label="Active students" value={students.length} />
        <StatTile
          label="Collected this month"
          value={`$${collected.toFixed(2)}`}
          tone="success"
        />
        <StatTile
          label="Outstanding this month"
          value={`$${outstanding.toFixed(2)}`}
          tone="warning"
        />
      </div>

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

      <DashboardCharts attendanceOverTime={attendanceOverTime} revenue={revenue} />
    </div>
  );
}

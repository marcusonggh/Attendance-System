import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import type {
  ClassSession,
  Enrollment,
  Invoice,
  RateCard,
  Student,
  StudentRate,
} from "@/lib/types";
import {
  formatDayTime,
  getEffectiveRate,
  groupSizeLabel,
  overlapsMonth,
  subjectLabel,
} from "@/lib/rateCard";
import { Badge } from "@/components/ui/Badge";
import PrintButton from "./PrintButton";

export default async function PrintInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string; month?: string }>;
}) {
  const { student: studentId, month } = await searchParams;

  if (!studentId || !month) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Missing student or month.
      </p>
    );
  }

  const supabase = await createClient();

  const [
    { data: studentData },
    { data: enrollmentData },
    { data: invoiceData },
    { data: rateData },
    { data: studentRateData },
  ] = await Promise.all([
    supabase.from("students").select("*").eq("id", studentId).single(),
    supabase.from("enrollments").select("*").eq("student_id", studentId),
    supabase
      .from("invoices")
      .select("*")
      .eq("student_id", studentId)
      .eq("year_month", month)
      .maybeSingle(),
    supabase.from("rate_card").select("*"),
    supabase.from("student_rates").select("*"),
  ]);

  const student = studentData as Student | null;
  const enrollments = (enrollmentData ?? []) as Enrollment[];
  let invoice = invoiceData as Invoice | null;
  const rateCard = (rateData ?? []) as RateCard[];
  const studentRates = (studentRateData ?? []) as StudentRate[];

  if (!student) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Student not found.
      </p>
    );
  }

  const monthStartDate = startOfMonth(parseISO(`${month}-01`));
  const monthStart = format(monthStartDate, "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(monthStartDate), "yyyy-MM-dd");

  const relevant = enrollments.filter((e) => overlapsMonth(e, monthStart, monthEnd));
  const activeRelevant = relevant.filter((e) => e.active);

  const { data: sessionRows } = await supabase
    .from("sessions")
    .select("*")
    .eq("status", "present")
    .gte("date", monthStart)
    .lte("date", monthEnd);
  const sessions = (sessionRows ?? []) as ClassSession[];
  const sessionsAttended = sessions.filter((s) =>
    relevant.some((e) => e.id === s.enrollment_id),
  ).length;

  const breakdown = activeRelevant.map((e) => ({
    enrollment: e,
    amount: getEffectiveRate(studentRates, rateCard, e),
  }));
  const amountOwed = breakdown.reduce((sum, b) => sum + b.amount, 0);

  if (!invoice) {
    invoice = {
      id: "",
      student_id: studentId,
      year_month: month,
      sessions_attended: sessionsAttended,
      amount_owed: amountOwed,
      status: "unpaid",
      paid_at: null,
      created_at: "",
    };
  }

  return (
    <div className="mx-auto max-w-md space-y-6 print:max-w-none">
      <div className="flex justify-end print:hidden">
        <PrintButton />
      </div>
      <div className="space-y-4 rounded-xl border border-zinc-200 p-6 dark:border-zinc-800 print:border-none">
        <div className="border-t-4 border-teal-600 pt-4">
          <h1 className="text-xl font-semibold">Tuition Invoice</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {format(parseISO(`${month}-01`), "MMMM yyyy")}
          </p>
        </div>

        <div className="space-y-1 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <p>
            <span className="font-medium">Student:</span> {student.name}
          </p>
          {student.parent_contact && (
            <p>
              <span className="font-medium">Parent contact:</span>{" "}
              {student.parent_contact}
            </p>
          )}
        </div>

        <div className="space-y-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <p className="font-medium">Subjects:</p>
          {breakdown.map(({ enrollment, amount }) => (
            <div key={enrollment.id} className="flex items-center justify-between text-sm">
              <span>
                {groupSizeLabel(enrollment.group_size)} {subjectLabel(enrollment.subject)}{" "}
                ({enrollment.level === "preschool" ? "Preschool" : "Primary"}) ·{" "}
                {formatDayTime(enrollment)}
                {enrollment.location ? ` · ${enrollment.location}` : ""}
              </span>
              <span className="whitespace-nowrap font-medium">
                ${amount.toFixed(2)}
              </span>
            </div>
          ))}
          {breakdown.length === 0 && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No active subjects this month.
            </p>
          )}
        </div>

        <div className="space-y-1 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <p>
            <span className="font-medium">Sessions attended:</span>{" "}
            {invoice.sessions_attended}
          </p>
          <p className="text-lg font-semibold">
            Amount owed: ${Number(invoice.amount_owed).toFixed(2)}
          </p>
        </div>

        <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <p className="flex items-center gap-2">
            <span className="font-medium">Payment status:</span>
            <Badge tone={invoice.status === "paid" ? "success" : "warning"}>
              {invoice.status === "paid" ? "Paid" : "Unpaid"}
            </Badge>
          </p>
        </div>
      </div>
    </div>
  );
}

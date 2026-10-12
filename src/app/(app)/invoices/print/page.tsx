import { endOfMonth, format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import type { ClassSession, Enrollment, Invoice, RateCard, Student, StudentRate } from "@/lib/types";
import { formatDayTime, getEffectiveRate, groupSizeLabel, subjectLabel } from "@/lib/rateCard";
import { Badge } from "@/components/ui/Badge";
import PrintButton from "./PrintButton";

export default async function PrintInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ enrollment?: string; month?: string }>;
}) {
  const { enrollment: enrollmentId, month } = await searchParams;

  if (!enrollmentId || !month) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Missing enrollment or month.
      </p>
    );
  }

  const supabase = await createClient();

  const [
    { data: enrollmentData },
    { data: invoiceData },
    { data: rateData },
    { data: studentRateData },
  ] = await Promise.all([
    supabase.from("enrollments").select("*").eq("id", enrollmentId).single(),
    supabase
      .from("invoices")
      .select("*")
      .eq("enrollment_id", enrollmentId)
      .eq("year_month", month)
      .maybeSingle(),
    supabase.from("rate_card").select("*"),
    supabase.from("student_rates").select("*"),
  ]);

  const enrollment = enrollmentData as Enrollment | null;
  let invoice = invoiceData as Invoice | null;
  const rateCard = (rateData ?? []) as RateCard[];
  const studentRates = (studentRateData ?? []) as StudentRate[];

  if (!enrollment) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Enrollment not found.
      </p>
    );
  }

  const { data: studentData } = await supabase
    .from("students")
    .select("*")
    .eq("id", enrollment.student_id)
    .single();
  const student = studentData as Student | null;

  if (!student) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Student not found.
      </p>
    );
  }

  const monthStart = `${month}-01`;
  const monthEnd = format(endOfMonth(parseISO(monthStart)), "yyyy-MM-dd");
  const { data: sessionRows } = await supabase
    .from("sessions")
    .select("*")
    .eq("enrollment_id", enrollmentId)
    .eq("status", "present")
    .gte("date", monthStart)
    .lte("date", monthEnd);
  const sessions = (sessionRows ?? []) as ClassSession[];

  const rate = getEffectiveRate(studentRates, rateCard, enrollment);

  if (!invoice) {
    invoice = {
      id: "",
      enrollment_id: enrollmentId,
      year_month: month,
      sessions_attended: sessions.length,
      amount_owed: rate,
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
          <p>
            <span className="font-medium">Subject:</span>{" "}
            {groupSizeLabel(enrollment.group_size)} {subjectLabel(enrollment.subject)} (
            {enrollment.level === "preschool" ? "Preschool" : "Primary"})
          </p>
          <p>
            <span className="font-medium">Schedule:</span>{" "}
            {formatDayTime(enrollment)}
            {enrollment.location ? ` · ${enrollment.location}` : ""}
          </p>
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

import { addMonths, endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Printer,
  Trash2,
  Mail,
  MessageCircle,
  History,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type {
  ClassSession,
  Enrollment,
  Invoice,
  RateCard,
  Student,
  StudentRate,
} from "@/lib/types";
import { getEffectiveRate, overlapsMonth, subjectLabel } from "@/lib/rateCard";
import {
  finalizeInvoice,
  togglePaid,
  deleteInvoiceWithUndo,
  restoreInvoice,
  finalizeAllInvoices,
  markAllPaid,
} from "./actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { ActionForm } from "@/components/ui/ActionForm";
import { UndoableDeleteButton } from "@/components/ui/UndoableDeleteButton";
import { AsyncActionButton } from "@/components/ui/AsyncActionButton";

const navLinkClass =
  "flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800";

function buildContactLink(
  contact: string | null,
  studentName: string,
  monthLabel: string,
  amount: number,
) {
  if (!contact) return null;
  const message = `Hi! Here's ${studentName}'s tuition invoice for ${monthLabel}: $${amount.toFixed(2)} due. Thank you!`;

  if (contact.includes("@")) {
    return {
      type: "email" as const,
      href: `mailto:${contact}?subject=${encodeURIComponent(`Tuition Invoice - ${monthLabel}`)}&body=${encodeURIComponent(message)}`,
    };
  }

  const digits = contact.replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (!digits) return null;
  return {
    type: "whatsapp" as const,
    href: `https://wa.me/${digits}?text=${encodeURIComponent(message)}`,
  };
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const month = monthParam ?? format(new Date(), "yyyy-MM");
  const monthStart = startOfMonth(parseISO(`${month}-01`));
  const monthEnd = endOfMonth(monthStart);
  const monthLabel = format(monthStart, "MMMM yyyy");
  const prevMonth = format(addMonths(monthStart, -1), "yyyy-MM");
  const nextMonth = format(addMonths(monthStart, 1), "yyyy-MM");
  const monthStartStr = format(monthStart, "yyyy-MM-dd");
  const monthEndStr = format(monthEnd, "yyyy-MM-dd");

  const supabase = await createClient();

  const [
    { data: studentsData },
    { data: enrollmentData },
    { data: sessionRows },
    { data: invoiceRows },
    { data: rateData },
    { data: studentRateData },
  ] = await Promise.all([
    supabase.from("students").select("*"),
    supabase.from("enrollments").select("*"),
    supabase
      .from("sessions")
      .select("*")
      .gte("date", monthStartStr)
      .lte("date", monthEndStr)
      .eq("status", "present"),
    supabase.from("invoices").select("*").eq("year_month", month),
    supabase.from("rate_card").select("*"),
    supabase.from("student_rates").select("*"),
  ]);

  const students = (studentsData ?? []) as Student[];
  const studentById = new Map(students.map((s) => [s.id, s]));
  const enrollments = (enrollmentData ?? []) as Enrollment[];
  const sessions = (sessionRows ?? []) as ClassSession[];
  const invoices = (invoiceRows ?? []) as Invoice[];
  const rateCard = (rateData ?? []) as RateCard[];
  const studentRates = (studentRateData ?? []) as StudentRate[];

  const studentIds = Array.from(new Set(enrollments.map((e) => e.student_id)));

  const rows = studentIds
    .map((studentId) => {
      const student = studentById.get(studentId);
      const studentEnrollments = enrollments.filter((e) => e.student_id === studentId);
      const relevant = studentEnrollments.filter((e) =>
        overlapsMonth(e, monthStartStr, monthEndStr),
      );
      const activeRelevant = relevant.filter((e) => e.active);
      const breakdown = activeRelevant.map((e) => ({
        enrollment: e,
        amount: getEffectiveRate(studentRates, rateCard, e),
      }));
      const liveSessionsAttended = sessions.filter((s) =>
        relevant.some((e) => e.id === s.enrollment_id),
      ).length;
      const liveAmountOwed = breakdown.reduce((sum, b) => sum + b.amount, 0);
      const invoice = invoices.find((inv) => inv.student_id === studentId);

      return {
        studentId,
        student,
        breakdown,
        hasActiveSubjects: activeRelevant.length > 0,
        // What's shown and what a *new* finalize submits — always current.
        liveSessionsAttended,
        liveAmountOwed,
        // What's displayed as the headline number — the last finalized
        // snapshot if one exists, so "isStale" can flag when it's outdated.
        sessionsAttended: invoice ? invoice.sessions_attended : liveSessionsAttended,
        amountOwed: invoice ? invoice.amount_owed : liveAmountOwed,
        invoice,
        isStale: !!invoice && Number(invoice.amount_owed) !== liveAmountOwed,
        hasActivity: liveSessionsAttended > 0,
      };
    })
    .filter((row): row is typeof row & { student: Student } => !!row.student)
    // A student with no active subjects this month only shows up if there's
    // still something to bill: existing attendance not yet invoiced, or an
    // invoice already finalized. Once neither applies, they drop off.
    .filter((row) => row.hasActiveSubjects || row.invoice || row.hasActivity)
    .sort((a, b) => a.student.name.localeCompare(b.student.name));

  return (
    <div className="space-y-6">
      <PageHeader
        title={monthLabel}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <a href={`/invoices?month=${prevMonth}`} className={navLinkClass}>
              <ChevronLeft className="h-4 w-4" />
            </a>
            <form className="flex items-center gap-2">
              <input
                type="month"
                name="month"
                defaultValue={month}
                className="rounded-md border border-zinc-300 bg-transparent px-2.5 py-1.5 text-sm shadow-sm dark:border-zinc-700"
              />
              <Button type="submit" variant="secondary" size="sm">
                Go
              </Button>
            </form>
            <a href={`/invoices?month=${nextMonth}`} className={navLinkClass}>
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/invoices/history"
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <History className="h-3.5 w-3.5" />
          View invoice history
        </Link>
      </div>

      {rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <AsyncActionButton
            variant="secondary"
            size="sm"
            action={finalizeAllInvoices}
            actionArgs={month}
          >
            Finalize all
          </AsyncActionButton>
          <AsyncActionButton
            variant="secondary"
            size="sm"
            confirmMessage="Mark every unpaid invoice this month as paid?"
            action={markAllPaid}
            actionArgs={month}
          >
            Mark all paid
          </AsyncActionButton>
        </div>
      )}

      <div className="space-y-2">
        {rows.map(
          ({
            studentId,
            student,
            breakdown,
            sessionsAttended,
            amountOwed,
            liveSessionsAttended,
            liveAmountOwed,
            invoice,
            isStale,
          }) => {
          const contactLink = buildContactLink(
            student.parent_contact,
            student.name,
            monthLabel,
            Number(amountOwed),
          );

          return (
            <Card key={studentId} className="flex flex-wrap items-start gap-4">
              <div className="min-w-40 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{student.name}</p>
                  {!student.active && <Badge tone="neutral">Inactive</Badge>}
                  {invoice && (
                    <Badge tone={invoice.status === "paid" ? "success" : "warning"}>
                      {invoice.status === "paid" ? "Paid" : "Unpaid"}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {sessionsAttended} session{sessionsAttended === 1 ? "" : "s"} attended
                  {isStale && " (amount differs from current rate)"}
                </p>
                {breakdown.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5">
                    {breakdown.map(({ enrollment, amount }) => (
                      <li
                        key={enrollment.id}
                        className="text-xs text-zinc-500 dark:text-zinc-400"
                      >
                        {subjectLabel(enrollment.subject)} · ${amount.toFixed(2)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <p className="pt-1 text-lg font-semibold tabular-nums">
                ${Number(amountOwed).toFixed(2)}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {contactLink && (
                  <a
                    href={contactLink.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={navLinkClass}
                    aria-label={
                      contactLink.type === "email"
                        ? "Email parent"
                        : "Message parent on WhatsApp"
                    }
                  >
                    {contactLink.type === "email" ? (
                      <Mail className="h-4 w-4" />
                    ) : (
                      <MessageCircle className="h-4 w-4" />
                    )}
                  </a>
                )}
                {invoice ? (
                  <>
                    <ActionForm action={togglePaid}>
                      <input type="hidden" name="id" value={invoice.id} />
                      <input type="hidden" name="status" value={invoice.status} />
                      <Button type="submit" variant="secondary" size="sm">
                        Mark {invoice.status === "paid" ? "unpaid" : "paid"}
                      </Button>
                    </ActionForm>
                    <ActionForm action={finalizeInvoice}>
                      <input type="hidden" name="student_id" value={studentId} />
                      <input type="hidden" name="year_month" value={month} />
                      <input
                        type="hidden"
                        name="sessions_attended"
                        value={liveSessionsAttended}
                      />
                      <input type="hidden" name="amount_owed" value={liveAmountOwed} />
                      <Button type="submit" variant="secondary" size="sm">
                        Re-finalize
                      </Button>
                    </ActionForm>
                    <a
                      href={`/invoices/print?student=${studentId}&month=${month}`}
                      target="_blank"
                      className={navLinkClass}
                    >
                      <Printer className="h-4 w-4" />
                    </a>
                    <UndoableDeleteButton
                      deleteArgs={invoice.id}
                      onDelete={deleteInvoiceWithUndo}
                      onRestore={restoreInvoice}
                      confirmMessage="Delete this invoice? This can't be undone."
                      ariaLabel="Delete invoice"
                      className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 text-zinc-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-red-800 dark:hover:bg-red-950 dark:hover:text-red-400"
                      icon={<Trash2 className="h-4 w-4" />}
                    />
                  </>
                ) : (
                  <ActionForm action={finalizeInvoice}>
                    <input type="hidden" name="student_id" value={studentId} />
                    <input type="hidden" name="year_month" value={month} />
                    <input
                      type="hidden"
                      name="sessions_attended"
                      value={liveSessionsAttended}
                    />
                    <input type="hidden" name="amount_owed" value={liveAmountOwed} />
                    <Button type="submit" size="sm">
                      Finalize invoice
                    </Button>
                  </ActionForm>
                )}
              </div>
            </Card>
          );
        })}
        {rows.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No active students.
          </p>
        )}
      </div>
    </div>
  );
}

import { format, parseISO } from "date-fns";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Student, Invoice } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";

type StatusFilter = "all" | "paid" | "unpaid";

export default async function InvoiceHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const statusFilter: StatusFilter =
    statusParam === "paid" || statusParam === "unpaid" ? statusParam : "all";

  const supabase = await createClient();

  const [{ data: invoiceRows }, { data: studentsData }] = await Promise.all([
    supabase.from("invoices").select("*").order("year_month", { ascending: false }),
    supabase.from("students").select("*"),
  ]);

  const students = (studentsData ?? []) as Student[];
  const studentById = new Map(students.map((s) => [s.id, s]));

  function nameFor(invoice: Invoice) {
    return studentById.get(invoice.student_id)?.name ?? "Unknown student";
  }

  const invoices = ((invoiceRows ?? []) as Invoice[])
    .filter((inv) => statusFilter === "all" || inv.status === statusFilter)
    .sort((a, b) => {
      if (a.year_month !== b.year_month) {
        return a.year_month < b.year_month ? 1 : -1;
      }
      return nameFor(a).localeCompare(nameFor(b));
    });

  const tabs: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "paid", label: "Paid" },
    { key: "unpaid", label: "Unpaid" },
  ];

  return (
    <div className="space-y-6">
      <Link
        href="/invoices"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-teal-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to invoices
      </Link>

      <PageHeader
        title="Invoice History"
        description="Every finalized invoice, across all months."
      />

      <div className="inline-flex rounded-md border border-zinc-300 p-0.5">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === "all" ? "/invoices/history" : `/invoices/history?status=${tab.key}`}
            className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              tab.key === statusFilter
                ? "bg-teal-600 text-white"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="space-y-2">
        {invoices.map((invoice) => (
          <Card
            key={invoice.id}
            className="flex flex-wrap items-center justify-between gap-4"
          >
            <div className="min-w-40 flex-1">
              <p className="font-medium">{nameFor(invoice)}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {format(parseISO(`${invoice.year_month}-01`), "MMMM yyyy")} ·{" "}
                {invoice.sessions_attended} session
                {invoice.sessions_attended === 1 ? "" : "s"}
              </p>
            </div>

            <p className="text-lg font-semibold tabular-nums">
              ${Number(invoice.amount_owed).toFixed(2)}
            </p>

            <div className="flex items-center gap-2">
              <Badge tone={invoice.status === "paid" ? "success" : "warning"}>
                {invoice.status === "paid" ? "Paid" : "Unpaid"}
              </Badge>
              {invoice.status === "paid" && invoice.paid_at && (
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  on {format(parseISO(invoice.paid_at), "MMM d, yyyy")}
                </span>
              )}
              <a
                href={`/invoices/print?student=${invoice.student_id}&month=${invoice.year_month}`}
                target="_blank"
                className="text-xs text-teal-700 underline hover:text-teal-800"
              >
                Print
              </a>
            </div>
          </Card>
        ))}
        {invoices.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No invoices yet.
          </p>
        )}
      </div>
    </div>
  );
}

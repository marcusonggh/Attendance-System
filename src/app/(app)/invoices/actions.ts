"use server";

import { revalidatePath } from "next/cache";
import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveRate, overlapsMonth } from "@/lib/rateCard";
import type {
  ActionResult,
  ClassSession,
  Enrollment,
  Invoice,
  RateCard,
  StudentRate,
} from "@/lib/types";

export async function finalizeInvoice(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const studentId = String(formData.get("student_id") ?? "");
  const yearMonth = String(formData.get("year_month") ?? "");
  const sessionsAttended = Number(formData.get("sessions_attended"));
  const amountOwed = Number(formData.get("amount_owed"));

  if (
    !studentId ||
    !yearMonth ||
    Number.isNaN(sessionsAttended) ||
    Number.isNaN(amountOwed)
  ) {
    return { success: false, message: "Failed to finalize invoice." };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("invoices")
    .select("id")
    .eq("student_id", studentId)
    .eq("year_month", yearMonth)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("invoices")
        .update({
          sessions_attended: sessionsAttended,
          amount_owed: amountOwed,
        })
        .eq("id", existing.id)
    : await supabase.from("invoices").insert({
        student_id: studentId,
        year_month: yearMonth,
        sessions_attended: sessionsAttended,
        amount_owed: amountOwed,
        status: "unpaid",
      });

  if (error) return { success: false, message: "Failed to finalize invoice." };

  revalidatePath("/invoices");
  return { success: true, message: "Invoice finalized." };
}

export async function togglePaid(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id) return { success: false, message: "Missing invoice." };

  const newStatus = status === "paid" ? "unpaid" : "paid";

  const supabase = await createClient();
  const { error } = await supabase
    .from("invoices")
    .update({
      status: newStatus,
      paid_at: newStatus === "paid" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) return { success: false, message: "Failed to update payment status." };

  revalidatePath("/invoices");
  return {
    success: true,
    message: newStatus === "paid" ? "Marked as paid." : "Marked as unpaid.",
  };
}

export async function deleteInvoiceWithUndo(
  id: string,
): Promise<
  | { success: true; message: string; snapshot: Invoice }
  | { success: false; message: string }
> {
  if (!id) return { success: false, message: "Missing invoice." };

  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single();

  if (!invoice) return { success: false, message: "Invoice not found." };

  const { error } = await supabase.from("invoices").delete().eq("id", id);

  if (error) return { success: false, message: "Failed to delete invoice." };

  revalidatePath("/invoices");
  return { success: true, message: "Invoice deleted.", snapshot: invoice };
}

export async function restoreInvoice(snapshot: Invoice): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("invoices").insert(snapshot);

  if (error) return { success: false, message: "Failed to restore invoice." };

  revalidatePath("/invoices");
  return { success: true, message: "Invoice restored." };
}

export async function finalizeAllInvoices(
  yearMonth: string,
): Promise<ActionResult> {
  const supabase = await createClient();

  const monthStartDate = startOfMonth(parseISO(`${yearMonth}-01`));
  const monthStart = format(monthStartDate, "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(monthStartDate), "yyyy-MM-dd");

  const [
    { data: enrollmentData },
    { data: sessionRows },
    { data: rateData },
    { data: studentRateData },
    { data: existingInvoices },
  ] = await Promise.all([
    supabase.from("enrollments").select("*"),
    supabase
      .from("sessions")
      .select("*")
      .gte("date", monthStart)
      .lte("date", monthEnd)
      .eq("status", "present"),
    supabase.from("rate_card").select("*"),
    supabase.from("student_rates").select("*"),
    supabase
      .from("invoices")
      .select("id, student_id")
      .eq("year_month", yearMonth),
  ]);

  const enrollments = (enrollmentData ?? []) as Enrollment[];
  const sessions = (sessionRows ?? []) as ClassSession[];
  const rateCard = (rateData ?? []) as RateCard[];
  const studentRates = (studentRateData ?? []) as StudentRate[];
  const existingByStudent = new Map(
    (existingInvoices ?? []).map((inv) => [
      inv.student_id as string,
      inv.id as string,
    ]),
  );

  const studentIds = Array.from(new Set(enrollments.map((e) => e.student_id)));

  const toInsert: {
    student_id: string;
    year_month: string;
    sessions_attended: number;
    amount_owed: number;
    status: "unpaid";
  }[] = [];
  const toUpdate: { id: string; sessions_attended: number; amount_owed: number }[] =
    [];

  for (const studentId of studentIds) {
    const studentEnrollments = enrollments.filter((e) => e.student_id === studentId);
    const relevant = studentEnrollments.filter((e) =>
      overlapsMonth(e, monthStart, monthEnd),
    );
    const existingId = existingByStudent.get(studentId);

    // Skip a student entirely if none of their subjects overlap this month
    // (unless already invoiced before dates changed), and skip if none of
    // the overlapping subjects are active and nothing was attended either —
    // nothing to bill in either case.
    if (relevant.length === 0 && !existingId) continue;

    const activeRelevant = relevant.filter((e) => e.active);
    const sessionsAttended = sessions.filter((s) =>
      relevant.some((e) => e.id === s.enrollment_id),
    ).length;

    if (activeRelevant.length === 0 && sessionsAttended === 0 && !existingId) {
      continue;
    }

    const amountOwed = activeRelevant.reduce(
      (sum, e) => sum + getEffectiveRate(studentRates, rateCard, e),
      0,
    );

    if (existingId) {
      toUpdate.push({
        id: existingId,
        sessions_attended: sessionsAttended,
        amount_owed: amountOwed,
      });
    } else {
      toInsert.push({
        student_id: studentId,
        year_month: yearMonth,
        sessions_attended: sessionsAttended,
        amount_owed: amountOwed,
        status: "unpaid",
      });
    }
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("invoices").insert(toInsert);
    if (error) return { success: false, message: "Failed to finalize invoices." };
  }

  for (const row of toUpdate) {
    const { error } = await supabase
      .from("invoices")
      .update({
        sessions_attended: row.sessions_attended,
        amount_owed: row.amount_owed,
      })
      .eq("id", row.id);
    if (error) return { success: false, message: "Failed to finalize invoices." };
  }

  revalidatePath("/invoices");
  const total = toInsert.length + toUpdate.length;
  return {
    success: true,
    message:
      total > 0
        ? `Finalized ${total} invoice${total === 1 ? "" : "s"}.`
        : "No students to finalize.",
  };
}

export async function markAllPaid(yearMonth: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("year_month", yearMonth)
    .eq("status", "unpaid")
    .select("id");

  if (error) return { success: false, message: "Failed to mark invoices as paid." };

  revalidatePath("/invoices");
  const count = data?.length ?? 0;
  return {
    success: true,
    message: count > 0 ? `Marked ${count} invoice${count === 1 ? "" : "s"} as paid.` : "No unpaid invoices to mark.",
  };
}

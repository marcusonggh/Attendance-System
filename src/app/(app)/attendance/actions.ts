"use server";

import { revalidatePath } from "next/cache";
import { parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, ClassSession } from "@/lib/types";

function revalidateAttendanceViews() {
  revalidatePath("/attendance");
  revalidatePath("/attendance/day");
  revalidatePath("/attendance/month");
}

export async function markAttendance(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const date = String(formData.get("date") ?? "");
  const enrollmentId = String(formData.get("enrollment_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (
    !date ||
    !enrollmentId ||
    (status !== "present" && status !== "absent")
  ) {
    return { success: false, message: "Missing attendance details." };
  }

  const supabase = await createClient();
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("day_of_week")
    .eq("id", enrollmentId)
    .single();

  if (!enrollment) return { success: false, message: "Enrollment not found." };

  const isMakeup = enrollment.day_of_week !== parseISO(date).getDay();

  const { error } = await supabase.from("sessions").upsert(
    {
      enrollment_id: enrollmentId,
      date,
      status,
      absence_reason: status === "absent" ? reason || null : null,
      is_makeup: isMakeup,
    },
    { onConflict: "enrollment_id,date" },
  );

  if (error) return { success: false, message: "Failed to save attendance." };

  revalidateAttendanceViews();
  return {
    success: true,
    message: status === "present" ? "Marked present." : "Marked absent.",
  };
}

export async function markAllPresent(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const date = String(formData.get("date") ?? "");
  if (!date) return { success: false, message: "Missing date." };

  const supabase = await createClient();
  const dayOfWeek = parseISO(date).getDay();

  const [{ data: enrollmentsData }, { data: existingSessions }] =
    await Promise.all([
      supabase
        .from("enrollments")
        .select("id")
        .eq("active", true)
        .eq("day_of_week", dayOfWeek),
      supabase.from("sessions").select("enrollment_id").eq("date", date),
    ]);

  const alreadyMarked = new Set(
    (existingSessions ?? []).map((s: { enrollment_id: string }) => s.enrollment_id),
  );
  const rows = ((enrollmentsData ?? []) as { id: string }[])
    .filter((e) => !alreadyMarked.has(e.id))
    .map((e) => ({
      enrollment_id: e.id,
      date,
      status: "present" as const,
      is_makeup: false,
    }));

  if (rows.length > 0) {
    const { error } = await supabase
      .from("sessions")
      .upsert(rows, { onConflict: "enrollment_id,date" });
    if (error) {
      return { success: false, message: "Failed to mark all present." };
    }
  }

  revalidateAttendanceViews();
  return {
    success: true,
    message:
      rows.length > 0
        ? `Marked ${rows.length} enrollment${rows.length === 1 ? "" : "s"} present.`
        : "Everyone already had a status for this day.",
  };
}

export async function addMakeupSession(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const date = String(formData.get("date") ?? "");
  const enrollmentId = String(formData.get("enrollment_id") ?? "");

  if (!date || !enrollmentId) {
    return { success: false, message: "Select an enrollment." };
  }

  const supabase = await createClient();
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("day_of_week")
    .eq("id", enrollmentId)
    .single();

  if (!enrollment) return { success: false, message: "Enrollment not found." };

  const isMakeup = enrollment.day_of_week !== parseISO(date).getDay();

  const { error } = await supabase.from("sessions").upsert(
    {
      enrollment_id: enrollmentId,
      date,
      status: "present",
      is_makeup: isMakeup,
    },
    { onConflict: "enrollment_id,date" },
  );

  if (error) return { success: false, message: "Failed to add session." };

  revalidateAttendanceViews();
  return { success: true, message: "Session added." };
}

export async function rescheduleSession(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const enrollmentId = String(formData.get("enrollment_id") ?? "");
  const fromDate = String(formData.get("from_date") ?? "");
  const toDate = String(formData.get("to_date") ?? "");

  if (!enrollmentId || !fromDate || !toDate) {
    return { success: false, message: "Pick a new date." };
  }
  if (fromDate === toDate) {
    return { success: false, message: "Pick a different date to reschedule to." };
  }

  const supabase = await createClient();
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("day_of_week")
    .eq("id", enrollmentId)
    .single();

  if (!enrollment) return { success: false, message: "Enrollment not found." };

  // The skipped original slot is recorded as "rescheduled" (distinct from
  // absent — the student isn't missing, the class just moved) and points at
  // where it moved to; the new date gets its own present session.
  const { error: fromError } = await supabase.from("sessions").upsert(
    {
      enrollment_id: enrollmentId,
      date: fromDate,
      status: "rescheduled",
      absence_reason: null,
      is_makeup: false,
      rescheduled_to_date: toDate,
    },
    { onConflict: "enrollment_id,date" },
  );
  if (fromError) return { success: false, message: "Failed to reschedule class." };

  const isMakeup = enrollment.day_of_week !== parseISO(toDate).getDay();
  const { error: toError } = await supabase.from("sessions").upsert(
    {
      enrollment_id: enrollmentId,
      date: toDate,
      status: "present",
      is_makeup: isMakeup,
      rescheduled_to_date: null,
    },
    { onConflict: "enrollment_id,date" },
  );
  if (toError) return { success: false, message: "Failed to reschedule class." };

  revalidateAttendanceViews();
  return { success: true, message: `Rescheduled to ${toDate}.` };
}

export async function deleteSessionWithUndo(
  sessionId: string,
): Promise<
  | { success: true; message: string; snapshot: ClassSession }
  | { success: false; message: string }
> {
  if (!sessionId) return { success: false, message: "Missing session." };

  const supabase = await createClient();
  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (!session) return { success: false, message: "Session not found." };

  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId);

  if (error) return { success: false, message: "Failed to delete session." };

  revalidateAttendanceViews();
  return { success: true, message: "Session deleted.", snapshot: session };
}

export async function restoreSession(
  snapshot: ClassSession,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("sessions").insert(snapshot);

  if (error) return { success: false, message: "Failed to restore session." };

  revalidateAttendanceViews();
  return { success: true, message: "Session restored." };
}

// A reschedule is two linked rows: the original date's "rescheduled" marker
// and the new date's "present" session. Canceling needs to remove both, not
// just the one the user clicked on.
export async function cancelReschedule(
  sessionId: string,
): Promise<
  | {
      success: true;
      message: string;
      snapshot: { from: ClassSession; to: ClassSession | null };
    }
  | { success: false; message: string }
> {
  if (!sessionId) return { success: false, message: "Missing session." };

  const supabase = await createClient();
  const { data: fromSession } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (!fromSession || fromSession.status !== "rescheduled") {
    return { success: false, message: "Session is not rescheduled." };
  }

  let toSession: ClassSession | null = null;
  if (fromSession.rescheduled_to_date) {
    const { data } = await supabase
      .from("sessions")
      .select("*")
      .eq("enrollment_id", fromSession.enrollment_id)
      .eq("date", fromSession.rescheduled_to_date)
      .maybeSingle();
    toSession = data;
  }

  const idsToDelete = [fromSession.id, ...(toSession ? [toSession.id] : [])];
  const { error } = await supabase.from("sessions").delete().in("id", idsToDelete);

  if (error) return { success: false, message: "Failed to cancel reschedule." };

  revalidateAttendanceViews();
  return {
    success: true,
    message: "Reschedule canceled.",
    snapshot: { from: fromSession, to: toSession },
  };
}

export async function restoreCanceledReschedule(
  snapshot: { from: ClassSession; to: ClassSession | null },
): Promise<ActionResult> {
  const supabase = await createClient();
  const rows = snapshot.to ? [snapshot.from, snapshot.to] : [snapshot.from];
  const { error } = await supabase.from("sessions").insert(rows);

  if (error) return { success: false, message: "Failed to restore reschedule." };

  revalidateAttendanceViews();
  return { success: true, message: "Reschedule restored." };
}

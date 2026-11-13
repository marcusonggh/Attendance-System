"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, ClassSession, DurationHours } from "@/lib/types";

function revalidateAttendanceViews() {
  revalidatePath("/attendance");
  revalidatePath("/attendance/day");
  revalidatePath("/attendance/month");
}

function parseDurationPart(raw: string): DurationHours | null {
  const n = Number(raw);
  return n === 0.5 || n === 0.75 || n === 1 || n === 1.5 || n === 2 ? n : null;
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

export async function updateSessionNotes(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const sessionId = String(formData.get("session_id") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!sessionId) return { success: false, message: "Missing session." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("sessions")
    .update({ notes: notes || null })
    .eq("id", sessionId);

  if (error) return { success: false, message: "Failed to save note." };

  revalidateAttendanceViews();
  return { success: true, message: "Note saved." };
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
  const hour = String(formData.get("hour") ?? "");
  const minute = String(formData.get("minute") ?? "");
  const duration = parseDurationPart(String(formData.get("duration") ?? ""));

  if (!date || !enrollmentId) {
    return { success: false, message: "Select an enrollment." };
  }
  if (!/^\d{2}$/.test(hour) || !/^\d{2}$/.test(minute) || !duration) {
    return { success: false, message: "Pick a time and duration." };
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
      start_time: `${hour}:${minute}`,
      duration_hours: duration,
    },
    { onConflict: "enrollment_id,date" },
  );

  if (error) return { success: false, message: "Failed to add session." };

  revalidateAttendanceViews();
  return { success: true, message: "Session added." };
}

// A missed class can be rescheduled into several parts across different
// dates (e.g. a missed 1.5hr class rebooked as three 0.5hr catch-up
// sessions) — to_date/to_hour/to_minute/to_duration are parallel arrays,
// one entry per part, submitted as repeated form fields.
export async function rescheduleSession(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const enrollmentId = String(formData.get("enrollment_id") ?? "");
  const fromDate = String(formData.get("from_date") ?? "");
  const toDates = formData.getAll("to_date").map(String);
  const toHours = formData.getAll("to_hour").map(String);
  const toMinutes = formData.getAll("to_minute").map(String);
  const toDurations = formData.getAll("to_duration").map(String);

  if (!enrollmentId || !fromDate || toDates.length === 0) {
    return { success: false, message: "Pick at least one date to reschedule to." };
  }

  const parts: { date: string; startTime: string; duration: DurationHours }[] = [];
  for (let i = 0; i < toDates.length; i++) {
    const date = toDates[i];
    const duration = parseDurationPart(toDurations[i] ?? "");
    if (
      !date ||
      !/^\d{2}$/.test(toHours[i] ?? "") ||
      !/^\d{2}$/.test(toMinutes[i] ?? "") ||
      !duration
    ) {
      return { success: false, message: "Fill in every reschedule date, time, and duration." };
    }
    if (date === fromDate) {
      return { success: false, message: "Pick a different date to reschedule to." };
    }
    parts.push({ date, startTime: `${toHours[i]}:${toMinutes[i]}`, duration });
  }

  if (new Set(parts.map((p) => p.date)).size !== parts.length) {
    return { success: false, message: "Each reschedule date must be different." };
  }

  const supabase = await createClient();
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("day_of_week")
    .eq("id", enrollmentId)
    .single();

  if (!enrollment) return { success: false, message: "Enrollment not found." };

  // Every row this reschedule touches shares a group id, so canceling it
  // later can find and remove every part together.
  const groupId = randomUUID();

  // The skipped original slot is recorded as "rescheduled" (distinct from
  // absent — the student isn't missing, the class just moved) and points at
  // the first part it moved to; each new date gets its own present session.
  const { error: fromError } = await supabase.from("sessions").upsert(
    {
      enrollment_id: enrollmentId,
      date: fromDate,
      status: "rescheduled",
      absence_reason: null,
      is_makeup: false,
      rescheduled_to_date: parts[0].date,
      reschedule_group_id: groupId,
      start_time: null,
      duration_hours: null,
    },
    { onConflict: "enrollment_id,date" },
  );
  if (fromError) return { success: false, message: "Failed to reschedule class." };

  const toRows = parts.map((part) => ({
    enrollment_id: enrollmentId,
    date: part.date,
    status: "present" as const,
    absence_reason: null,
    is_makeup: enrollment.day_of_week !== parseISO(part.date).getDay(),
    rescheduled_to_date: null,
    reschedule_group_id: groupId,
    start_time: part.startTime,
    duration_hours: part.duration,
  }));

  const { error: toError } = await supabase
    .from("sessions")
    .upsert(toRows, { onConflict: "enrollment_id,date" });
  if (toError) return { success: false, message: "Failed to reschedule class." };

  revalidateAttendanceViews();
  return {
    success: true,
    message:
      parts.length === 1
        ? `Rescheduled to ${parts[0].date}.`
        : `Rescheduled to ${parts.length} dates.`,
  };
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

// A reschedule can be several linked rows: the original date's "rescheduled"
// marker plus every make-up part it created, all sharing reschedule_group_id.
// Canceling needs to remove all of them, not just the one the user clicked.
export async function cancelReschedule(
  sessionId: string,
): Promise<
  | { success: true; message: string; snapshot: ClassSession[] }
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

  let group: ClassSession[];
  if (fromSession.reschedule_group_id) {
    const { data } = await supabase
      .from("sessions")
      .select("*")
      .eq("reschedule_group_id", fromSession.reschedule_group_id);
    group = (data?.length ? data : [fromSession]) as ClassSession[];
  } else if (fromSession.rescheduled_to_date) {
    // Reschedule created before parts were linked by group id.
    const { data: toSession } = await supabase
      .from("sessions")
      .select("*")
      .eq("enrollment_id", fromSession.enrollment_id)
      .eq("date", fromSession.rescheduled_to_date)
      .maybeSingle();
    group = toSession ? [fromSession, toSession] : [fromSession];
  } else {
    group = [fromSession];
  }

  const ids = group.map((s) => s.id);
  const { error } = await supabase.from("sessions").delete().in("id", ids);

  if (error) return { success: false, message: "Failed to cancel reschedule." };

  revalidateAttendanceViews();
  return {
    success: true,
    message:
      group.length > 1
        ? `Reschedule canceled (${group.length} sessions removed).`
        : "Reschedule canceled.",
    snapshot: group,
  };
}

export async function restoreCanceledReschedule(
  snapshot: ClassSession[],
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("sessions").insert(snapshot);

  if (error) return { success: false, message: "Failed to restore reschedule." };

  revalidateAttendanceViews();
  return { success: true, message: "Reschedule restored." };
}

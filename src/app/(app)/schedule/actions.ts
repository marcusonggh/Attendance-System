"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  ActionResult,
  DurationHours,
  Enrollment,
  Level,
  Subject,
} from "@/lib/types";

function revalidateScheduleViews() {
  revalidatePath("/schedule");
  revalidatePath("/attendance");
  revalidatePath("/students");
}

function parseDuration(formData: FormData): DurationHours | null {
  const raw = Number(formData.get("duration_hours"));
  return raw === 1 || raw === 1.5 || raw === 2 ? raw : null;
}

function parseStartTime(formData: FormData): string | null {
  const hour = String(formData.get("start_time_hour") ?? "");
  const minute = String(formData.get("start_time_minute") ?? "");
  if (!/^\d{2}$/.test(hour) || !/^\d{2}$/.test(minute)) return null;
  return `${hour}:${minute}`;
}

// end_date is optional ("" means recurs indefinitely); start_date is required.
function parseDateRange(
  formData: FormData,
): { startDate: string; endDate: string | null } | null {
  const startDate = String(formData.get("start_date") ?? "").trim();
  const endDate = String(formData.get("end_date") ?? "").trim();
  if (!startDate) return null;
  if (endDate && endDate < startDate) return null;
  return { startDate, endDate: endDate || null };
}

export async function addEnrollment(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const studentId = String(formData.get("student_id") ?? "");
  const subject = String(formData.get("subject") ?? "") as Subject;
  const level = String(formData.get("level") ?? "") as Level;
  const groupSize = Number(formData.get("group_size"));
  const dayOfWeek = Number(formData.get("day_of_week"));
  const startTime = parseStartTime(formData);
  const durationHours = parseDuration(formData);
  const location = String(formData.get("location") ?? "").trim();
  const dateRange = parseDateRange(formData);

  if (
    !studentId ||
    !subject ||
    (level !== "preschool" && level !== "primary") ||
    (groupSize !== 1 && groupSize !== 2) ||
    Number.isNaN(dayOfWeek) ||
    dayOfWeek < 0 ||
    dayOfWeek > 6 ||
    startTime === null ||
    durationHours === null ||
    dateRange === null
  ) {
    return { success: false, message: "Fill in all enrollment details." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("enrollments").insert({
    student_id: studentId,
    subject,
    level,
    group_size: groupSize,
    day_of_week: dayOfWeek,
    start_time: startTime,
    duration_hours: durationHours,
    location,
    start_date: dateRange.startDate,
    end_date: dateRange.endDate,
  });

  if (error) return { success: false, message: "Failed to add enrollment." };

  revalidateScheduleViews();
  return { success: true, message: "Enrollment added." };
}

export async function updateEnrollment(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const subject = String(formData.get("subject") ?? "") as Subject;
  const level = String(formData.get("level") ?? "") as Level;
  const groupSize = Number(formData.get("group_size"));
  const dayOfWeek = Number(formData.get("day_of_week"));
  const startTime = parseStartTime(formData);
  const durationHours = parseDuration(formData);
  const location = String(formData.get("location") ?? "").trim();
  const dateRange = parseDateRange(formData);

  if (
    !id ||
    !subject ||
    (level !== "preschool" && level !== "primary") ||
    (groupSize !== 1 && groupSize !== 2) ||
    Number.isNaN(dayOfWeek) ||
    dayOfWeek < 0 ||
    dayOfWeek > 6 ||
    startTime === null ||
    durationHours === null ||
    dateRange === null
  ) {
    return { success: false, message: "Fill in all enrollment details." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("enrollments")
    .update({
      subject,
      level,
      group_size: groupSize,
      day_of_week: dayOfWeek,
      start_time: startTime,
      duration_hours: durationHours,
      location,
      start_date: dateRange.startDate,
      end_date: dateRange.endDate,
    })
    .eq("id", id);

  if (error) return { success: false, message: "Failed to save enrollment." };

  revalidateScheduleViews();
  return { success: true, message: "Enrollment updated." };
}

export async function toggleEnrollmentActive(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";

  if (!id) return { success: false, message: "Missing enrollment." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("enrollments")
    .update({ active: !active })
    .eq("id", id);

  if (error) return { success: false, message: "Failed to update status." };

  revalidateScheduleViews();
  return {
    success: true,
    message: active ? "Enrollment deactivated." : "Enrollment activated.",
  };
}

export async function deleteEnrollmentWithUndo(
  id: string,
): Promise<
  | { success: true; message: string; snapshot: Enrollment }
  | { success: false; message: string }
> {
  if (!id) return { success: false, message: "Missing enrollment." };

  const supabase = await createClient();
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("*")
    .eq("id", id)
    .single();

  if (!enrollment) return { success: false, message: "Enrollment not found." };

  const { error } = await supabase.from("enrollments").delete().eq("id", id);

  if (error) return { success: false, message: "Failed to delete enrollment." };

  revalidateScheduleViews();
  return {
    success: true,
    message: "Enrollment deleted.",
    snapshot: enrollment,
  };
}

export async function restoreEnrollment(
  snapshot: Enrollment,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("enrollments").insert(snapshot);

  if (error) return { success: false, message: "Failed to restore enrollment." };

  revalidateScheduleViews();
  return { success: true, message: "Enrollment restored." };
}

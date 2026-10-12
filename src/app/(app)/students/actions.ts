"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export async function addStudent(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const parentContact = String(formData.get("parent_contact") ?? "").trim();

  if (!name) return { success: false, message: "Name is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("students").insert({
    name,
    parent_contact: parentContact || null,
  });

  if (error) return { success: false, message: "Failed to add student." };

  revalidatePath("/students");
  return { success: true, message: `${name} added.` };
}

export async function updateStudent(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const parentContact = String(formData.get("parent_contact") ?? "").trim();

  if (!id || !name) return { success: false, message: "Name is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .update({
      name,
      parent_contact: parentContact || null,
    })
    .eq("id", id);

  if (error) return { success: false, message: "Failed to save changes." };

  revalidatePath("/students");
  revalidatePath("/invoices");
  return { success: true, message: "Student updated." };
}

export async function toggleActive(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";

  if (!id) return { success: false, message: "Missing student." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .update({ active: !active })
    .eq("id", id);

  if (error) return { success: false, message: "Failed to update status." };

  revalidatePath("/students");
  return {
    success: true,
    message: active ? "Student deactivated." : "Student activated.",
  };
}

export async function saveStudentRate(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const studentId = String(formData.get("student_id") ?? "");
  const level = String(formData.get("level") ?? "");
  const groupSize = Number(formData.get("group_size"));
  const raw = String(formData.get("rate") ?? "").trim();

  if (
    !studentId ||
    (level !== "preschool" && level !== "primary") ||
    (groupSize !== 1 && groupSize !== 2)
  ) {
    return { success: false, message: "Missing student or tier." };
  }

  const supabase = await createClient();

  // Blank clears the override, falling back to the shared default rate.
  if (!raw) {
    const { error } = await supabase
      .from("student_rates")
      .delete()
      .eq("student_id", studentId)
      .eq("level", level)
      .eq("group_size", groupSize);

    if (error) return { success: false, message: "Failed to clear rate." };
    revalidatePath("/students");
    revalidatePath("/invoices");
    return { success: true, message: "Rate reset to default." };
  }

  const rate = Number(raw);
  if (Number.isNaN(rate) || rate < 0) {
    return { success: false, message: "Enter a valid rate." };
  }

  const { error } = await supabase.from("student_rates").upsert(
    { student_id: studentId, level, group_size: groupSize, rate },
    { onConflict: "student_id,level,group_size" },
  );

  if (error) return { success: false, message: "Failed to save rate." };

  revalidatePath("/students");
  revalidatePath("/invoices");
  return { success: true, message: "Rate saved." };
}

export async function saveRateCard(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const preschool1 = Number(formData.get("rate_preschool_1"));
  const preschool2 = Number(formData.get("rate_preschool_2"));
  const primary1 = Number(formData.get("rate_primary_1"));
  const primary2 = Number(formData.get("rate_primary_2"));

  if (
    Number.isNaN(preschool1) ||
    Number.isNaN(preschool2) ||
    Number.isNaN(primary1) ||
    Number.isNaN(primary2)
  ) {
    return { success: false, message: "Enter valid rates for every tier." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("rate_card").upsert(
    [
      { level: "preschool", group_size: 1, rate: preschool1 },
      { level: "preschool", group_size: 2, rate: preschool2 },
      { level: "primary", group_size: 1, rate: primary1 },
      { level: "primary", group_size: 2, rate: primary2 },
    ],
    { onConflict: "level,group_size" },
  );

  if (error) return { success: false, message: "Failed to save rates." };

  revalidatePath("/students");
  revalidatePath("/invoices");
  return { success: true, message: "Rates saved." };
}

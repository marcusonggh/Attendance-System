"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export async function addStudent(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const parentName = String(formData.get("parent_name") ?? "").trim();
  const parentContact = String(formData.get("parent_contact") ?? "").trim();

  if (!name) return { success: false, message: "Name is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("students").insert({
    name,
    parent_name: parentName || null,
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
  const parentName = String(formData.get("parent_name") ?? "").trim();
  const parentContact = String(formData.get("parent_contact") ?? "").trim();

  if (!id || !name) return { success: false, message: "Name is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .update({
      name,
      parent_name: parentName || null,
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
  const bucket = String(formData.get("bucket") ?? "");
  const raw = String(formData.get("rate") ?? "").trim();

  if (
    !studentId ||
    (level !== "preschool" && level !== "primary") ||
    (bucket !== "small" && bucket !== "large")
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
      .eq("bucket", bucket);

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
    { student_id: studentId, level, bucket, rate },
    { onConflict: "student_id,level,bucket" },
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
  const preschoolSmall = Number(formData.get("rate_preschool_small"));
  const preschoolLarge = Number(formData.get("rate_preschool_large"));
  const primarySmall = Number(formData.get("rate_primary_small"));
  const primaryLarge = Number(formData.get("rate_primary_large"));

  if (
    Number.isNaN(preschoolSmall) ||
    Number.isNaN(preschoolLarge) ||
    Number.isNaN(primarySmall) ||
    Number.isNaN(primaryLarge)
  ) {
    return { success: false, message: "Enter valid rates for every tier." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("rate_card").upsert(
    [
      { level: "preschool", bucket: "small", rate: preschoolSmall },
      { level: "preschool", bucket: "large", rate: preschoolLarge },
      { level: "primary", bucket: "small", rate: primarySmall },
      { level: "primary", bucket: "large", rate: primaryLarge },
    ],
    { onConflict: "level,bucket" },
  );

  if (error) return { success: false, message: "Failed to save rates." };

  revalidatePath("/students");
  revalidatePath("/invoices");
  return { success: true, message: "Rates saved." };
}

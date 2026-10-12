import { DollarSign, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Enrollment, RateCard, Student, StudentRate } from "@/lib/types";
import { getRate } from "@/lib/rateCard";
import { addStudent, saveRateCard } from "./actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { ActionForm } from "@/components/ui/ActionForm";
import { StudentList } from "./StudentList";

const RATE_TIERS = [
  { level: "preschool" as const, groupSize: 1 as const, label: "Preschool 1:1", name: "rate_preschool_1" },
  { level: "preschool" as const, groupSize: 2 as const, label: "Preschool 1:2", name: "rate_preschool_2" },
  { level: "primary" as const, groupSize: 1 as const, label: "Primary 1:1", name: "rate_primary_1" },
  { level: "primary" as const, groupSize: 2 as const, label: "Primary 1:2", name: "rate_primary_2" },
];

export default async function StudentsPage() {
  const supabase = await createClient();
  const [{ data }, { data: enrollmentData }, { data: rateData }, { data: studentRateData }] =
    await Promise.all([
      supabase.from("students").select("*").order("name"),
      supabase.from("enrollments").select("*"),
      supabase.from("rate_card").select("*"),
      supabase.from("student_rates").select("*"),
    ]);
  const students = (data ?? []) as Student[];
  const enrollments = (enrollmentData ?? []) as Enrollment[];
  const rateCard = (rateData ?? []) as RateCard[];
  const studentRates = (studentRateData ?? []) as StudentRate[];

  return (
    <div className="space-y-8">
      <section>
        <PageHeader title="Add Student" />
        <Card>
          <ActionForm
            action={addStudent}
            resetOnSuccess
            className="flex flex-wrap items-end gap-3"
          >
            <Field label="Name">
              <input name="name" required className={inputClass} />
            </Field>
            <Field label="Parent name">
              <input name="parent_name" className={inputClass} />
            </Field>
            <Field label="Parent contact">
              <input name="parent_contact" className={inputClass} />
            </Field>
            <Button type="submit">
              <UserPlus className="h-4 w-4" />
              Add
            </Button>
          </ActionForm>
        </Card>
      </section>

      <section>
        <PageHeader title="Students" />
        <StudentList
          students={students}
          enrollments={enrollments}
          rateCard={rateCard}
          studentRates={studentRates}
        />
      </section>

      <section>
        <PageHeader
          title="Default Rates"
          description="Flat monthly rate per level and group size, shared by every student unless a student has their own rate for that tier (set on their card above)."
        />
        <ActionForm action={saveRateCard} className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {RATE_TIERS.map((tier) => (
              <Card key={tier.name} className="flex items-center gap-3">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                  <DollarSign className="h-4 w-4" />
                </span>
                <Field label={`${tier.label} / month`} className="flex-1">
                  <input
                    id={tier.name}
                    name={tier.name}
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    defaultValue={getRate(rateCard, tier.level, tier.groupSize)}
                    className={`w-full ${inputClass}`}
                  />
                </Field>
              </Card>
            ))}
          </div>
          <div className="flex justify-end">
            <Button type="submit">Save Default Rates</Button>
          </div>
        </ActionForm>
      </section>
    </div>
  );
}

import { DollarSign, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { GROUP_BUCKET_LABELS, type Enrollment, type RateCard, type Student, type StudentRate } from "@/lib/types";
import { getBucketRate } from "@/lib/rateCard";
import { addStudent, saveRateCard } from "./actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { ActionForm } from "@/components/ui/ActionForm";
import { StudentList } from "./StudentList";

const RATE_TIERS = [
  {
    level: "preschool" as const,
    bucket: "small" as const,
    label: `Preschool ${GROUP_BUCKET_LABELS.small}`,
    name: "rate_preschool_small",
  },
  {
    level: "preschool" as const,
    bucket: "large" as const,
    label: `Preschool ${GROUP_BUCKET_LABELS.large}`,
    name: "rate_preschool_large",
  },
  {
    level: "primary" as const,
    bucket: "small" as const,
    label: `Primary ${GROUP_BUCKET_LABELS.small}`,
    name: "rate_primary_small",
  },
  {
    level: "primary" as const,
    bucket: "large" as const,
    label: `Primary ${GROUP_BUCKET_LABELS.large}`,
    name: "rate_primary_large",
  },
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
          description="Flat monthly rate per level and group size — 1:1/1:2 share one rate and 1:3/1:4 share another. Shared by every student unless a student has their own rate for that tier (set on their card above)."
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
                    defaultValue={getBucketRate(rateCard, tier.level, tier.bucket)}
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

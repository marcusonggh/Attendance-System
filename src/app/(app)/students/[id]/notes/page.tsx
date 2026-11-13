import { format, parseISO } from "date-fns";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { ClassSession, Enrollment, Student } from "@/lib/types";
import { groupSizeLabel, sessionTimeRange, subjectLabel } from "@/lib/rateCard";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function StudentNotesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: studentId } = await params;

  const supabase = await createClient();

  const [{ data: studentData }, { data: enrollmentData }] = await Promise.all([
    supabase.from("students").select("*").eq("id", studentId).single(),
    supabase.from("enrollments").select("*").eq("student_id", studentId),
  ]);

  const student = studentData as Student | null;
  const enrollments = (enrollmentData ?? []) as Enrollment[];
  const enrollmentById = new Map(enrollments.map((e) => [e.id, e]));

  if (!student) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Student not found.
      </p>
    );
  }

  const enrollmentIds = enrollments.map((e) => e.id);
  const { data: sessionRows } =
    enrollmentIds.length > 0
      ? await supabase
          .from("sessions")
          .select("*")
          .in("enrollment_id", enrollmentIds)
          .not("notes", "is", null)
          .order("date", { ascending: false })
      : { data: [] as ClassSession[] };

  const sessions = (sessionRows ?? []) as ClassSession[];

  return (
    <div className="space-y-6">
      <Link
        href="/students"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-teal-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to students
      </Link>

      <PageHeader
        title={`${student.name} — Notes`}
        description="Every session note left for this student, most recent first."
      />

      <div className="space-y-2">
        {sessions.map((session) => {
          const enrollment = enrollmentById.get(session.enrollment_id);
          return (
            <Card key={session.id}>
              <p className="text-sm font-medium">
                {format(parseISO(session.date), "MMM d, yyyy")}
                {enrollment && ` · ${subjectLabel(enrollment.subject)}`}
              </p>
              {enrollment && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {groupSizeLabel(enrollment.group_size)} ·{" "}
                  {sessionTimeRange(session, enrollment)}
                </p>
              )}
              <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                {session.notes}
              </p>
            </Card>
          );
        })}
        {sessions.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No notes yet. Add one from a session on the Attendance page.
          </p>
        )}
      </div>
    </div>
  );
}

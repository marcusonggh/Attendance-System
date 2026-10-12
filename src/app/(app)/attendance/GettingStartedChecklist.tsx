import Link from "next/link";
import { Check, Circle } from "lucide-react";
import { Card } from "@/components/ui/Card";

function ChecklistItem({
  done,
  label,
  href,
}: {
  done: boolean;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 text-sm ${
        done ? "text-zinc-500 line-through" : "text-teal-800 hover:underline"
      }`}
    >
      {done ? (
        <Check className="h-4 w-4 flex-none text-green-600" />
      ) : (
        <Circle className="h-4 w-4 flex-none text-teal-400" />
      )}
      {label}
    </Link>
  );
}

export function GettingStartedChecklist({
  hasStudents,
  hasSchedule,
  hasPricing,
}: {
  hasStudents: boolean;
  hasSchedule: boolean;
  hasPricing: boolean;
}) {
  if (hasStudents && hasSchedule && hasPricing) return null;

  return (
    <Card className="border-teal-200 bg-teal-50">
      <h2 className="mb-3 font-medium text-teal-800">Finish setting up</h2>
      <div className="space-y-2">
        <ChecklistItem done={hasStudents} label="Add your students" href="/students" />
        <ChecklistItem
          done={hasSchedule}
          label="Add an enrollment"
          href="/schedule"
        />
        <ChecklistItem
          done={hasPricing}
          label="Set rates"
          href="/students"
        />
      </div>
    </Card>
  );
}

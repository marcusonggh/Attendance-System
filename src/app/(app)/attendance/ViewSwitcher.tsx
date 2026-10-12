import Link from "next/link";

type View = "day" | "week" | "month";

export function ViewSwitcher({
  active,
  anchor,
}: {
  active: View;
  anchor: string;
}) {
  const tabs: { key: View; label: string; href: string }[] = [
    { key: "day", label: "Day", href: `/attendance/day?date=${anchor}` },
    { key: "week", label: "Week", href: `/attendance?week=${anchor}` },
    { key: "month", label: "Month", href: `/attendance/month?month=${anchor}` },
  ];

  return (
    <div className="inline-flex rounded-md border border-zinc-300 p-0.5">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
            tab.key === active
              ? "bg-teal-600 text-white"
              : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

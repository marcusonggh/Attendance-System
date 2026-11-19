import { HOUR_OPTIONS, type Enrollment } from "@/lib/types";

// Weekdays only (day_of_week 1-5) — this tutoring schedule doesn't run
// weekends, so Sat/Sun columns would just be two empty columns every row.
const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKDAY_ABBR = ["Mon", "Tue", "Wed", "Thu", "Fri"];

function formatHour(hour: number): string {
  const period = hour >= 12 ? "pm" : "am";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}${period}`;
}

export function ScheduleHeatmap({ enrollments }: { enrollments: Enrollment[] }) {
  const counts = new Map<string, number>();
  let max = 0;
  for (const e of enrollments) {
    const hour = Number(e.start_time.slice(0, 2));
    const key = `${e.day_of_week}-${hour}`;
    const next = (counts.get(key) ?? 0) + 1;
    counts.set(key, next);
    if (next > max) max = next;
  }

  // Hide hour rows with no class on any weekday — an empty row is just
  // noise once the schedule has gaps (early morning, late evening, etc).
  const hours = HOUR_OPTIONS.map((h) => Number(h.value)).filter((hour) =>
    WEEKDAYS.some((day) => (counts.get(`${day}-${hour}`) ?? 0) > 0),
  );

  if (hours.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        No active classes scheduled yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[360px] border-collapse text-xs">
        <thead>
          <tr>
            <th className="w-10" />
            {WEEKDAY_ABBR.map((d) => (
              <th
                key={d}
                className="pb-1.5 text-center font-medium text-zinc-500 dark:text-zinc-400"
              >
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hours.map((hour) => (
            <tr key={hour}>
              <td className="pr-2 text-right tabular-nums text-zinc-500 dark:text-zinc-400">
                {formatHour(hour)}
              </td>
              {WEEKDAYS.map((day) => {
                const count = counts.get(`${day}-${hour}`) ?? 0;
                const intensity = max > 0 ? count / max : 0;
                return (
                  <td key={day} className="p-1">
                    <div
                      className={`flex h-8 items-center justify-center rounded ${
                        count === 0 ? "bg-zinc-100 dark:bg-zinc-800/60" : ""
                      }`}
                      style={
                        count > 0
                          ? { backgroundColor: `rgba(13, 148, 136, ${0.18 + intensity * 0.72})` }
                          : undefined
                      }
                      title={
                        count > 0
                          ? `${count} class${count > 1 ? "es" : ""} at ${formatHour(hour)}`
                          : `Free at ${formatHour(hour)}`
                      }
                    >
                      {count > 0 && (
                        <span
                          className={
                            intensity > 0.55
                              ? "text-white"
                              : "text-teal-900 dark:text-teal-100"
                          }
                        >
                          {count}
                        </span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import { addMinutes, format, parse } from "date-fns";
import {
  SUBJECTS,
  WEEKDAY_LABELS,
  type ClassSession,
  type DurationHours,
  type Enrollment,
  type Level,
  type RateCard,
  type StudentRate,
} from "./types";

export function getRate(
  rateCard: RateCard[],
  level: Level,
  groupSize: 1 | 2,
): number {
  return (
    rateCard.find((r) => r.level === level && r.group_size === groupSize)
      ?.rate ?? 0
  );
}

// A student's own rate for this tier (if set) overrides the level/group_size
// default for every one of their enrollments in that tier. The tier rate is
// defined per 1-hour class, so it scales with the enrollment's actual
// duration — a 1.5 hour class costs 1.5x, a 45-minute class costs 0.75x.
export function getEffectiveRate(
  studentRates: StudentRate[],
  rateCard: RateCard[],
  enrollment: Enrollment,
): number {
  const override = studentRates.find(
    (r) =>
      r.student_id === enrollment.student_id &&
      r.level === enrollment.level &&
      r.group_size === enrollment.group_size,
  );
  const baseRate = override
    ? Number(override.rate)
    : getRate(rateCard, enrollment.level, enrollment.group_size);
  return baseRate * enrollment.duration_hours;
}

export function subjectLabel(subject: string): string {
  return SUBJECTS.find((s) => s.value === subject)?.label ?? subject;
}

export function groupSizeLabel(groupSize: 1 | 2): string {
  return `1:${groupSize}`;
}

export function formatTimeRange(
  startTime: string,
  durationHours: DurationHours = 1,
): string {
  const start = parse(startTime.slice(0, 5), "HH:mm", new Date());
  const end = addMinutes(start, durationHours * 60);
  const fmt = (d: Date) => format(d, "h:mma").toLowerCase();
  return `${fmt(start)}-${fmt(end)}`;
}

export function formatDayTime(enrollment: Enrollment): string {
  return `${WEEKDAY_LABELS[enrollment.day_of_week]} ${formatTimeRange(enrollment.start_time, enrollment.duration_hours)}`;
}

// A session can override the enrollment's normal weekly start_time/duration
// (e.g. one part of a split reschedule) — fall back to the enrollment's own
// slot when it doesn't.
export function sessionTimeRange(
  session: Pick<ClassSession, "start_time" | "duration_hours"> | undefined,
  enrollment: Enrollment,
): string {
  return formatTimeRange(
    session?.start_time ?? enrollment.start_time,
    session?.duration_hours ?? enrollment.duration_hours,
  );
}

// Two 1:2 enrollments are the "same class" if they share every detail of
// the slot — there's no actual link between them in the data model, just
// convention, so this is a best-effort match used purely for display
// (combining them into one card instead of two identical-looking ones).
function pairingKey(e: Enrollment): string {
  return `${e.day_of_week}|${e.start_time}|${e.subject}|${e.level}|${e.location}`;
}

// Groups enrollments that look like the same shared 1:2 class together,
// preserving the input order otherwise. Each result is 1 item (no match, or
// group_size 1) or 2+ items (a matched group — normally 2, but matches
// however many share the slot).
export function groupPairedEnrollments<T extends Enrollment>(items: T[]): T[][] {
  const output: T[][] = [];
  const pending = new Map<string, T[]>();
  for (const item of items) {
    if (item.group_size !== 2) {
      output.push([item]);
      continue;
    }
    const key = pairingKey(item);
    const existing = pending.get(key);
    if (existing) {
      existing.push(item);
    } else {
      const group = [item];
      pending.set(key, group);
      output.push(group);
    }
  }
  return output;
}

// Whether this enrollment's weekly class actually falls on this date —
// matching day_of_week isn't enough once the class has a start/end date.
export function isScheduledOn(enrollment: Enrollment, dateStr: string): boolean {
  if (dateStr < enrollment.start_date) return false;
  if (enrollment.end_date && dateStr > enrollment.end_date) return false;
  return true;
}

// Whether this enrollment should be billed for a given month — it must
// have started by the end of the month, and not have ended before the
// month began.
export function overlapsMonth(
  enrollment: Enrollment,
  monthStartStr: string,
  monthEndStr: string,
): boolean {
  if (enrollment.start_date > monthEndStr) return false;
  if (enrollment.end_date && enrollment.end_date < monthStartStr) return false;
  return true;
}

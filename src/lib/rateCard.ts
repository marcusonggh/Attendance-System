import { addMinutes, format, parse } from "date-fns";
import {
  SUBJECTS,
  WEEKDAY_LABELS,
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
// default for every one of their enrollments in that tier.
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
  if (override) return Number(override.rate);
  return getRate(rateCard, enrollment.level, enrollment.group_size);
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
  const fmt = (d: Date) =>
    format(d, d.getMinutes() === 0 ? "ha" : "h:mma").toLowerCase();
  return `${fmt(start)}-${fmt(end)}`;
}

export function formatDayTime(enrollment: Enrollment): string {
  return `${WEEKDAY_LABELS[enrollment.day_of_week]} ${formatTimeRange(enrollment.start_time, enrollment.duration_hours)}`;
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

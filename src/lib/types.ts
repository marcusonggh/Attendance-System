export interface Student {
  id: string;
  name: string;
  parent_name: string | null;
  parent_contact: string | null;
  active: boolean;
  created_at: string;
}

export const SUBJECTS = [
  { value: "mandarin", label: "Mandarin" },
  { value: "math", label: "Math" },
  { value: "science", label: "Science" },
  { value: "english", label: "English" },
  { value: "bahasa", label: "Bahasa" },
] as const;

export type Subject = (typeof SUBJECTS)[number]["value"];

export type Level = "preschool" | "primary";

// Billing (and the enrollment form itself) only ever distinguishes two
// categories: "small" (1:1 private, or 1:2 priced the same as 1:1) and
// "large" (1:3/1:4, priced differently from small). The exact headcount of
// a group class isn't stored anywhere — it's an emergent property of how
// many enrollments share the same day/time/subject/level/location slot
// (see groupPairedEnrollments in src/lib/rateCard.ts).
export type GroupBucket = "small" | "large";
export const GROUP_BUCKET_LABELS: Record<GroupBucket, string> = {
  small: "1:1",
  large: "1:X",
};

export type DurationHours = 0.5 | 0.75 | 1 | 1.5 | 2;

export const DURATION_OPTIONS: { value: DurationHours; label: string }[] = [
  { value: 0.5, label: "30 minutes" },
  { value: 0.75, label: "45 minutes" },
  { value: 1, label: "1 hour" },
  { value: 1.5, label: "1 hour 30 minutes" },
  { value: 2, label: "2 hours" },
];

export interface Enrollment {
  id: string;
  student_id: string;
  subject: Subject;
  level: Level;
  group_size: GroupBucket;
  day_of_week: number;
  start_time: string;
  duration_hours: DurationHours;
  location: string;
  start_date: string;
  end_date: string | null;
  active: boolean;
  created_at: string;
}

export interface RateCard {
  level: Level;
  bucket: GroupBucket;
  rate: number;
}

// A student's own rate for a tier (level + group bucket), overriding the
// RateCard default for every one of their enrollments in that tier.
export interface StudentRate {
  student_id: string;
  level: Level;
  bucket: GroupBucket;
  rate: number;
}

export type SessionStatus = "present" | "absent" | "rescheduled";

export interface ClassSession {
  id: string;
  enrollment_id: string;
  date: string;
  status: SessionStatus;
  absence_reason: string | null;
  is_makeup: boolean;
  rescheduled_to_date: string | null;
  // Links every session belonging to one reschedule (the original
  // "rescheduled" row plus each make-up part it created) so they can all be
  // found and canceled together, however many parts there are.
  reschedule_group_id: string | null;
  // Overrides the enrollment's normal weekly start_time/duration_hours for
  // display only — null means "use the enrollment's own slot".
  start_time: string | null;
  duration_hours: DurationHours | null;
  notes: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  student_id: string;
  year_month: string;
  sessions_attended: number;
  amount_owed: number;
  status: "paid" | "unpaid";
  paid_at: string | null;
  created_at: string;
}

export type ActionResult = { success: boolean; message: string } | undefined;

export const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// Classes only run from 11am onward.
export const HOUR_OPTIONS = Array.from({ length: 13 }, (_, i) => {
  const hour = 11 + i;
  const value = String(hour).padStart(2, "0");
  return { value, label: value };
});

export const MINUTE_OPTIONS = [
  { value: "00", label: ":00" },
  { value: "15", label: ":15" },
  { value: "30", label: ":30" },
  { value: "45", label: ":45" },
];

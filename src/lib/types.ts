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

export type DurationHours = 0.5 | 0.75 | 1 | 1.5 | 2;

export const DURATION_OPTIONS: { value: DurationHours; label: string }[] = [
  { value: 0.5, label: "0.5 hours" },
  { value: 0.75, label: "0.75 hours" },
  { value: 1, label: "1 hour" },
  { value: 1.5, label: "1.5 hours" },
  { value: 2, label: "2 hours" },
];

export interface Enrollment {
  id: string;
  student_id: string;
  subject: Subject;
  level: Level;
  group_size: 1 | 2;
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
  group_size: 1 | 2;
  rate: number;
}

// A student's own rate for a tier (level + group size), overriding the
// RateCard default for every one of their enrollments in that tier.
export interface StudentRate {
  student_id: string;
  level: Level;
  group_size: 1 | 2;
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
  created_at: string;
}

export interface Invoice {
  id: string;
  enrollment_id: string;
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

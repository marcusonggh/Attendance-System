import { DURATION_OPTIONS, HOUR_OPTIONS, MINUTE_OPTIONS } from "@/lib/types";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";

// A make-up class doesn't have a normal weekly slot to fall back on, so its
// time and duration need to be entered explicitly rather than inherited
// from the enrollment.
export function TimeDurationFields({
  defaultHour = "15",
  defaultMinute = "00",
  defaultDuration = "1",
}: {
  defaultHour?: string;
  defaultMinute?: string;
  defaultDuration?: string;
}) {
  return (
    <>
      <Field label="Time">
        <div className="flex gap-1.5">
          <Select name="hour" defaultValue={defaultHour} required>
            {HOUR_OPTIONS.map((h) => (
              <option key={h.value} value={h.value}>
                {h.label}
              </option>
            ))}
          </Select>
          <Select name="minute" defaultValue={defaultMinute} required>
            {MINUTE_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </div>
      </Field>
      <Field label="Duration">
        <Select name="duration" defaultValue={defaultDuration} required>
          {DURATION_OPTIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </Select>
      </Field>
    </>
  );
}

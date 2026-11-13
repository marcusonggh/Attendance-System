import { HOUR_OPTIONS, MINUTE_OPTIONS } from "@/lib/types";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";

export function StartTimeFields({
  defaultHour,
  defaultMinute,
}: {
  defaultHour?: string;
  defaultMinute?: string;
}) {
  return (
    <Field label="Start time">
      <div className="flex gap-1.5">
        <Select
          name="start_time_hour"
          defaultValue={defaultHour}
          required
          className="flex-1"
        >
          {HOUR_OPTIONS.map((h) => (
            <option key={h.value} value={h.value}>
              {h.label}
            </option>
          ))}
        </Select>
        <Select
          name="start_time_minute"
          defaultValue={defaultMinute}
          required
          className="flex-1"
        >
          {MINUTE_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
      </div>
    </Field>
  );
}

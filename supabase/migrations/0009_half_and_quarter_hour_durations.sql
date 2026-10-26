-- Allow 0.5 and 0.75 hour durations too. The column was numeric(2,1),
-- which can't hold 0.75 (2 decimal places) without rounding it — widen it
-- to numeric(3,2) first, then replace the check constraint (found by
-- definition rather than a guessed name, consistent with how a similar
-- constraint was handled in 0005).
alter table enrollments alter column duration_hours type numeric(3,2);

do $$
declare
  r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'enrollments'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%duration_hours%'
  loop
    execute format('alter table enrollments drop constraint %I', r.conname);
  end loop;
end $$;

alter table enrollments add constraint enrollments_duration_hours_check
  check (duration_hours in (0.5, 0.75, 1, 1.5, 2));

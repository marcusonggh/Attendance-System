-- Group size is no longer preschool-only: a primary student can also be
-- taught 1:2. Drop the cross-field checks that enforced primary => 1:1
-- (found by definition rather than by guessed name, since Postgres's
-- auto-generated constraint names didn't match what we assumed).
do $$
declare
  r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'rate_card'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%level%'
      and pg_get_constraintdef(oid) ilike '%group_size%'
  loop
    execute format('alter table rate_card drop constraint %I', r.conname);
  end loop;

  for r in
    select conname from pg_constraint
    where conrelid = 'enrollments'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%level%'
      and pg_get_constraintdef(oid) ilike '%group_size%'
  loop
    execute format('alter table enrollments drop constraint %I', r.conname);
  end loop;
end $$;

-- Seed a rate_card row for primary/2 (starting from primary/1's rate,
-- editable afterwards on the Students page).
insert into rate_card (level, group_size, rate)
select 'primary', 2, rate from rate_card where level = 'primary' and group_size = 1
on conflict (level, group_size) do nothing;

-- Classes aren't always 1 hour — allow 1, 1.5, or 2 hour durations.
alter table enrollments add column duration_hours numeric(2,1) not null default 1
  check (duration_hours in (1, 1.5, 2));

-- Collapse group size to exactly two pricing/selection categories
-- throughout — "small" (1:1, or 1:2 priced the same as 1:1) and "large"
-- (1:3/1:4, priced differently from small). rate_card and student_rates
-- key off this bucket directly (one row per bucket, not one per exact
-- size). enrollments.group_size also becomes this same bucket instead of
-- an exact integer — the enrollment form only offers "1:1" or "1:X", and
-- the exact headcount of a group class is no longer stored anywhere; it's
-- an emergent property of how many enrollments share the same slot (see
-- groupPairedEnrollments in src/lib/rateCard.ts).

-- enrollments and student_rates both FK into rate_card(level, group_size)
-- today — drop those before rate_card's key changes shape.
do $$
declare
  r record;
begin
  for r in
    select conname, conrelid::regclass::text as tbl from pg_constraint
    where contype = 'f' and confrelid = 'rate_card'::regclass
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
  end loop;
end $$;

-- rate_card: collapse group_size 1/2 into one "small" row (keeping
-- group_size=1's rate — 1:2 now costs the same as 1:1), and group_size
-- 3/4 into one "large" row (new tier, starts at 0 until set via the UI).
alter table rate_card add column bucket text;
update rate_card set bucket = case when group_size <= 2 then 'small' else 'large' end;
delete from rate_card where group_size in (2, 4);

do $$
declare
  r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'rate_card'::regclass and contype = 'p'
  loop
    execute format('alter table rate_card drop constraint %I', r.conname);
  end loop;
end $$;

alter table rate_card drop column group_size;
alter table rate_card alter column bucket set not null;
alter table rate_card add constraint rate_card_bucket_check check (bucket in ('small', 'large'));
alter table rate_card add primary key (level, bucket);

insert into rate_card (level, bucket, rate)
select level, 'large', 0
from (values ('preschool'), ('primary')) as levels(level)
on conflict (level, bucket) do nothing;

-- student_rates: same collapse. Any existing group_size=2 override is
-- discarded (1:2 now always matches 1:1's override); no group_size=3/4
-- overrides exist yet since those sizes were never used.
alter table student_rates add column bucket text;
update student_rates set bucket = case when group_size <= 2 then 'small' else 'large' end;
delete from student_rates where group_size in (2, 4);

do $$
declare
  r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'student_rates'::regclass and contype = 'p'
  loop
    execute format('alter table student_rates drop constraint %I', r.conname);
  end loop;
end $$;

alter table student_rates drop column group_size;
alter table student_rates alter column bucket set not null;
alter table student_rates add constraint student_rates_bucket_check check (bucket in ('small', 'large'));
alter table student_rates add primary key (student_id, level, bucket);

-- enrollments: same collapse, keeping the column named group_size (now
-- holding 'small'/'large' text instead of an exact integer).
do $$
declare
  r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'enrollments'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%group_size%'
  loop
    execute format('alter table enrollments drop constraint %I', r.conname);
  end loop;
end $$;

alter table enrollments add column bucket text;
update enrollments set bucket = case when group_size <= 2 then 'small' else 'large' end;
alter table enrollments drop column group_size;
alter table enrollments rename column bucket to group_size;
alter table enrollments alter column group_size set not null;
alter table enrollments add constraint enrollments_group_size_check
  check (group_size in ('small', 'large'));

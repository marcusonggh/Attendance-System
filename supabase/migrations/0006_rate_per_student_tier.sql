-- Rates follow the student, scoped per tier (level + group size) — e.g. a
-- student's own "primary 1:1" rate applies to every 1:1 primary subject
-- they take, and can differ from another student's rate for that same
-- tier. Replaces the earlier single-flat-rate-per-student column.
create table student_rates (
  student_id uuid not null references students(id) on delete cascade,
  level text not null,
  group_size smallint not null,
  rate numeric(10,2) not null,
  primary key (student_id, level, group_size),
  foreign key (level, group_size) references rate_card(level, group_size)
);

alter table student_rates enable row level security;
create policy "authenticated full access" on student_rates for all to authenticated using (true) with check (true);

alter table students drop column if exists custom_monthly_rate;
alter table enrollments drop column if exists custom_monthly_rate;

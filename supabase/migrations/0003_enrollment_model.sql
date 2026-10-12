-- Replace the fixed two-session-slot model with flexible per-subject
-- enrollments (student x subject), each with its own day/time/location
-- and a level+group_size-based flat monthly rate. Attendance is folded
-- directly into `sessions` since each session now belongs to exactly one
-- enrollment (one student, one subject) instead of a shared timeslot.

drop table if exists attendance;
drop table if exists invoices;
drop table if exists sessions;
drop table if exists weekly_schedule;
drop table if exists session_pricing;

create table rate_card (
  level text not null check (level in ('preschool', 'primary')),
  group_size smallint not null check (group_size in (1, 2)),
  rate numeric(10,2) not null default 0,
  primary key (level, group_size),
  check (level <> 'primary' or group_size = 1)
);

insert into rate_card (level, group_size, rate) values
  ('preschool', 1, 250),
  ('preschool', 2, 200),
  ('primary', 1, 300);

create table enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  subject text not null check (subject in ('mandarin', 'math', 'science', 'english', 'bahasa')),
  level text not null check (level in ('preschool', 'primary')),
  group_size smallint not null check (group_size in (1, 2)),
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  location text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (level <> 'primary' or group_size = 1),
  foreign key (level, group_size) references rate_card(level, group_size)
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  date date not null,
  status text not null check (status in ('present', 'absent')),
  absence_reason text,
  is_makeup boolean not null default false,
  created_at timestamptz not null default now(),
  unique (enrollment_id, date)
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  year_month text not null,
  sessions_attended integer not null,
  amount_owed numeric(10,2) not null,
  status text not null default 'unpaid' check (status in ('paid', 'unpaid')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (enrollment_id, year_month)
);

alter table rate_card enable row level security;
alter table enrollments enable row level security;
alter table sessions enable row level security;
alter table invoices enable row level security;

create policy "authenticated full access" on rate_card for all to authenticated using (true) with check (true);
create policy "authenticated full access" on enrollments for all to authenticated using (true) with check (true);
create policy "authenticated full access" on sessions for all to authenticated using (true) with check (true);
create policy "authenticated full access" on invoices for all to authenticated using (true) with check (true);

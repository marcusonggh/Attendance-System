create extension if not exists pgcrypto;

create table students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_contact text,
  rate_per_session numeric(10,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table weekly_schedule (
  id uuid primary key default gen_random_uuid(),
  session_number smallint not null check (session_number in (1,2)),
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  unique (session_number, day_of_week)
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  session_number smallint not null check (session_number in (1,2)),
  unique (date, session_number)
);

create table attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  status text not null check (status in ('present','absent')),
  absence_reason text,
  is_makeup boolean not null default false,
  created_at timestamptz not null default now(),
  unique (session_id, student_id)
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  year_month text not null,
  sessions_attended integer not null,
  amount_owed numeric(10,2) not null,
  status text not null default 'unpaid' check (status in ('paid','unpaid')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (student_id, year_month)
);

alter table students enable row level security;
alter table weekly_schedule enable row level security;
alter table sessions enable row level security;
alter table attendance enable row level security;
alter table invoices enable row level security;

create policy "authenticated full access" on students for all to authenticated using (true) with check (true);
create policy "authenticated full access" on weekly_schedule for all to authenticated using (true) with check (true);
create policy "authenticated full access" on sessions for all to authenticated using (true) with check (true);
create policy "authenticated full access" on attendance for all to authenticated using (true) with check (true);
create policy "authenticated full access" on invoices for all to authenticated using (true) with check (true);

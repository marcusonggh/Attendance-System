-- 1. Per-student custom monthly rate, overriding the level/group_size tier
--    default for every one of that student's enrollments.
alter table students add column custom_monthly_rate numeric(10,2);

-- 2. Reschedule support: a session can now be moved to a different date
--    instead of just present/absent. The original date's row is marked
--    'rescheduled' and points at the new date; the new date gets its own
--    'present' row (is_makeup = true unless it happens to land on the
--    enrollment's normal weekday).
alter table sessions drop constraint sessions_status_check;
alter table sessions add constraint sessions_status_check
  check (status in ('present', 'absent', 'rescheduled'));
alter table sessions add column rescheduled_to_date date;

-- 3. Full data reset for testing — rate_card tiers are kept as config.
truncate table invoices, sessions, enrollments, students cascade;

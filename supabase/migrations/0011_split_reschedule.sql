-- A session can now be split across multiple make-up dates (e.g. a missed
-- 1.5hr class rebooked as three separate 0.5hr catch-up sessions). Every
-- session belonging to one reschedule (the original "rescheduled" row plus
-- each make-up part it created) shares a reschedule_group_id, so canceling
-- the reschedule can find and remove every part together, however many
-- there are. Each part can also carry its own start_time/duration_hours,
-- overriding the enrollment's normal weekly slot for display purposes only
-- — billing stays a flat monthly rate per enrollment, unaffected by this.
alter table sessions add column reschedule_group_id uuid;
alter table sessions add column start_time time;
alter table sessions add column duration_hours numeric(3,2)
  check (duration_hours is null or duration_hours in (0.5, 0.75, 1, 1.5, 2));

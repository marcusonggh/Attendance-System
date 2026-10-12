-- Every enrollment now has a start date (required) and an optional end
-- date. No end date means the weekly class recurs indefinitely; an end
-- date means the student stops after that date.
alter table enrollments add column start_date date not null default current_date;
alter table enrollments alter column start_date drop default;
alter table enrollments add column end_date date;
alter table enrollments add constraint enrollments_date_range_check
  check (end_date is null or end_date >= start_date);

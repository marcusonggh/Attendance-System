-- Invoices move from one-per-enrollment (one per subject) to one-per-student
-- per month, combining all of a student's active subjects into a single
-- total. Old per-subject invoice rows can't be cleanly auto-merged (e.g. one
-- subject paid, another not), so this clears existing invoices rather than
-- guessing — confirmed fine to do since none of the existing ones need to be
-- preserved.
truncate table invoices;

alter table invoices drop column enrollment_id;
alter table invoices add column student_id uuid not null references students(id) on delete cascade;
alter table invoices add constraint invoices_student_id_year_month_key unique (student_id, year_month);

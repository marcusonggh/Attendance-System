-- A note about what happened in a specific class (what was taught, homework
-- assigned, why a student was absent, etc.), tied to that one session date
-- rather than the student generally.
alter table sessions add column notes text;

create table session_pricing (
  session_number smallint primary key check (session_number in (1,2)),
  rate numeric(10,2) not null default 0
);

insert into session_pricing (session_number, rate) values (1, 0), (2, 0);

alter table session_pricing enable row level security;
create policy "authenticated full access" on session_pricing for all to authenticated using (true) with check (true);

alter table students drop column rate_per_session;

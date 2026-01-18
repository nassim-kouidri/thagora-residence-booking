-- ==============================================================================
-- Horaires v2 : hebdomadaire + exceptions par date + fermetures
-- Priorité :
-- 1) Jour spécifique fermé
-- 2) Plage horaire spécifique à une date
-- 3) Plage horaire hebdomadaire
-- 4) Fallback sur app_settings (global)
-- ==============================================================================

-- 1) Horaires hebdomadaires (7 jours)
create table if not exists weekly_schedules (
  id bigint primary key generated always as identity,
  day_of_week int not null check (day_of_week between 0 and 6), -- 0=Dimanche
  opening_hour int not null check (opening_hour between 0 and 23),
  closing_hour int not null check (closing_hour between 0 and 23),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint weekly_valid_hours check (opening_hour < closing_hour),
  constraint weekly_unique_day unique (day_of_week)
);

-- 2) Exceptions calendaires (par date)
-- Peut être soit :
-- - une plage horaire spécifique (opening/closing)
-- - une fermeture (is_closed + message)
create table if not exists date_schedule_exceptions (
  id bigint primary key generated always as identity,
  date date not null,
  is_closed boolean not null default false,
  closure_message text,
  opening_hour int check (opening_hour between 0 and 23),
  closing_hour int check (closing_hour between 0 and 23),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint date_unique unique (date),
  constraint date_valid_closed check (
    (is_closed = true and opening_hour is null and closing_hour is null)
    or
    (is_closed = false and opening_hour is not null and closing_hour is not null and opening_hour < closing_hour)
  ),
  constraint date_closed_message_required check (
    (is_closed = false) or (closure_message is not null and length(trim(closure_message)) > 0)
  )
);

-- 3) RLS
alter table weekly_schedules enable row level security;
alter table date_schedule_exceptions enable row level security;

-- Lecture : accessible aux utilisateurs authentifiés (client doit voir "jour fermé" + message)
create policy "Weekly schedules readable by authenticated"
  on weekly_schedules for select
  to authenticated
  using (true);

create policy "Date schedule exceptions readable by authenticated"
  on date_schedule_exceptions for select
  to authenticated
  using (true);

-- Écriture : réservée aux admins
create policy "Weekly schedules admin write"
  on weekly_schedules
  for all
  to authenticated
  using ( is_admin() );

create policy "Date schedule exceptions admin write"
  on date_schedule_exceptions
  for all
  to authenticated
  using ( is_admin() );

-- 4) Index
create index if not exists idx_weekly_schedules_day on weekly_schedules(day_of_week);
create index if not exists idx_date_schedule_exceptions_date on date_schedule_exceptions(date);

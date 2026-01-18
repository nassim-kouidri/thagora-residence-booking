-- Empêche les doublons exacts de créneaux collectifs (même jour + mêmes horaires)
-- NOTE: `start_time` et `end_time` sont de type `time` (les secondes peuvent exister).
-- La contrainte unique s'applique sur les valeurs normalisées stockées en base.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'collective_slots_day_start_end_unique'
  ) then
    alter table public.collective_slots
      add constraint collective_slots_day_start_end_unique
      unique (day_of_week, start_time, end_time);
  end if;
end $$;

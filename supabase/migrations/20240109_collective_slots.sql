-- Création de la table des créneaux collectifs (récurrents)
create table if not exists collective_slots (
  id bigint primary key generated always as identity,
  day_of_week int not null check (day_of_week between 0 and 6), -- 0=Dimanche, 1=Lundi, ... 6=Samedi
  start_time time not null, -- Heure locale (ex: 12:00:00)
  end_time time not null,   -- Heure locale (ex: 16:00:00)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Contrainte : Heure fin > Heure début
  constraint valid_times check (start_time < end_time)
);

-- Sécurité
alter table collective_slots enable row level security;

-- Politiques
-- Tout le monde peut lire (pour l'affichage client)
create policy "Lecture accessible à tous"
  on collective_slots for select
  using (true);

-- Seul l'admin peut modifier
create policy "Modification réservée aux admins"
  on collective_slots
  for all
  using ( is_admin() );

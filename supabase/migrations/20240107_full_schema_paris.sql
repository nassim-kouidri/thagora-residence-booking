-- ==============================================================================
-- 1. INITIALISATION DES TABLES (Base du projet)
-- ==============================================================================

-- Activation de l'extension nécessaire pour la contrainte d'exclusion (IMPORTANT)
create extension if not exists btree_gist;

-- Création de la table des espaces
create table spaces (
  id bigint primary key generated always as identity,
  name text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insertion des 2 espaces (NOMS MIS À JOUR)
insert into spaces (name, description) values
('Salle de sport', 'Zone comprenant les équipements sportifs et la piscine.'),
('Spa & Piscine', 'Zone de détente spa et divertissement.');

-- Création de la table des profils
create table profiles (
  id uuid references auth.users not null primary key,
  first_name text,
  last_name text,
  apartment_number text,
  role text check (role in ('admin', 'client')) default 'client',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_active boolean default true
);

-- Création de la table des réservations
create table reservations (
  id bigint primary key generated always as identity,
  user_id uuid references profiles(id) not null,
  space_id bigint references spaces(id) not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  status text check (status in ('active', 'cancelled')) default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Contrainte d'exclusion : Empêche deux réservations actives de se chevaucher pour le même espace
  exclude using gist (
    space_id with =,
    tstzrange(start_time, end_time) with &&
  ) where (status = 'active')
);

-- Activation de la sécurité (Row Level Security)
alter table profiles enable row level security;
alter table reservations enable row level security;
alter table spaces enable row level security;

-- ==============================================================================
-- 2. CORRECTIFS DE SÉCURITÉ & FONCTIONS UTILITAIRES
-- ==============================================================================

-- Fonction sécurisée pour vérifier si l'utilisateur est Admin
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
    and role = 'admin'
  );
$$;

-- Trigger pour créer automatiquement un profil public quand un utilisateur s'inscrit
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, apartment_number, role)
  values (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'apartment_number',
    coalesce(new.raw_user_meta_data->>'role', 'client') -- Par défaut client
  );
  return new;
end;
$$;

-- Application du Trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();

-- ==============================================================================
-- 3. POLITIQUES DE SÉCURITÉ (RLS)
-- ==============================================================================

-- --- ESPACES ---
create policy "Espaces visibles par tous" on spaces for select using (true);

-- --- PROFILS ---
-- L'utilisateur voit son propre profil
create policy "User voit son profil" on profiles for select using (auth.uid() = id);

-- L'Admin voit tout
create policy "Admin voit tout profils" on profiles for select using ( is_admin() );

-- L'Admin peut modifier les profils (ex: pour désactiver un compte)
create policy "Admins can update any profile" on profiles for update using ( is_admin() );

-- --- RÉSERVATIONS ---
-- Tout le monde peut voir le planning
create policy "Voir les réservations" on reservations for select using (true);

-- Chacun peut réserver pour soi-même
create policy "Users can insert own reservations" on reservations for insert with check (auth.uid() = user_id);

-- Chacun peut annuler ses propres réservations
create policy "Users can delete own reservations" on reservations for delete using (auth.uid() = user_id);

-- L'Admin peut annuler n'importe quelle réservation
create policy "Admins can delete any reservation" on reservations for delete using ( is_admin() );

-- ==============================================================================
-- 4. CONFIGURATION GLOBALE (Horaires)
-- ==============================================================================

create table if not exists app_settings (
  id int primary key default 1 check (id = 1),
  opening_hour int not null default 8 check (opening_hour between 0 and 23),
  closing_hour int not null default 22 check (closing_hour between 0 and 23),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint valid_hours check (opening_hour < closing_hour)
);

-- Insertion de la configuration par défaut (8h - 22h)
insert into app_settings (id, opening_hour, closing_hour)
values (1, 8, 22)
on conflict (id) do nothing;

alter table app_settings enable row level security;

create policy "Lecture accessible à tous les connectés" on app_settings for select to authenticated using (true);
create policy "Modification réservée aux admins" on app_settings for update to authenticated using ( is_admin() );

-- ==============================================================================
-- 5. OPTIMISATION (INDEX)
-- ==============================================================================

create index if not exists idx_reservations_user_id on reservations(user_id);
create index if not exists idx_reservations_start_time on reservations(start_time);
create index if not exists idx_reservations_space_id on reservations(space_id);

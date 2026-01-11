-- 0. Activation de l'extension nécessaire pour la contrainte d'exclusion (IMPORTANT)
create extension if not exists btree_gist;

-- 1. Création de la table des espaces
create table spaces (
                        id bigint primary key generated always as identity,
                        name text not null,
                        description text,
                        created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insertion des 2 espaces
insert into spaces (name, description) values
                                           ('Espace Sport + Piscine', 'Zone comprenant les équipements sportifs et la piscine.'),
                                           ('Spa + Salle de jeux', 'Zone de détente spa et divertissement.');

-- 2. Création de la table des profils
create table profiles (
                          id uuid references auth.users not null primary key,
                          last_name text,
                          apartment_number text,
                          role text check (role in ('admin', 'client')) default 'client',
                          created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Création de la table des réservations (CORRIGÉE)
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

-- 4. Sécurité (Row Level Security)
alter table profiles enable row level security;
alter table reservations enable row level security;
alter table spaces enable row level security;

-- Politiques de sécurité
create policy "Espaces visibles par tous" on spaces for select using (true);

create policy "Admin voit tout profils" on profiles for select using (
    auth.uid() in (select id from profiles where role = 'admin')
    );
create policy "User voit son profil" on profiles for select using (auth.uid() = id);

create policy "Voir les réservations" on reservations for select using (true);
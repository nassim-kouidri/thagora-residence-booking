-- Création de la table de configuration globale
-- Cette table ne contiendra qu'une seule ligne (Singleton)

create table if not exists app_settings (
  id int primary key default 1 check (id = 1), -- Force une seule ligne avec ID=1
  opening_hour int not null default 8 check (opening_hour between 0 and 23),
  closing_hour int not null default 22 check (closing_hour between 0 and 23),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Contrainte de cohérence : L'heure d'ouverture doit être avant l'heure de fermeture
  constraint valid_hours check (opening_hour < closing_hour)
);

-- Insertion de la configuration par défaut (8h - 22h)
insert into app_settings (id, opening_hour, closing_hour)
values (1, 8, 22)
on conflict (id) do nothing;

-- Activation de la sécurité (RLS)
alter table app_settings enable row level security;

-- POLITIQUES DE SÉCURITÉ (RLS)

-- 1. Lecture : Tout utilisateur connecté (Admin ou Client) peut lire les horaires
create policy "Lecture accessible à tous les connectés" 
  on app_settings 
  for select 
  to authenticated 
  using (true);

-- 2. Modification : Seul l'Admin peut modifier (basé sur le profil)
-- Note : Pour éviter les récursions ou complexités, on gère souvent l'update admin via une Server Action avec Service Role,
-- mais voici la politique si on voulait passer par le client standard.
create policy "Modification réservée aux admins" 
  on app_settings 
  for update
  to authenticated
  using (
    exists (
      select 1 from profiles 
      where profiles.id = auth.uid() 
      and profiles.role = 'admin'
    )
  );

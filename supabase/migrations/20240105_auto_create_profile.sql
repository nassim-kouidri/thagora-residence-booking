-- Trigger pour créer automatiquement un profil public quand un utilisateur s'inscrit
-- (Utile si on crée un user via le dashboard Supabase ou une autre méthode)

-- 1. Fonction déclenchée à l'insertion
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

-- 2. Création du Trigger
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();

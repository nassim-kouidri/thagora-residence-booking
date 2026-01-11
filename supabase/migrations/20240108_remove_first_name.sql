-- Supprimer la colonne first_name de la table profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS first_name;

-- Mettre à jour la fonction handle_new_user pour ne plus utiliser first_name
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, last_name, apartment_number, role)
  values (
    new.id,
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'apartment_number',
    coalesce(new.raw_user_meta_data->>'role', 'client') -- Par défaut client
  );
  return new;
end;
$$;

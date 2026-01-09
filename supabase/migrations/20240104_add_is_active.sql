-- Add is_active column to profiles table
alter table profiles 
add column if not exists is_active boolean default true;

-- Update existing profiles to be active
update profiles set is_active = true where is_active is null;

-- Policy to allow admin to update profiles (for deactivation)
-- CORRIGÉ : Utilisation de is_admin() pour éviter la récursion infinie
create policy "Admins can update any profile"
on profiles
for update
using ( is_admin() );

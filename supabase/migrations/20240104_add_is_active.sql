-- Add is_active column to profiles table
alter table profiles 
add column if not exists is_active boolean default true;

-- Update existing profiles to be active
update profiles set is_active = true where is_active is null;

-- Policy to allow admin to update profiles (for deactivation)
-- We already have policies, but let's ensure Admin can update.
-- RLS policies usually are for SELECT/INSERT/UPDATE/DELETE.
-- We might need a policy for UPDATE.

create policy "Admins can update any profile"
on profiles
for update
using (
  auth.uid() in (select id from profiles where role = 'admin')
);

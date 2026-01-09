-- FIX: Infinite Recursion on Profiles (Error 42P17)
-- This script replaces the recursive policies with a recursion-safe function (SECURITY DEFINER).

-- 1. Create a helper function to check if the current user is an admin
-- 'security definer' allows this function to bypass RLS, breaking the loop.
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

-- 2. Fix 'profiles' RLS: Use the function instead of a subquery on itself
drop policy if exists "Admin voit tout profils" on profiles;

create policy "Admin voit tout profils"
on profiles
for select
using ( is_admin() );

-- 3. Fix 'reservations' RLS: Use the function for admin deletion rights
drop policy if exists "Admins can delete any reservation" on reservations;

create policy "Admins can delete any reservation"
on reservations
for delete
using ( is_admin() );

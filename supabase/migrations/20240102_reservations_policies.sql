-- Autoriser l'insertion de réservations pour soi-même (Admin et Client)
-- Cette politique permet à un utilisateur connecté de créer une réservation SI le champ user_id correspond à son propre ID.
create policy "Users can insert own reservations"
on reservations for insert
with check (auth.uid() = user_id);

-- Autoriser la suppression de ses propres réservations (Annulation)
-- Un client (ou admin) peut annuler une réservation qu'il a lui-même créée.
create policy "Users can delete own reservations"
on reservations for delete
using (auth.uid() = user_id);

-- Autoriser les Admins à supprimer n'importe quelle réservation
-- Cette politique permet aux admins de nettoyer le planning si nécessaire.
create policy "Admins can delete any reservation"
on reservations for delete
using (
  auth.uid() in (select id from profiles where role = 'admin')
);

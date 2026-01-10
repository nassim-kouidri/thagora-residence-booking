'use server'

import { createClient } from '@/utils/supabase/server'
import dayjs from 'dayjs'
import { revalidatePath } from 'next/cache'

/**
 * Crée une réservation pour le client connecté.
 * Vérifie le quota : Max 1 réservation par espace par jour.
 */
export async function createClientReservation(spaceId: number, dateIso: string, time: string) {
  const supabase = await createClient()

  // 1. Authentification
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: "Vous devez être connecté." }
  }

  // 2. Vérification des QUOTAS
  // Règle : Maximum une réservation par espace et par jour pour un client.
  const startOfDay = dayjs(dateIso).startOf('day').toISOString()
  const endOfDay = dayjs(dateIso).endOf('day').toISOString()

  const { count, error: countError } = await supabase
    .from('reservations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('space_id', spaceId)
    .eq('status', 'active')
    .gte('start_time', startOfDay)
    .lte('start_time', endOfDay)

  if (countError) {
    return { success: false, message: "Erreur lors de la vérification des quotas." }
  }

  if (count && count > 0) {
    return { 
        success: false, 
        message: "Quota atteint : Vous avez déjà une réservation sur cet espace pour cette journée." 
    }
  }

  // 3. Calcul des horaires
  const startTime = dayjs(`${dateIso}T${time}:00`)
  const endTime = startTime.add(90, 'minute')

  // 4. Insertion
  const { error } = await supabase
    .from('reservations')
    .insert({
      user_id: user.id,
      space_id: spaceId,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      status: 'active'
    })

  if (error) {
    console.error("Erreur réservation client:", error)
    if (error.code === '23P01') { 
      return { success: false, message: "Ce créneau n'est plus disponible." }
    }
    return { success: false, message: "Erreur technique." }
  }

  revalidatePath('/client/dashboard')
  return { success: true, message: "Réservation confirmée !" }
}

/**
 * Annule une réservation (seulement si elle appartient à l'utilisateur).
 */
export async function cancelClientReservation(reservationId: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, message: "Non connecté." }

  // La politique RLS "Users can delete own reservations" nous protège,
  // mais on peut ajouter une vérification user_id pour être sûr de renvoyer le bon message
  // si jamais la suppression échoue car ce n'est pas la sienne.
  const { error } = await supabase
    .from('reservations')
    .delete()
    .eq('id', reservationId)
    .eq('user_id', user.id) // Double sécurité

  if (error) {
    return { success: false, message: "Impossible d'annuler cette réservation." }
  }

  revalidatePath('/client/dashboard')
  return { success: true, message: "Réservation annulée." }
}

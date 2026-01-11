'use server'

import { createClient } from '@/utils/supabase/server'
import { getCollectiveSlots } from '@/app/admin/settings/collective-actions'
import dayjs from 'dayjs'
import { revalidatePath } from 'next/cache'
import { APP_TIMEZONE } from '@/utils/booking-logic'

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

  // 2. Préparation des horaires demandés
  const requestedStartTime = dayjs.tz(`${dateIso}T${time}:00`, APP_TIMEZONE)
  const requestedEndTime = requestedStartTime.add(90, 'minute')

  // 2b. Vérification Créneau Collectif (Sécurité Backend)
  const collectiveSlots = await getCollectiveSlots()
  const currentDayOfWeek = dayjs(dateIso).day()
  const [reqH, reqM] = time.split(':').map(Number)
  const reqStartMin = reqH * 60 + reqM
  const reqEndMin = reqStartMin + 90

  const isCollective = collectiveSlots.some(cs => {
      if (cs.day_of_week !== currentDayOfWeek) return false
      const [sH, sM] = cs.start_time.split(':').map(Number)
      const [eH, eM] = cs.end_time.split(':').map(Number)
      const csStart = sH * 60 + sM
      const csEnd = eH * 60 + eM
      return reqStartMin < csEnd && reqEndMin > csStart
  })

  if (isCollective) {
      return { success: false, message: "Pas besoin de réserver, c'est un créneau collectif ! Présentez-vous directement." }
  }
  
  const startOfDay = dayjs.tz(dateIso, APP_TIMEZONE).startOf('day').toISOString()
  const endOfDay = dayjs.tz(dateIso, APP_TIMEZONE).endOf('day').toISOString()

  // 3. Récupération de TOUTES les réservations du jour pour ce client
  // (Pour vérifier le quota et la règle de synchronisation)
  const { data: userReservations, error: fetchError } = await supabase
    .from('reservations')
    .select('space_id, start_time')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .gte('start_time', startOfDay)
    .lte('start_time', endOfDay)

  if (fetchError) {
    console.error("Erreur fetch user reservations:", fetchError)
    return { success: false, message: "Erreur technique lors de la vérification des règles." }
  }

  // 4. Vérification des Règles Métier
  if (userReservations && userReservations.length > 0) {
    for (const res of userReservations) {
      // Règle A : Quota (Déjà réservé cet espace ?)
      if (res.space_id === spaceId) {
        return { 
          success: false, 
          message: "Quota atteint : Vous avez déjà une réservation sur cet espace pour cette journée." 
        }
      }

      // Règle B : Synchronisation (Si autre espace réservé, même heure obligatoire)
      // On compare l'heure de début existante avec celle demandée.
      const resStart = dayjs(res.start_time)
      
      // On utilise isSame avec une tolérance à la minute près pour éviter les problèmes de secondes
      if (!resStart.isSame(requestedStartTime, 'minute')) {
        return {
          success: false,
          message: "Règle de réservation : Pour réserver deux espaces le même jour, vous devez obligatoirement choisir le même créneau horaire."
        }
      }
    }
  }

  // 5. Insertion (si tout est OK)
  const { error } = await supabase
    .from('reservations')
    .insert({
      user_id: user.id,
      space_id: spaceId,
      start_time: requestedStartTime.toISOString(),
      end_time: requestedEndTime.toISOString(),
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

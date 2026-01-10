
'use server'

import { createClient } from '@/utils/supabase/server'
import dayjs from 'dayjs'
import { revalidatePath } from 'next/cache'

export type Reservation = {
  id: number
  space_id: number
  start_time: string
  end_time: string
  status: 'active' | 'cancelled'
  user_id: string
  profiles: {
    last_name: string
    first_name: string
    apartment_number: string
  } | null
}

export async function createAdminReservation(spaceId: number, dateIso: string, time: string) {
  const supabase = await createClient()

  // 1. Récupérer l'utilisateur courant (l'Admin)
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { success: false, message: "Utilisateur non connecté." }
  }

  // 2. Calculer les horaires de début et de fin
  // On combine la date choisie (YYYY-MM-DD) avec l'heure du créneau (HH:mm)
  const startTime = dayjs(`${dateIso}T${time}:00`)
  const endTime = startTime.add(90, 'minute')

  // 3. Insertion en base de données
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
    console.error("Erreur création réservation:", error)
    // Gestion spécifique de l'erreur de contrainte d'exclusion (doublon)
    if (error.code === '23P01') { 
      return { success: false, message: "Ce créneau est déjà réservé." }
    }
    return { success: false, message: "Erreur technique lors de la réservation." }
  }

  revalidatePath('/admin/dashboard')
  return { success: true, message: "Réservation effectuée avec succès." }
}

export async function getReservationsForDate(dateIso: string) {
  const supabase = await createClient()

  // Début et fin de la journée (en UTC pour être sûr, ou en local si DB en local)
  // La DB est en timestamptz. Il faut envoyer des ISO string complets.
  // On assume que 'dateIso' est 'YYYY-MM-DD'.
  
  // Attention au fuseau horaire Africa/Algiers.
  // Pour simplifier, on prend une plage large en UTC qui couvre la journée locale.
  // Ou mieux, on utilise les fonctions de range de PostgREST si possible, mais ici on va faire simple :
  // On charge les réservations où start_time commence ce jour là.
  
  const startOfDay = dayjs(dateIso).startOf('day').toISOString()
  const endOfDay = dayjs(dateIso).endOf('day').toISOString()

  const { data, error } = await supabase
    .from('reservations')
    .select(`
      id,
      space_id,
      start_time,
      end_time,
      status,
      user_id,
      profiles (
        last_name,
        first_name,
        apartment_number
      )
    `)
    .eq('status', 'active')
    .gte('start_time', startOfDay)
    .lte('start_time', endOfDay)

  if (error) {
    console.error('Erreur récupération réservations:', error)
    return []
  }

  // TypeScript ne devine pas toujours les relations imbriquées parfaitement avec supabase-js
  return data as unknown as Reservation[]
}

export async function cancelReservation(reservationId: number) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('reservations')
    .delete()
    .eq('id', reservationId)

  if (error) {
    console.error("Erreur annulation:", error)
    return { success: false, message: "Erreur lors de l'annulation." }
  }

  revalidatePath('/admin/dashboard')
  return { success: true, message: "Réservation annulée avec succès." }
}


'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import dayjs from 'dayjs'
import { revalidatePath } from 'next/cache'
import { APP_TIMEZONE } from '@/utils/booking-logic'

export type Reservation = {
  id: number
  space_id: number
  start_time: string
  end_time: string
  status: 'active' | 'cancelled'
  user_id: string | null
  profiles: {
    last_name: string
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
  const startTime = dayjs.tz(`${dateIso}T${time}:00`, APP_TIMEZONE)
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
  // IMPORTANT:
  // Cette action est appelée depuis des composants client (Admin & Client).
  // Si on utilise uniquement le client "session" (RLS), on risque de ne voir
  // que ses propres réservations (ou rien), ce qui casse l'affichage "créneau réservé".
  // On utilise donc le client Admin (service role) pour lire le planning,
  // puis on masque les infos sensibles pour les clients.
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const supabaseAdmin = createAdminClient()

  // Récupération du rôle (pour décider du niveau de détail à renvoyer)
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('Erreur récupération rôle (getReservationsForDate):', profileError)
  }

  // Début et fin de la journée (en UTC pour être sûr, ou en local si DB en local)
  // La DB est en timestamptz. Il faut envoyer des ISO string complets.
  // On assume que 'dateIso' est 'YYYY-MM-DD'.
  
  // Attention au fuseau horaire Africa/Algiers.
  // On utilise dayjs.tz pour définir le début et la fin de la journée dans le fuseau horaire de l'application.
  const startOfDay = dayjs.tz(dateIso, APP_TIMEZONE).startOf('day').toISOString()
  const endOfDay = dayjs.tz(dateIso, APP_TIMEZONE).endOf('day').toISOString()

  const { data, error } = await supabaseAdmin
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

  const reservations = data as unknown as Reservation[]

  // Pour un client : on ne renvoie pas d'informations personnelles.
  // On garde uniquement la présence d'une réservation pour marquer le créneau indisponible,
  // et on conserve le user_id uniquement pour permettre l'affichage de "Mon créneau".
  if (profile?.role !== 'admin') {
    return reservations.map((r) => ({
      ...r,
      profiles: null,
      user_id: r.user_id === user.id ? r.user_id : null,
    }))
  }

  return reservations
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

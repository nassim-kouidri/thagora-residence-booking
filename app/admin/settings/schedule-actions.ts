'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { revalidatePath } from 'next/cache'
import { APP_TIMEZONE } from '@/utils/booking-logic'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

export type WeeklySchedule = {
  id: number
  day_of_week: number // 0=Dimanche
  opening_hour: number
  closing_hour: number
}

export type DateScheduleException = {
  id: number
  date: string // YYYY-MM-DD (date)
  is_closed: boolean
  closure_message: string | null
  opening_hour: number | null
  closing_hour: number | null
}

export type EffectiveDayConfig =
  | {
      source: 'closed'
      is_closed: true
      closure_message: string
    }
  | {
      source: 'date' | 'weekly' | 'global'
      is_closed: false
      opening_hour: number
      closing_hour: number
    }

const initialState = {
  error: '',
  message: '',
  success: false,
}

export async function getWeeklySchedules(): Promise<WeeklySchedule[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('weekly_schedules')
    .select('id, day_of_week, opening_hour, closing_hour')
    .order('day_of_week', { ascending: true })

  if (error) {
    console.error('Erreur récupération weekly schedules:', error)
    return []
  }

  return data as WeeklySchedule[]
}

export async function upsertWeeklySchedule(prevState: any, formData: FormData) {
  const dayOfWeek = parseInt(formData.get('dayOfWeek') as string)
  const openingHour = parseInt(formData.get('openingHour') as string)
  const closingHour = parseInt(formData.get('closingHour') as string)

  if (isNaN(dayOfWeek) || isNaN(openingHour) || isNaN(closingHour)) {
    return { ...initialState, error: 'Veuillez remplir tous les champs.' }
  }
  if (dayOfWeek < 0 || dayOfWeek > 6) {
    return { ...initialState, error: 'Jour invalide.' }
  }
  if (openingHour < 0 || openingHour > 23 || closingHour < 0 || closingHour > 23) {
    return { ...initialState, error: 'Les horaires doivent être compris entre 00h et 23h.' }
  }
  if (openingHour >= closingHour) {
    return { ...initialState, error: "L'heure d'ouverture doit être avant l'heure de fermeture." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ...initialState, error: 'Vous devez être connecté.' }

  const supabaseAdmin = createAdminClient()

  const { error } = await supabaseAdmin
    .from('weekly_schedules')
    .upsert(
      {
        day_of_week: dayOfWeek,
        opening_hour: openingHour,
        closing_hour: closingHour,
      },
      { onConflict: 'day_of_week' }
    )

  if (error) {
    console.error('Erreur upsert weekly schedule:', error)
    return { ...initialState, error: "Erreur lors de la mise à jour de l'horaire." }
  }

  revalidatePath('/admin/settings')
  revalidatePath('/admin/dashboard')
  revalidatePath('/client/dashboard')

  return { success: true, message: 'Horaire hebdomadaire mis à jour.', error: '' }
}

export async function getDateScheduleExceptions(): Promise<DateScheduleException[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('date_schedule_exceptions')
    .select('id, date, is_closed, closure_message, opening_hour, closing_hour')
    .order('date', { ascending: true })

  if (error) {
    console.error('Erreur récupération exceptions date:', error)
    return []
  }

  return data as DateScheduleException[]
}

export async function upsertDateScheduleException(prevState: any, formData: FormData) {
  const dateIso = (formData.get('date') as string)?.trim()
  const mode = (formData.get('mode') as string) || 'hours'
  const closureMessage = (formData.get('closureMessage') as string)?.trim()

  if (!dateIso) {
    return { ...initialState, error: 'Veuillez sélectionner une date.' }
  }

  // Validation stricte du format ISO attendu (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso) || !dayjs(dateIso, 'YYYY-MM-DD', true).isValid()) {
    return { ...initialState, error: "Date invalide. Format attendu : JJ/MM/AAAA." }
  }

  const isClosed = mode === 'closed'

  let openingHour: number | null = null
  let closingHour: number | null = null

  if (isClosed) {
    if (!closureMessage) {
      return { ...initialState, error: 'Veuillez saisir un message pour la fermeture.' }
    }
  } else {
    openingHour = parseInt(formData.get('openingHour') as string)
    closingHour = parseInt(formData.get('closingHour') as string)
    if (isNaN(openingHour) || isNaN(closingHour)) {
      return { ...initialState, error: 'Veuillez saisir des horaires valides.' }
    }
    if (openingHour < 0 || openingHour > 23 || closingHour < 0 || closingHour > 23) {
      return { ...initialState, error: 'Les horaires doivent être compris entre 00h et 23h.' }
    }
    if (openingHour >= closingHour) {
      return { ...initialState, error: "L'heure d'ouverture doit être avant l'heure de fermeture." }
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ...initialState, error: 'Vous devez être connecté.' }

  const supabaseAdmin = createAdminClient()

  const { error } = await supabaseAdmin
    .from('date_schedule_exceptions')
    .upsert(
      {
        date: dateIso,
        is_closed: isClosed,
        closure_message: isClosed ? closureMessage : null,
        opening_hour: isClosed ? null : openingHour,
        closing_hour: isClosed ? null : closingHour,
      },
      { onConflict: 'date' }
    )

  if (error) {
    console.error('Erreur upsert exception date:', error)
    return { ...initialState, error: "Erreur lors de l'enregistrement de l'exception." }
  }

  revalidatePath('/admin/settings')
  revalidatePath('/admin/dashboard')
  revalidatePath('/client/dashboard')

  return { success: true, message: 'Exception enregistrée.', error: '' }
}

export async function deleteDateScheduleException(id: number) {
  const supabaseAdmin = createAdminClient()

  const { error } = await supabaseAdmin
    .from('date_schedule_exceptions')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Erreur suppression exception date:', error)
    return { success: false, message: 'Erreur lors de la suppression.' }
  }

  revalidatePath('/admin/settings')
  revalidatePath('/admin/dashboard')
  revalidatePath('/client/dashboard')

  return { success: true, message: 'Exception supprimée.' }
}

/**
 * Résout la configuration effective pour une date donnée (YYYY-MM-DD).
 * Priorité : fermé (date) > plage date > plage hebdo
 */
export async function getEffectiveDayConfig(dateIso: string): Promise<EffectiveDayConfig> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    // Pour rester safe : pas d'infos si non connecté
    return { source: 'closed', is_closed: true, closure_message: 'Accès non autorisé.' }
  }

  const supabaseAdmin = createAdminClient()

  // 1) Exception par date
  const { data: exception, error: exceptionError } = await supabaseAdmin
    .from('date_schedule_exceptions')
    .select('id, date, is_closed, closure_message, opening_hour, closing_hour')
    .eq('date', dateIso)
    .maybeSingle()

  if (exceptionError) {
    console.error('Erreur lecture exception date:', exceptionError)
  }

  if (exception) {
    if (exception.is_closed) {
      return {
        source: 'closed',
        is_closed: true,
        closure_message: exception.closure_message || 'Fermeture exceptionnelle.',
      }
    }
    if (typeof exception.opening_hour === 'number' && typeof exception.closing_hour === 'number') {
      return {
        source: 'date',
        is_closed: false,
        opening_hour: exception.opening_hour,
        closing_hour: exception.closing_hour,
      }
    }
  }

  // 2) Horaire hebdo
  const dayOfWeek = dayjs.tz(dateIso, APP_TIMEZONE).day()
  const { data: weekly, error: weeklyError } = await supabaseAdmin
    .from('weekly_schedules')
    .select('opening_hour, closing_hour')
    .eq('day_of_week', dayOfWeek)
    .maybeSingle()

  if (weeklyError) {
    console.error('Erreur lecture weekly schedule:', weeklyError)
  }

  if (weekly && typeof weekly.opening_hour === 'number' && typeof weekly.closing_hour === 'number') {
    return {
      source: 'weekly',
      is_closed: false,
      opening_hour: weekly.opening_hour,
      closing_hour: weekly.closing_hour,
    }
  }

  // 3) Aucun horaire hebdo configuré => on considère la journée comme fermée
  // (Horaires hebdomadaires = source principale du planning)
  return {
    source: 'closed',
    is_closed: true,
    closure_message: "Horaires non configurés pour cette journée.",
  }
}

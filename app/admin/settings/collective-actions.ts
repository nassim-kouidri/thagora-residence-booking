'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

const DAYS = [
  'Dimanche',
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
]

const formatHourRange = (openingHour: number, closingHour: number) => {
  const two = (n: number) => n.toString().padStart(2, '0')
  return `${two(openingHour)}h00 – ${two(closingHour)}h00`
}

const timeToMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

const isValidTimeInput = (t: string) => /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(t)

const normalizeTime = (t: string) => {
  // DB = type `time` => on normalise en `HH:mm:ss` pour les comparaisons exactes
  // afin d'éviter les faux négatifs (ex: `09:00` vs `09:00:00`).
  return t.length === 5 ? `${t}:00` : t
}

export type CollectiveSlot = {
  id: number
  day_of_week: number
  start_time: string // HH:mm:ss
  end_time: string   // HH:mm:ss
}

export async function getCollectiveSlots() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('collective_slots')
    .select('*')
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) {
    console.error('Erreur récupération créneaux collectifs:', error)
    return []
  }

  return data as CollectiveSlot[]
}

type PostgrestErrorWithCode = { code?: string }

export async function addCollectiveSlot(_prevState: unknown, formData: FormData) {
  const dayOfWeek = parseInt(formData.get('dayOfWeek') as string)
  const startTimeRaw = formData.get('startTime') as string
  const endTimeRaw = formData.get('endTime') as string

  if (isNaN(dayOfWeek) || !startTimeRaw || !endTimeRaw) {
    return { error: 'Veuillez remplir tous les champs.', success: false, message: '' }
  }

  if (!isValidTimeInput(startTimeRaw) || !isValidTimeInput(endTimeRaw)) {
    return { error: "Format d'heure invalide. Format attendu : HH:mm (24h).", success: false, message: '' }
  }

  const startTime = normalizeTime(startTimeRaw)
  const endTime = normalizeTime(endTimeRaw)

  if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
    return { error: "L'heure de fin doit être après l'heure de début.", success: false, message: '' }
  }

  const supabaseAdmin = createAdminClient()

  // Validation métier : le créneau collectif doit être inclus dans les horaires autorisés du jour.
  // Référence = horaires hebdomadaires (source principale du planning).
  const { data: weekly, error: weeklyError } = await supabaseAdmin
    .from('weekly_schedules')
    .select('opening_hour, closing_hour')
    .eq('day_of_week', dayOfWeek)
    .maybeSingle()

  if (weeklyError) {
    console.error('Erreur lecture weekly schedule (collective validation):', weeklyError)
    return { error: "Erreur technique lors de la validation de l'horaire.", success: false, message: '' }
  }

  if (!weekly || typeof weekly.opening_hour !== 'number' || typeof weekly.closing_hour !== 'number') {
    const dayLabel = DAYS[dayOfWeek] ?? 'ce jour'
    return {
      error: `Impossible d'ajouter ce créneau collectif : les horaires d'ouverture de ${dayLabel} ne sont pas configurés.`,
      success: false,
      message: '',
    }
  }

  const allowedStart = weekly.opening_hour * 60
  const allowedEnd = weekly.closing_hour * 60
  const startMin = timeToMinutes(startTime)
  const endMin = timeToMinutes(endTime)

  // Inclusion dans la plage [opening, closing]
  if (startMin < allowedStart || endMin > allowedEnd) {
    const dayLabel = DAYS[dayOfWeek] ?? 'ce jour'
    const range = formatHourRange(weekly.opening_hour, weekly.closing_hour)
    return {
      error: `Impossible d'ajouter ce créneau collectif : l'horaire sélectionné est en dehors des horaires d'ouverture du ${dayLabel.toLowerCase()} (${range}).`,
      success: false,
      message: '',
    }
  }

  // Anti-doublon : impossible d'avoir deux créneaux identiques (même jour, mêmes heures)
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('collective_slots')
    .select('id')
    .eq('day_of_week', dayOfWeek)
    .eq('start_time', startTime)
    .eq('end_time', endTime)
    .maybeSingle()

  if (existingError) {
    console.error('Erreur vérification doublon créneau collectif:', existingError)
    return { error: "Erreur technique lors de la vérification des doublons.", success: false, message: '' }
  }

  if (existing) {
    const dayLabel = DAYS[dayOfWeek] ?? 'ce jour'
    return {
      error: `Impossible d'ajouter ce créneau collectif : un créneau identique existe déjà pour le ${dayLabel.toLowerCase()} (${startTime.slice(0, 5)} - ${endTime.slice(0, 5)}).`,
      success: false,
      message: '',
    }
  }

  const { error } = await supabaseAdmin
    .from('collective_slots')
    .insert({
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime
    })

  if (error) {
    console.error('Erreur ajout créneau collectif:', error)
    // Si une contrainte unique est ajoutée en DB, on renvoie un message clair.
    const code = (error as unknown as PostgrestErrorWithCode | null)?.code
    if (code === '23505') {
      const dayLabel = DAYS[dayOfWeek] ?? 'ce jour'
      return {
        error: `Impossible d'ajouter ce créneau collectif : un créneau identique existe déjà pour le ${dayLabel.toLowerCase()} (${startTime.slice(0, 5)} - ${endTime.slice(0, 5)}).`,
        success: false,
        message: '',
      }
    }
    return { error: "Erreur lors de l'ajout.", success: false, message: '' }
  }

  revalidatePath('/admin/dashboard')
  revalidatePath('/client/dashboard')
  
  return { success: true, message: 'Créneau collectif ajouté.', error: '' }
}

export async function deleteCollectiveSlot(slotId: number) {
  const supabaseAdmin = createAdminClient()

  const { error } = await supabaseAdmin
    .from('collective_slots')
    .delete()
    .eq('id', slotId)

  if (error) {
    console.error('Erreur suppression créneau collectif:', error)
    return { success: false, message: "Erreur lors de la suppression.", error: error.message }
  }

  revalidatePath('/admin/dashboard')
  revalidatePath('/client/dashboard')
  
  return { success: true, message: 'Créneau supprimé.', error: '' }
}

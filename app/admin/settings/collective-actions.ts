'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

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

export async function addCollectiveSlot(prevState: any, formData: FormData) {
  const dayOfWeek = parseInt(formData.get('dayOfWeek') as string)
  const startTime = formData.get('startTime') as string
  const endTime = formData.get('endTime') as string

  if (isNaN(dayOfWeek) || !startTime || !endTime) {
    return { error: 'Veuillez remplir tous les champs.', success: false, message: '' }
  }

  if (startTime >= endTime) {
    return { error: "L'heure de fin doit être après l'heure de début.", success: false, message: '' }
  }

  const supabaseAdmin = createAdminClient()

  const { error } = await supabaseAdmin
    .from('collective_slots')
    .insert({
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime
    })

  if (error) {
    console.error('Erreur ajout créneau collectif:', error)
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

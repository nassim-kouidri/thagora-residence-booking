'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export type AppSettings = {
  opening_hour: number
  closing_hour: number
}

/**
 * Récupère la configuration globale des horaires.
 * Accessible à tous les utilisateurs connectés.
 */
export async function getAppSettings(): Promise<{ data?: AppSettings; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('app_settings')
    .select('opening_hour, closing_hour')
    .single()

  if (error) {
    console.error('Erreur lors de la récupération des paramètres:', error)
    return { error: 'Impossible de charger les horaires.' }
  }

  return { data }
}

/**
 * Met à jour les horaires d'ouverture et de fermeture.
 * Réservé à l'administrateur.
 */
export async function updateAppSettings(
  _prevState: unknown,
  formData: FormData
) {
  const openingHour = parseInt(formData.get('openingHour') as string)
  const closingHour = parseInt(formData.get('closingHour') as string)

  // 1. Validation des données
  if (isNaN(openingHour) || isNaN(closingHour)) {
    return { error: 'Les horaires doivent être des nombres valides.', success: false }
  }

  if (openingHour < 0 || openingHour > 23 || closingHour < 0 || closingHour > 23) {
    return { error: 'Les horaires doivent être compris entre 00h et 23h.', success: false }
  }

  if (openingHour >= closingHour) {
    return { error: "L'heure d'ouverture doit être avant l'heure de fermeture.", success: false }
  }

  // 2. Vérification des droits (Admin uniquement)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Vous devez être connecté.', success: false }
  }

  const supabaseAdmin = createAdminClient()
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { error: 'Action non autorisée.', success: false }
  }

  // 3. Mise à jour via le client Admin (pour contourner RLS si besoin, bien que la policy le permette)
  const { error } = await supabaseAdmin
    .from('app_settings')
    .update({ opening_hour: openingHour, closing_hour: closingHour })
    .eq('id', 1) // On tape toujours sur la ligne ID=1

  if (error) {
    console.error('Erreur Update Settings:', error)
    return { error: "Erreur lors de la mise à jour des horaires.", success: false }
  }

  revalidatePath('/admin/dashboard')
  revalidatePath('/client/dashboard') // Les clients doivent aussi voir les changements s'ils rafraichissent

  return { 
    success: true, 
    message: `Horaires mis à jour : ${openingHour}h00 - ${closingHour}h00`,
    error: ''
  }
}

'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/utils/supabase/admin'

export type ClientProfile = {
  id: string
  last_name: string
  apartment_number: string
  is_active: boolean
  created_at: string
}

export async function createUser(_prevState: unknown, formData: FormData) {
  const lastName = formData.get('lastName') as string
  const apartmentSuffix = formData.get('apartmentSuffix') as string

  if (!apartmentSuffix) {
    return { error: 'Le numéro d\'appartement est obligatoire.', success: false, message: '' }
  }

  const supabaseAdmin = createAdminClient()

  // Génération automatique des identifiants
  // Format demandé : A0 + suffixe (ex: A03)
  const apartmentNumber = `A0${apartmentSuffix.trim()}`
  const identifier = apartmentNumber
  const password = apartmentNumber
  
  // Email technique pour Supabase
  const email = `${identifier}@residence.com`

  // 1. Création de l'utilisateur dans Supabase Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm car créé par l'admin
    user_metadata: {
      last_name: lastName || identifier, // Si pas de nom, on met l'identifiant
      apartment_number: apartmentNumber
    }
  })

  if (authError) {
    console.error('Erreur Auth:', authError)
    return { error: `Erreur lors de la création du compte : ${authError.message}`, success: false, message: '' }
  }

  if (!authData.user) {
    return { error: 'Erreur inattendue : Utilisateur non créé.', success: false, message: '' }
  }

  // 2. Création du profil (Désormais gérée automatiquement par le Trigger Supabase 'on_auth_user_created')

  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/users/create')
  
  return { 
    success: true, 
    message: `Compte créé avec succès pour l'appartement ${apartmentNumber}. Identifiant et Mot de passe : ${identifier}`,
    error: ''
  }
}

export async function getUsers() {
  const supabaseAdmin = createAdminClient()
  
  const { data: users, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('role', 'client')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching users:', error)
    return []
  }

  return (users ?? []) as ClientProfile[]
}

export async function deactivateUser(userId: string) {
  const supabaseAdmin = createAdminClient()

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ is_active: false })
    .eq('id', userId)

  if (error) {
    return { success: false, message: `Erreur lors de la désactivation : ${error.message}` }
  }

  revalidatePath('/admin/users/create')
  return { success: true, message: 'Locataire désactivé avec succès.' }
}

'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/utils/supabase/admin'

export async function createUser(prevState: any, formData: FormData) {
  const lastName = formData.get('lastName') as string
  const firstName = formData.get('firstName') as string
  const apartment = formData.get('apartment') as string
  const password = formData.get('password') as string

  if (!lastName || !firstName || !apartment || !password) {
    return { error: 'Tous les champs sont obligatoires.', success: false, message: '' }
  }

  const supabaseAdmin = createAdminClient()

  // Génération de l'email technique : nomDeFamille@residence.com
  // On nettoie le nom pour éviter les espaces ou caractères spéciaux dans l'email
  const cleanLastName = lastName.trim().replace(/\s+/g, '').toLowerCase()
  const email = `${cleanLastName}@residence.com`

  // 1. Création de l'utilisateur dans Supabase Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm car créé par l'admin
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      apartment_number: apartment
    }
  })

  if (authError) {
    console.error('Erreur Auth:', authError)
    return { error: `Erreur lors de la création du compte : ${authError.message}`, success: false, message: '' }
  }

  if (!authData.user) {
    return { error: 'Erreur inattendue : Utilisateur non créé.', success: false, message: '' }
  }

  // 2. Création du profil dans la table 'profiles'
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: authData.user.id,
      first_name: firstName,
      last_name: lastName,
      apartment_number: apartment,
      role: 'client'
    })

  if (profileError) {
    console.error('Erreur Profile:', profileError)
    // Idéalement, on devrait supprimer l'utilisateur Auth si le profil échoue pour garder la cohérence
    // Pour l'instant, on retourne l'erreur.
    return { error: `Le compte est créé mais le profil a échoué : ${profileError.message}`, success: false, message: '' }
  }

  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/users/create')
  
  return { 
    success: true, 
    message: `Compte créé avec succès pour ${firstName} ${lastName} (Appt ${apartment}). Identifiant de connexion : ${lastName}`,
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

  return users
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

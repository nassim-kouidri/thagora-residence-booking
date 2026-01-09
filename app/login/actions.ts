'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function login(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const identifier = formData.get('identifier') as string
  const password = formData.get('password') as string

  if (!identifier || !password) {
    return { error: 'Veuillez remplir tous les champs.' }
  }

  let email = identifier.trim()
  // On force l'ajout du suffixe technique pour tous les utilisateurs (Admin ou Client)
  // L'utilisateur ne renseigne que son Nom.
  email = `${email}@residence.com`

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: 'Échec de la connexion. Vérifiez vos identifiants.' }
  }

  // Récupération du rôle pour la redirection intelligente
  // On utilise le client Admin pour contourner les potentielles restrictions RLS durant le login
  const supabaseAdmin = createAdminClient()
  
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single()

  if (profileError) {
    console.error('Erreur lors de la récupération du profil:', profileError)
  }

  if (profile?.role === 'admin') {
    redirect('/admin/dashboard')
  } else {
    redirect('/client/dashboard')
  }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

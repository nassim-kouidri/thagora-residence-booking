import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  // Sécurité : vérifier que l'appel est autorisé via la variable d'environnement CRON_SECRET
  // Cette variable doit être configurée dans le dashboard Vercel
  const authHeader = request.headers.get('authorization')
  
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const supabase = await createClient()
  
  // Une simple lecture légère (COUNT) sur la table profiles suffit à générer de l'activité
  // et empêcher la mise en pause automatique de Supabase
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  if (error) {
    console.error('Keep-Alive Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ 
    success: true, 
    message: 'Supabase pinged successfully',
    data: { profileCount: count }
  })
}

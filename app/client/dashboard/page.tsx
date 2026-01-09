import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/utils/supabase/admin'
import LogoutButton from '@/app/components/logout-button'
import { getAppSettings } from '@/app/admin/settings/actions'
import ClientPlanningGrid from './client-planning-grid'

export default async function ClientDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Verification du role (Double sécurité après le middleware)
  const supabaseAdmin = createAdminClient()
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'client') {
    redirect('/admin/dashboard')
  }

  // Récupération des paramètres globaux
  const { data: settings } = await getAppSettings()
  const openingHour = settings?.opening_hour ?? 8
  const closingHour = settings?.closing_hour ?? 22

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navbar / Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#F3E5AB]">Espace Client</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center space-x-2 text-sm">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span className="text-zinc-400">Compte :</span>
                <span className="font-mono text-[#F3E5AB]">{user.email}</span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Réservations</h2>
            <p className="text-zinc-400 text-sm mt-1">
              Réservez vos créneaux pour aujourd'hui ou demain. (Max 1h / espace / jour)
            </p>
          </div>
        </div>

        {/* Grille du Planning */}
        <div className="h-[calc(100vh-200px)] min-h-[500px]">
           <ClientPlanningGrid 
              openingHour={openingHour} 
              closingHour={closingHour} 
              currentUserId={user.id}
           />
        </div>

      </main>
    </div>
  )
}

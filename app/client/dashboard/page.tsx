import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/utils/supabase/admin'
import LogoutButton from '@/app/components/logout-button'
import { getAppSettings } from '@/app/admin/settings/actions'
import { getCollectiveSlots } from '@/app/admin/settings/collective-actions'
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

  // Récupération des créneaux collectifs
  const collectiveSlots = await getCollectiveSlots()

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navbar / Header - Simplified & Premium (aligné sur /admin/dashboard) */}
      <header className="border-b border-white/5 bg-neutral-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-medium text-[#D4AF37] tracking-wider uppercase">
              Thagora <span className="text-zinc-500 font-light">| Client</span>
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Réservations</h2>
            <p className="text-zinc-400 text-sm mt-1">
              Réservez vos créneaux pour aujourd'hui ou demain. (Max 1h30 / espace / jour)
            </p>
          </div>
        </div>

        {/* Grille du Planning */}
        <div className="w-full">
           <ClientPlanningGrid 
              openingHour={openingHour} 
              closingHour={closingHour} 
              currentUserId={user.id}
              collectiveSlots={collectiveSlots}
           />
        </div>

      </main>
    </div>
  )
}

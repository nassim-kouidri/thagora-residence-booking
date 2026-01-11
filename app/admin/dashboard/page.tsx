
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/utils/supabase/admin'
import LogoutButton from '@/app/components/logout-button'
import Link from 'next/link'
import Image from 'next/image'

import { getAppSettings } from '@/app/admin/settings/actions'
import { getCollectiveSlots } from '@/app/admin/settings/collective-actions'
import PlanningGrid from './planning-grid'

export default async function AdminDashboard() {
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

  if (profile?.role !== 'admin') {
    redirect('/client/dashboard')
  }

  // Récupération des paramètres globaux
  const { data: settings } = await getAppSettings()
  const openingHour = settings?.opening_hour ?? 8
  const closingHour = settings?.closing_hour ?? 22

  // Récupération des créneaux collectifs
  const collectiveSlots = await getCollectiveSlots()

  return (
    <div className="min-h-screen bg-neutral-950 text-zinc-100 font-sans selection:bg-[#D4AF37] selection:text-black">
      {/* Navbar / Header - Simplified & Premium */}
      <header className="border-b border-white/5 bg-neutral-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <h1 className="text-lg font-medium text-[#D4AF37] tracking-wider uppercase">Thagora <span className="text-zinc-500 font-light">| Admin</span></h1>
            </div>
            
            <div className="flex items-center gap-6">
                <LogoutButton />
            </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-16">
        
        {/* Section 1 : Planning (Prioritaire & Central) */}
        <section className="space-y-6">
             <div className="w-full">
                <PlanningGrid 
                    openingHour={openingHour} 
                    closingHour={closingHour} 
                    currentUserId={user.id} 
                    collectiveSlots={collectiveSlots}
                />
             </div>
        </section>

        {/* Section 2 : Navigation Rapide - Grid épurée */}
        <section>
            <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-widest mb-6 px-1">
                Administration
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Statistiques */}
                <Link href="/admin/statistics" className="group block">
                    <div className="h-full p-6 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-[#D4AF37]/30 transition-all duration-300">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-medium text-zinc-200 group-hover:text-[#F3E5AB] transition-colors">Statistiques</h3>
                            <span className="text-zinc-600 group-hover:text-[#D4AF37] transition-colors text-xl">↗</span>
                        </div>
                        <p className="text-zinc-500 text-sm leading-relaxed group-hover:text-zinc-400 transition-colors">
                            Analysez le taux d'occupation et l'historique des réservations.
                        </p>
                    </div>
                </Link>

                {/* Configuration */}
                <Link href="/admin/settings" className="group block">
                    <div className="h-full p-6 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-[#D4AF37]/30 transition-all duration-300">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-medium text-zinc-200 group-hover:text-[#F3E5AB] transition-colors">Configuration</h3>
                            <span className="text-zinc-600 group-hover:text-[#D4AF37] transition-colors text-xl">⚙</span>
                        </div>
                        <p className="text-zinc-500 text-sm leading-relaxed group-hover:text-zinc-400 transition-colors">
                            Gérez les horaires d'ouverture et les créneaux libres.
                        </p>
                    </div>
                </Link>

                {/* Locataires */}
                <Link href="/admin/users/create" className="group block">
                    <div className="h-full p-6 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-[#D4AF37]/30 transition-all duration-300">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-medium text-zinc-200 group-hover:text-[#F3E5AB] transition-colors">Locataires</h3>
                            <span className="text-zinc-600 group-hover:text-[#D4AF37] transition-colors text-xl">👥</span>
                        </div>
                        <p className="text-zinc-500 text-sm leading-relaxed group-hover:text-zinc-400 transition-colors">
                            Ajoutez ou supprimez des comptes résidents.
                        </p>
                    </div>
                </Link>

            </div>
        </section>

      </main>
    </div>
  )
}


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
    <div className="min-h-screen bg-black text-white">
      {/* Navbar / Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold text-[#F3E5AB]">Admin Dashboard</h1>
            </div>
            
            <div className="flex items-center gap-6">
                <LogoutButton />
            </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Section 1 : Planning (Prioritaire) */}
        <section>
             <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">Planning des réservations</h2>
             </div>
             <div className="w-full">
                <PlanningGrid 
                    openingHour={openingHour} 
                    closingHour={closingHour} 
                    currentUserId={user.id} 
                    collectiveSlots={collectiveSlots}
                />
             </div>
        </section>

        <hr className="border-zinc-800" />

        {/* Section 2 : Administration */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Carte : Statistiques */}
            <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 hover:border-[#D4AF37] transition-colors group">
                <h3 className="text-lg font-bold text-[#F3E5AB] mb-2">Statistiques</h3>
                <p className="text-zinc-400 text-sm mb-6">
                    Visualisez le taux d'occupation, les heures de pointe et l'historique complet des locataires.
                </p>
                <Link 
                    href="/admin/statistics"
                    className="inline-flex items-center justify-center w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md text-black bg-[#F3E5AB] hover:bg-[#D4AF37] group-hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all"
                >
                    Voir les statistiques
                </Link>
            </div>

            {/* Carte : Configuration Générale */}
            <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 hover:border-[#D4AF37] transition-colors group">
                <h3 className="text-lg font-bold text-[#F3E5AB] mb-2">Configuration</h3>
                <p className="text-zinc-400 text-sm mb-6">
                    Définissez les horaires d'ouverture et gérez les créneaux collectifs (accès libre).
                </p>
                <Link 
                    href="/admin/settings"
                    className="inline-flex items-center justify-center w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md text-black bg-[#F3E5AB] hover:bg-[#D4AF37] group-hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all"
                >
                    Gérer la configuration
                </Link>
            </div>

            {/* Carte : Gestion Utilisateurs */}
            <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 hover:border-[#D4AF37] transition-colors group">
                <h3 className="text-lg font-bold text-[#F3E5AB] mb-2">Locataires</h3>
                <p className="text-zinc-400 text-sm mb-6">
                    Gérez les accès à la résidence. Ajoutez de nouveaux locataires ou supprimer les anciens locataires.
                </p>
                <Link 
                    href="/admin/users/create"
                    className="inline-flex items-center justify-center w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md text-black bg-[#F3E5AB] hover:bg-[#D4AF37] group-hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all"
                >
                    Gestion des locataires
                </Link>
            </div>

        </section>

      </main>
    </div>
  )
}

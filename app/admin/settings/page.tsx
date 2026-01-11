
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/utils/supabase/admin'
import Link from 'next/link'
import { getAppSettings } from './actions'
import { getCollectiveSlots } from './collective-actions'
import SettingsForm from './settings-form'
import CollectiveSlotsCard from './collective-slots-card'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Verification du role
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
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#F3E5AB]">Configuration</h1>
            <p className="text-zinc-400 mt-1">
              Gérez les horaires d'ouverture et les créneaux collectifs.
            </p>
          </div>
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center px-4 py-2 border border-zinc-700 rounded-md shadow-sm text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37]"
          >
            ← Retour au Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Colonne Gauche : Configuration Horaires */}
            <div>
                 <SettingsForm initialOpeningHour={openingHour} initialClosingHour={closingHour} />
            </div>

            {/* Colonne Droite : Créneaux Collectifs */}
            <div className="h-full">
                 <CollectiveSlotsCard slots={collectiveSlots} />
            </div>
        </div>

      </div>
    </div>
  )
}

import { getStatistics } from './actions'
import StatsCards from './stats-cards'
import ClientHistoryList from './client-history-list'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function StatisticsPage() {
  // Security Check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { tenants, globalStats, error } = await getStatistics()

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#F3E5AB]">Statistiques</h1>
            <p className="text-zinc-400 mt-1">
              Analyse de l'occupation et historique des locataires.
            </p>
          </div>
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center px-4 py-2 border border-zinc-700 rounded-md shadow-sm text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37]"
          >
            ← Retour au Dashboard
          </Link>
        </div>

        {error ? (
          <div className="bg-red-900/20 border border-red-900 text-red-400 p-4 rounded-lg">
            {error}
          </div>
        ) : (
          <>
            {/* Global Stats Section */}
            <section>
              <StatsCards stats={globalStats} />
            </section>

            {/* Tenant History Section */}
            <section>
              <ClientHistoryList tenants={tenants} />
            </section>
          </>
        )}
      </div>
    </div>
  )
}

'use client'

import { GlobalStats } from './actions'

export default function StatsCards({ stats }: { stats: GlobalStats | null }) {
  if (!stats) return null

  return (
    <div className="space-y-6">
      {/* 1. Top Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Reservations */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          <h3 className="text-zinc-400 text-sm font-medium uppercase">Total Réservations</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{stats.totalReservations}</span>
            <span className="text-sm text-zinc-500">depuis le début</span>
          </div>
        </div>

        {/* Popular Space */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          <h3 className="text-zinc-400 text-sm font-medium uppercase">Espace Favori</h3>
          <div className="mt-2">
            <div className="text-xl font-bold text-[#F3E5AB] truncate">{stats.mostPopularSpace.name}</div>
            <div className="text-sm text-zinc-500">{stats.mostPopularSpace.percentage}% des réservations</div>
          </div>
        </div>

         {/* Most Active Day */}
         <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          <h3 className="text-zinc-400 text-sm font-medium uppercase">Jour le plus actif</h3>
          <div className="mt-2">
            <div className="text-xl font-bold text-white">
              {stats.activeDays.length > 0 ? stats.activeDays[0].day : '-'}
            </div>
            <div className="text-sm text-zinc-500">
             {stats.activeDays.length > 0 ? `${stats.activeDays[0].count} réservations` : ''}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Detailed Charts Row */}
      <div className="w-full">
        
        {/* Active Days List */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          <h3 className="text-[#F3E5AB] font-semibold mb-6">Jours d'activité</h3>
          <div className="space-y-4">
            {stats.activeDays.map((day, idx) => {
              // Scale based on the most active day
              const maxDay = stats.activeDays[0]?.count || 1
              const percent = (day.count / maxDay) * 100
              
              return (
                <div key={idx} className="group">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-zinc-300">{day.day}</span>
                    <span className="text-zinc-500">{day.count} rés.</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2.5">
                    <div 
                      className="bg-[#D4AF37] h-2.5 rounded-full transition-all duration-500" 
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
            {stats.activeDays.length === 0 && (
                <div className="text-zinc-500 text-sm text-center py-4">Aucune donnée disponible.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

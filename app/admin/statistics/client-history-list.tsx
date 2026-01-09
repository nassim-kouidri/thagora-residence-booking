'use client'

import { useState } from 'react'
import { TenantHistory } from './actions'

export default function ClientHistoryList({ tenants }: { tenants: TenantHistory[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  if (tenants.length === 0) {
    return <div className="text-zinc-500 text-center py-8">Aucun locataire trouvé.</div>
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="p-6 border-b border-zinc-800">
        <h3 className="text-[#F3E5AB] font-semibold text-lg">Historique par Locataire</h3>
      </div>
      
      <div className="divide-y divide-zinc-800">
        {tenants.map((tenant) => (
          <div key={tenant.id} className="transition-colors hover:bg-zinc-800/30">
            {/* Header / Summary Row */}
            <button
              onClick={() => toggleExpand(tenant.id)}
              className="w-full flex items-center justify-between p-4 text-left focus:outline-none"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-[#F3E5AB]/10 flex items-center justify-center text-[#F3E5AB] font-bold">
                  {tenant.fullName.charAt(0)}
                </div>
                <div>
                  <div className="font-medium text-white">{tenant.fullName}</div>
                  <div className="text-xs text-zinc-500">Appt {tenant.apartment}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-right hidden sm:block">
                  <div className="text-sm text-zinc-300">{tenant.totalReservations} <span className="text-zinc-500">réservations</span></div>
                  {tenant.upcomingReservations.length > 0 && (
                    <div className="text-xs text-green-400">{tenant.upcomingReservations.length} à venir</div>
                  )}
                </div>
                
                {/* Expand Icon */}
                <svg 
                  className={`w-5 h-5 text-zinc-500 transition-transform ${expandedId === tenant.id ? 'rotate-180' : ''}`} 
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Expanded Content */}
            {expandedId === tenant.id && (
              <div className="px-4 pb-4 sm:pl-16 sm:pr-8">
                {/* Upcoming */}
                {tenant.upcomingReservations.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-green-400 uppercase mb-2">À venir</h4>
                    <div className="space-y-2">
                      {tenant.upcomingReservations.map((res) => (
                        <div key={res.id} className="flex justify-between items-center bg-zinc-950 p-2 rounded border border-zinc-800 text-sm">
                          <span className="text-white font-medium">{res.date} à {res.time}</span>
                          <span className="text-zinc-400 text-xs">{res.spaceName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Past */}
                {tenant.pastReservations.length > 0 ? (
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-500 uppercase mb-2">Passées</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                      {tenant.pastReservations.map((res) => (
                        <div key={res.id} className="flex justify-between items-center bg-zinc-950/50 p-2 rounded text-sm hover:bg-zinc-950">
                          <span className="text-zinc-300">{res.date} à {res.time}</span>
                          <span className="text-zinc-500 text-xs">{res.spaceName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                    <>
                    {tenant.upcomingReservations.length === 0 && (
                         <div className="text-zinc-500 text-sm italic">Aucun historique de réservation.</div>
                    )}
                    </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

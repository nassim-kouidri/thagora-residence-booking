'use client'

import { useState, useEffect } from 'react'
import { generateSmartSlots, formatDate, formatDateForIso, CollectiveSlot } from '@/utils/booking-logic'
import { getReservationsForDate, type Reservation } from '@/app/admin/dashboard/reservations-actions'
import { createClientReservation, cancelClientReservation } from './client-actions'
import dayjs from 'dayjs'

type ClientPlanningGridProps = {
  openingHour: number
  closingHour: number
  currentUserId: string
  collectiveSlots: CollectiveSlot[]
}

const SPACES = [
  { id: 1, name: '🏋️ Salle de sport', shortName: 'Sport', color: 'bg-blue-900/20 border-blue-800' },
  { id: 2, name: '🧖 Spa & Piscine', shortName: 'Spa', color: 'bg-purple-900/20 border-purple-800' }
]

export default function ClientPlanningGrid({ openingHour, closingHour, currentUserId, collectiveSlots }: ClientPlanningGridProps) {
  // Navigation limitée : Aujourd'hui (0) ou Demain (1)
  const [dayOffset, setDayOffset] = useState(0) // 0 = Aujourd'hui, 1 = Demain
  const [activeTab, setActiveTab] = useState(SPACES[0].id)
  
  const selectedDate = dayjs().add(dayOffset, 'day')
  
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Génération des créneaux intelligents (Standards + Collectifs)
  const slots = generateSmartSlots(openingHour, closingHour, selectedDate.toDate(), collectiveSlots)

  const fetchReservations = async () => {
    setLoading(true)
    const dateIso = formatDateForIso(selectedDate.toDate())
    const data = await getReservationsForDate(dateIso)
    setReservations(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchReservations()
  }, [dayOffset]) // Re-fetch quand on change de jour

  const handleReserve = async (spaceId: number, time: string) => {
    const slotId = `${spaceId}-${time}`
    setActionLoading(slotId)

    const dateIso = formatDateForIso(selectedDate.toDate())
    const result = await createClientReservation(spaceId, dateIso, time)

    if (result.success) {
      await fetchReservations()
    } else {
      alert(result.message)
    }
    setActionLoading(null)
  }

  const handleCancel = async (reservationId: number) => {
    if (!confirm("Annuler votre réservation ?")) return

    setLoading(true)
    const result = await cancelClientReservation(reservationId)

    if (result.success) {
      await fetchReservations()
    } else {
      alert(result.message)
      setLoading(false)
    }
  }

  const getReservationForSlot = (spaceId: number, time: string) => {
    return reservations.find(r => {
      const resTime = dayjs(r.start_time).format('HH:mm')
      return r.space_id === spaceId && resTime === time
    })
  }

  return (
    <div className="w-full">
      {/* Sticky Date Navigation */}
      <div className="sticky top-0 z-30 bg-neutral-950/90 backdrop-blur-xl border-b border-white/5 py-4 mb-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-2">
            
            {/* Date Selector : Switch Button Style (Aujourd'hui / Demain) */}
            <div className="flex items-center bg-white/[0.03] rounded-full p-1 border border-white/5 shadow-inner">
                <button 
                    onClick={() => setDayOffset(0)}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                        dayOffset === 0 
                            ? 'bg-[#F3E5AB] text-black shadow-[0_2px_10px_-2px_rgba(212,175,55,0.3)]' 
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                    }`}
                >
                    Aujourd'hui
                </button>
                <button 
                    onClick={() => setDayOffset(1)} 
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                        dayOffset === 1 
                            ? 'bg-[#F3E5AB] text-black shadow-[0_2px_10px_-2px_rgba(212,175,55,0.3)]' 
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                    }`}
                >
                    Demain
                </button>
            </div>

            {/* Info Droite : Date sélectionnée & Loader */}
            <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-zinc-400 capitalize hidden md:block">
                    {formatDate(selectedDate.toDate())}
                </span>
                {loading && <span className="text-xs text-[#D4AF37] animate-pulse">Chargement...</span>}
            </div>
        </div>

        {/* Mobile Tabs */}
        <div className="flex md:hidden mt-4 border-t border-white/5 pt-2 px-2">
            {SPACES.map(space => (
            <button
                key={space.id}
                onClick={() => setActiveTab(space.id)}
                className={`flex-1 py-3 text-sm font-medium transition-all relative ${
                activeTab === space.id ? 'text-[#D4AF37]' : 'text-zinc-500 hover:text-zinc-300'
                }`}
            >
                {space.name}
                {activeTab === space.id && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#D4AF37] shadow-[0_0_10px_#D4AF37]" />
                )}
            </button>
            ))}
        </div>
      </div>

      {/* Grille des Créneaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 px-2">
          {SPACES.map((space) => {
            const isHiddenOnMobile = space.id !== activeTab;
            
            return (
                <div key={space.id} className={`flex flex-col ${isHiddenOnMobile ? 'hidden md:flex' : 'flex'}`}>
                  {/* Desktop Title */}
                  <h4 className={`hidden md:block text-xl font-light text-[#F3E5AB] mb-6 border-b border-white/10 pb-4 tracking-wide`}>
                    {space.name}
                  </h4>
                  
                  <div className="space-y-0">
                    {slots.length === 0 && (
                      <div className="text-center py-12 text-zinc-600 font-light italic">Aucun créneau disponible.</div>
                    )}
                    {slots.map((slot) => {
                    // 1. GESTION CRÉNEAU COLLECTIF
                    if (slot.type === 'collective') {
                      // Si durée > 1h30, on augmente juste d'un demi (82 * 1.5 = 123px) au lieu de proportionnel
                      // Note: On n'utilise plus de hauteur fixe dans le nouveau design "liste" sauf si on veut garder la carte.
                      // Pour l'Admin, j'ai gardé la "carte" pour le collectif. Je fais pareil ici.
                      const minHeight = slot.durationMinutes > 90 
                          ? 123
                          : 82

                      return (
                         <div 
                            key={`${space.id}-${slot.id}`} 
                            style={{ minHeight: `${minHeight}px` }}
                            className="relative flex items-center justify-between p-4 border-b border-blue-500/20 bg-blue-950/10 overflow-hidden first:border-t border-t-0 border-white/5"
                         >
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-transparent pointer-events-none" />
                            <div className="font-mono text-sm text-blue-300/80 w-32 relative z-10">
                                {slot.label}
                            </div>
                            <div className="flex-1 flex flex-col items-center justify-center relative z-10">
                                <span className="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                    ✨ ACCÈS LIBRE
                                </span>
                            </div>
                            <div className="hidden md:block w-24 text-right relative z-10">
                                <span className="text-[10px] text-blue-300/70 leading-tight block">
                                    Sans réservation
                                </span>
                            </div>
                         </div>
                      )
                    }

                    // 2. GESTION CRÉNEAU STANDARD
                    const time = slot.start
                    const reservation = getReservationForSlot(space.id, time)
                    const isReserved = !!reservation
                    const isMyReservation = isReserved && reservation.user_id === currentUserId

                    // A. Créneau Libre
                    if (!isReserved) {
                        return (
                            <div 
                                key={`${space.id}-${slot.id}`} 
                                className="group flex items-center justify-between py-4 px-4 border-b border-white/5 hover:bg-white/[0.02] transition-all first:border-t border-t-0"
                            >
                                <div className="text-zinc-500 font-mono text-sm group-hover:text-zinc-300 transition-colors w-32">
                                    {slot.label}
                                </div>
                                <div className="flex-1 flex justify-end">
                                    <button 
                                        onClick={() => handleReserve(space.id, time)}
                                        disabled={!!actionLoading}
                                        className="bg-zinc-900 text-zinc-400 text-xs font-medium px-4 py-2 rounded-lg border border-zinc-800 hover:bg-[#D4AF37] hover:text-black hover:border-[#D4AF37] transition-all duration-300 disabled:opacity-50"
                                    >
                                        {actionLoading === `${space.id}-${time}` ? '...' : 'Réserver'}
                                    </button>
                                </div>
                            </div>
                        )
                    }

                    // B. Créneau Réservé
                    return (
                        <div 
                          key={`${space.id}-${slot.id}`} 
                          className={`relative flex items-center justify-between p-4 border-b transition-all first:border-t border-t-0 border-white/5 ${
                            isMyReservation
                                ? 'bg-[#D4AF37]/5 border-[#D4AF37]/20' // Ma réservation (Gold subtil)
                                : 'bg-red-950/10'                       // Réservé Autre (Neutre/Rouge très subtil)
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className={`font-mono text-sm mb-1 ${
                                isMyReservation ? 'text-[#D4AF37]' : 'text-zinc-500'
                            }`}>
                                {slot.label}
                            </span>
                            
                            {isMyReservation ? (
                                <span className="text-xs font-bold text-[#F3E5AB] flex items-center gap-1">
                                  ✅ Mon créneau
                                </span>
                            ) : (
                                <span className="text-xs text-zinc-600 font-medium tracking-wide">
                                    INDISPONIBLE
                                </span>
                            )}
                          </div>
                          
                          <div className="w-24 flex justify-end">
                            {isMyReservation && (
                                <button
                                    onClick={() => handleCancel(reservation.id)}
                                    className="text-xs px-3 py-1.5 rounded transition-colors border border-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                                >
                                    Annuler
                                </button>
                            )}
                          </div>
                        </div>
                    )
                    })}
                </div>
                </div>
            )
          })}
      </div>
    </div>
  )
}

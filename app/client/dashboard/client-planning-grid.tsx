'use client'

import { useState, useEffect } from 'react'
import { generateTimeSlots, formatDate, formatDateForIso } from '@/utils/booking-logic'
import { getReservationsForDate, type Reservation } from '@/app/admin/dashboard/reservations-actions'
import { createClientReservation, cancelClientReservation } from './client-actions'
import dayjs from 'dayjs'

type ClientPlanningGridProps = {
  openingHour: number
  closingHour: number
  currentUserId: string
}

const SPACES = [
  { id: 1, name: '🏋️ Sport & Piscine', shortName: 'Sport & Piscine', color: 'bg-blue-900/20 border-blue-800' },
  { id: 2, name: '🧖 Spa & Détente', shortName: 'Spa & Détente', color: 'bg-purple-900/20 border-purple-800' }
]

export default function ClientPlanningGrid({ openingHour, closingHour, currentUserId }: ClientPlanningGridProps) {
  // Navigation limitée : Aujourd'hui (0) ou Demain (1)
  const [dayOffset, setDayOffset] = useState(0) // 0 = Aujourd'hui, 1 = Demain
  const [activeTab, setActiveTab] = useState(SPACES[0].id)
  
  const selectedDate = dayjs().add(dayOffset, 'day')
  
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const timeSlots = generateTimeSlots(openingHour, closingHour)

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
    <div className="bg-zinc-950 rounded-xl border border-white/10 overflow-hidden flex flex-col h-[calc(100vh-120px)] md:h-[700px] shadow-2xl shadow-black/50">
      {/* Header Sticky Container */}
      <div className="sticky top-0 z-30 bg-zinc-900/95 backdrop-blur border-b border-white/5">
        <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-[#F3E5AB] capitalize">
                {formatDate(selectedDate.toDate())}
                </h3>
                {loading && <span className="text-xs text-[#D4AF37] animate-pulse font-medium">Chargement...</span>}
            </div>
            
            <div className="flex bg-black/40 rounded-xl p-1 border border-white/10 w-full sm:w-auto">
            <button 
                onClick={() => setDayOffset(0)}
                className={`flex-1 sm:flex-none px-6 py-2 text-sm font-medium rounded-lg transition-all ${
                dayOffset === 0 
                    ? 'bg-[#F3E5AB] text-black shadow-lg shadow-[#D4AF37]/20' 
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
            >
                Aujourd'hui
            </button>
            <button 
                onClick={() => setDayOffset(1)}
                className={`flex-1 sm:flex-none px-6 py-2 text-sm font-medium rounded-lg transition-all ${
                dayOffset === 1 
                    ? 'bg-[#F3E5AB] text-black shadow-lg shadow-[#D4AF37]/20' 
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
            >
                Demain
            </button>
            </div>
        </div>

        {/* Mobile Tabs */}
        <div className="flex md:hidden border-t border-white/5">
            {SPACES.map(space => (
            <button
                key={space.id}
                onClick={() => setActiveTab(space.id)}
                className={`flex-1 py-3 text-sm font-medium transition-all relative ${
                activeTab === space.id ? 'text-[#D4AF37] bg-white/5' : 'text-zinc-500 hover:text-zinc-300'
                }`}
            >
                {space.shortName}
                {activeTab === space.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37] shadow-[0_0_10px_#D4AF37]" />
                )}
            </button>
            ))}
        </div>
      </div>

      {/* Grille */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-0 md:p-4 bg-zinc-950 scrollbar-thin scrollbar-thumb-zinc-800">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-6 h-full">
          {SPACES.map((space) => {
             const isHiddenOnMobile = space.id !== activeTab;

             return (
                <div key={space.id} className={`flex flex-col space-y-3 ${isHiddenOnMobile ? 'hidden md:flex' : 'flex'}`}>
                {/* Desktop Title */}
                <h4 className={`hidden md:block text-center py-3 font-medium rounded-t-lg border-t border-l border-r border-white/5 bg-zinc-900/50 text-[#F3E5AB] tracking-wide`}>
                    {space.name}
                </h4>
                
                <div className="space-y-3 p-4 md:p-0 pb-20 md:pb-0">
                    {timeSlots.map((time) => {
                    const reservation = getReservationForSlot(space.id, time)
                    const isReserved = !!reservation
                    const isMyReservation = isReserved && reservation.user_id === currentUserId

                    return (
                        <div 
                        key={`${space.id}-${time}`} 
                        className={`relative flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${
                            isReserved 
                            ? isMyReservation
                                ? 'bg-[#F3E5AB]/10 border-[#F3E5AB]/30' // Ma réservation
                                : 'bg-zinc-900/60 border-white/5 opacity-70' // Réservé par autre
                            : 'bg-zinc-900/40 border-white/5 hover:border-[#D4AF37]/30 hover:bg-zinc-900/80 shadow-sm' // Disponible
                        }`}
                        >
                        <div className="font-mono text-lg font-light text-zinc-400 w-16">
                            {time}
                        </div>

                        <div className="flex-1 flex justify-center px-2">
                            {isReserved ? (
                            isMyReservation ? (
                                <span className="text-xs font-bold text-[#F3E5AB] flex items-center gap-2 border border-[#F3E5AB]/30 px-3 py-1 rounded-full bg-[#F3E5AB]/5">
                                ✅ MON CRÉNEAU
                                </span>
                            ) : (
                                <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest">
                                INDISPONIBLE
                                </span>
                            )
                            ) : (
                                <span className="text-xs text-zinc-500 uppercase tracking-widest group-hover:text-zinc-400">
                                Libre
                                </span>
                            )}
                        </div>

                        <div className="w-24 flex justify-end">
                            {isReserved ? (
                            isMyReservation && (
                                <button
                                onClick={() => handleCancel(reservation.id)}
                                className="text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 px-3 py-1.5 rounded transition-colors"
                                >
                                Annuler
                                </button>
                            )
                            ) : (
                            <button 
                                onClick={() => handleReserve(space.id, time)}
                                disabled={!!actionLoading}
                                className="w-full text-xs bg-[#F3E5AB] text-black px-3 py-2 rounded-lg font-bold hover:bg-[#D4AF37] hover:shadow-[0_0_15px_rgba(212,175,55,0.4)] disabled:opacity-50 transition-all transform hover:scale-105 active:scale-95"
                            >
                                {actionLoading === `${space.id}-${time}` ? '...' : 'RÉSERVER'}
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
    </div>
  )
}


'use client'

import { useState, useEffect } from 'react'
import { generateSmartSlots, formatDate, formatDateForIso, CollectiveSlot } from '@/utils/booking-logic'
import { getReservationsForDate, createAdminReservation, cancelReservation, type Reservation } from './reservations-actions'
import dayjs from 'dayjs'

type PlanningGridProps = {
  openingHour: number
  closingHour: number
  currentUserId: string
  collectiveSlots: CollectiveSlot[]
}

// IDs des espaces en base de données
const SPACES = [
  { id: 1, name: '🏋️ Salle de sport', shortName: 'Sport', color: 'bg-blue-900/20 border-blue-800' },
  { id: 2, name: '🧖 Spa & Piscine', shortName: 'Spa', color: 'bg-purple-900/20 border-purple-800' }
]

export default function PlanningGrid({ openingHour, closingHour, currentUserId, collectiveSlots }: PlanningGridProps) {
  const [selectedDate, setSelectedDate] = useState(dayjs())
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(false)
  const [bookingLoading, setBookingLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(SPACES[0].id)

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
  }, [selectedDate])

  // Navigation Date
  const handlePrevDay = () => setSelectedDate(curr => curr.subtract(1, 'day'))
  const handleNextDay = () => setSelectedDate(curr => curr.add(1, 'day'))
  const handleToday = () => setSelectedDate(dayjs())

  const handleReserve = async (spaceId: number, time: string) => {
      if (!confirm(`Réserver le créneau de ${time} pour vous-même (Admin) ?`)) return

      const slotId = `${spaceId}-${time}`
      setBookingLoading(slotId)

      const dateIso = formatDateForIso(selectedDate.toDate())
      const result = await createAdminReservation(spaceId, dateIso, time)

      if (result.success) {
        await fetchReservations()
      } else {
        alert(result.message)
      }
      setBookingLoading(null)
  }

  const handleCancel = async (reservationId: number) => {
    if (!confirm("Voulez-vous vraiment annuler cette réservation ?")) return

    setLoading(true) 
    
    const result = await cancelReservation(reservationId)

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
    <div className="bg-zinc-950 rounded-xl border border-white/10 overflow-hidden flex flex-col shadow-2xl shadow-black/50">
      {/* Sticky Header Wrapper */}
      <div className="sticky top-0 z-30 bg-zinc-900/90 backdrop-blur border-b border-white/5">
        {/* Header du Calendrier */}
        <div className="p-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
            <div className="relative group">
                <h3 className="text-xl font-bold text-[#F3E5AB] capitalize flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                {formatDate(selectedDate.toDate())}
                <span className="text-sm opacity-50 group-hover:opacity-100 transition-opacity">📅</span>
                </h3>
                <input 
                    type="date" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    value={selectedDate.format('YYYY-MM-DD')}
                    onChange={(e) => e.target.value && setSelectedDate(dayjs(e.target.value))}
                />
            </div>
            {loading && <span className="text-xs text-[#D4AF37] animate-pulse font-medium">Chargement...</span>}
            </div>
            
            <div className="flex space-x-1">
                <button onClick={handlePrevDay} className="p-2 hover:bg-white/5 rounded-full text-zinc-400 hover:text-[#D4AF37] transition-colors">◀</button>
                <button onClick={handleToday} className="hidden sm:block px-3 py-1 text-xs font-medium uppercase tracking-wider hover:bg-[#D4AF37] hover:text-black rounded text-[#D4AF37] border border-[#D4AF37]/30 transition-all">Aujourd'hui</button>
                <button onClick={handleNextDay} className="p-2 hover:bg-white/5 rounded-full text-zinc-400 hover:text-[#D4AF37] transition-colors">▶</button>
            </div>
        </div>

        {/* Mobile Tabs */}
        <div className="flex md:hidden border-t border-white/5 bg-zinc-900/50">
            {SPACES.map(space => (
            <button
                key={space.id}
                onClick={() => setActiveTab(space.id)}
                className={`flex-1 py-4 text-sm font-medium transition-all relative ${
                activeTab === space.id ? 'text-[#D4AF37] bg-white/5' : 'text-zinc-500 hover:text-zinc-300'
                }`}
            >
                {space.name}
                {activeTab === space.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37] shadow-[0_0_10px_#D4AF37]" />
                )}
            </button>
            ))}
        </div>
      </div>

      {/* Grille des Créneaux */}
      <div className="flex-1 overflow-x-hidden p-0 md:p-4 bg-zinc-950">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-6 h-full">
          {SPACES.map((space) => {
            const isHiddenOnMobile = space.id !== activeTab;
            
            return (
                <div key={space.id} className={`flex flex-col space-y-2 ${isHiddenOnMobile ? 'hidden md:flex' : 'flex'}`}>
                  {/* Desktop Title */}
                  <h4 className={`hidden md:block text-center py-3 font-medium rounded-t-lg border-t border-l border-r border-white/5 bg-zinc-900/50 text-[#F3E5AB] tracking-wide`}>
                    {space.name}
                  </h4>
                  
                  <div className="space-y-3 p-4 md:p-0 pb-20 md:pb-0">
                    {slots.length === 0 && (
                      <div className="text-center py-8 text-zinc-600 italic">Aucun créneau disponible pour ce jour.</div>
                    )}
                    {slots.map((slot) => {
                      // 1. GESTION CRÉNEAU COLLECTIF
                      if (slot.type === 'collective') {
                        // Si durée > 1h30, on augmente juste d'un demi (82 * 1.5 = 123px) au lieu de proportionnel
                        const minHeight = slot.durationMinutes > 90 
                            ? 82 * 1.5 
                            : 82

                        return (
                          <div 
                            key={`${space.id}-${slot.id}`}
                            style={{ minHeight: `${minHeight}px` }}
                            className="relative flex items-center justify-between p-4 rounded-xl border border-blue-500/30 bg-blue-900/10 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                          >
                             <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent pointer-events-none" />
                             <div className="font-mono text-sm font-light text-blue-300 w-32 relative z-10">
                                 {slot.label}
                             </div>
                             <div className="flex-1 flex flex-col items-center justify-center relative z-10">
                                 <span className="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                     ✨ ACCÈS LIBRE
                                 </span>
                                 <span className="text-[10px] text-blue-300/70 mt-1 md:hidden">
                                     Sans réservation
                                 </span>
                             </div>
                             <div className="hidden md:block w-24 text-right relative z-10">
                                 <span className="text-[10px] text-blue-300/70 leading-tight block">
                                     Créneau<br/>Collectif
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

                      return (
                        <div 
                          key={`${space.id}-${slot.id}`} 
                          className={`group relative flex items-center p-4 rounded-xl border transition-all duration-300 ${
                            isReserved 
                              ? isMyReservation
                                ? 'bg-[#F3E5AB]/10 border-[#F3E5AB]/30' // Style Admin (Gold)
                                : 'bg-red-950/20 border-red-900/20' // Style Autre (Rouge)
                              : 'bg-zinc-900/40 border-white/5 hover:border-[#D4AF37]/50 hover:bg-zinc-900/80 hover:shadow-[0_0_15px_rgba(0,0,0,0.5)]'
                          }`}
                        >
                          <div className={`w-32 font-mono text-sm font-light tracking-wider ${
                            isReserved 
                              ? isMyReservation ? 'text-[#F3E5AB]' : 'text-red-500/50'
                              : 'text-zinc-400 group-hover:text-[#F3E5AB]'
                          }`}>
                            {slot.label}
                          </div>
                          <div className="flex-1 flex justify-center pl-4 border-l border-white/5">
                              {isReserved ? (
                                <div className="flex items-center justify-between w-full">
                                  {isMyReservation ? (
                                    /* ADMIN: MA RÉSERVATION (GOLD) */
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-[#F3E5AB] flex items-center gap-2 border border-[#F3E5AB]/30 px-3 py-1 rounded-full bg-[#F3E5AB]/5">
                                          ✅ MON CRÉNEAU
                                        </span>
                                    </div>
                                  ) : (
                                    /* ADMIN: RÉSERVATION D'UN CLIENT (ROUGE) */
                                    <div className="flex flex-col items-start overflow-hidden mr-2">
                                      <div className="flex items-center gap-2">
                                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                          <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Réservé</span>
                                      </div>
                                      <span className="text-sm text-zinc-300 font-medium truncate w-full">
                                        {reservation?.profiles?.last_name} <span className="text-zinc-500 text-xs">({reservation?.profiles?.apartment_number})</span>
                                      </span>
                                    </div>
                                  )}
                                  
                                  <div className="flex-shrink-0">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleCancel(reservation.id)
                                        }}
                                        className={`text-xs px-3 py-1.5 rounded transition-colors ${
                                            isMyReservation 
                                            ? 'text-red-400 hover:text-red-300 hover:bg-red-900/20' 
                                            : 'bg-red-900/50 text-red-200 border border-red-900 hover:bg-red-900'
                                        }`}
                                    >
                                        Annuler
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="w-full flex items-center justify-between gap-2">
                                    <span className="text-xs text-zinc-600 uppercase tracking-widest transition-colors">Libre</span>
                                    <div className={`transition-all duration-300 transform ${bookingLoading === `${space.id}-${time}` ? 'opacity-100' : ''}`}>
                                        <button 
                                            onClick={() => handleReserve(space.id, time)}
                                            disabled={!!bookingLoading}
                                            className="text-xs bg-[#F3E5AB] text-black px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-[#D4AF37] hover:shadow-[#D4AF37]/20 disabled:opacity-50 disabled:cursor-wait"
                                        >
                                            {bookingLoading === `${space.id}-${time}` ? '...' : 'Réserver'}
                                        </button>
                                    </div>
                                </div>
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

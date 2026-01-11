
'use client'

import { useState, useEffect } from 'react'
import { generateSmartSlots, formatDate, formatDateForIso, CollectiveSlot, APP_TIMEZONE } from '@/utils/booking-logic'
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
      const resTime = dayjs(r.start_time).tz(APP_TIMEZONE).format('HH:mm')
      return r.space_id === spaceId && resTime === time
    })
  }

  return (
    <div className="w-full">
      {/* Sticky Date Navigation */}
      <div className="sticky top-0 z-30 bg-neutral-950/90 backdrop-blur-xl border-b border-white/5 py-4 mb-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-2">
            
            {/* Date Selector */}
            <div className="flex items-center gap-4 bg-white/[0.03] rounded-full px-2 py-1.5 border border-white/5 shadow-inner">
                <button 
                    onClick={handlePrevDay} 
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-zinc-400 hover:text-[#D4AF37] transition-colors"
                >
                    ◀
                </button>
                
                {/* Date & Calendar Trigger */}
                <div className="relative group flex items-center justify-center gap-3 min-w-[200px] px-2 cursor-pointer">
                    <span className="text-lg font-medium text-zinc-200 capitalize group-hover:text-[#D4AF37] transition-colors py-1">
                        {formatDate(selectedDate.toDate())}
                    </span>
                    
                    {/* Calendar Icon */}
                    <span className="text-zinc-500 group-hover:text-[#D4AF37] transition-colors text-xl">
                        🗓️
                    </span>

                    <input 
                        type="date" 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        value={selectedDate.format('YYYY-MM-DD')}
                        onChange={(e) => e.target.value && setSelectedDate(dayjs(e.target.value))}
                    />
                </div>

                <button 
                    onClick={handleNextDay} 
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-zinc-400 hover:text-[#D4AF37] transition-colors"
                >
                    ▶
                </button>
            </div>

            {/* Actions Droite */}
            <div className="flex items-center gap-4">
                <button 
                    onClick={handleToday} 
                    className="text-xs font-medium text-zinc-500 hover:text-zinc-300 uppercase tracking-widest px-3 py-1 transition-colors"
                >
                    Aujourd'hui
                </button>
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
                  
                  <div className="space-y-2">
                    {slots.length === 0 && (
                      <div className="text-center py-12 text-zinc-600 font-light italic">Aucun créneau disponible.</div>
                    )}
                    {slots.map((slot) => {
                      // 1. GESTION CRÉNEAU COLLECTIF
                      if (slot.type === 'collective') {
                        const minHeight = slot.durationMinutes > 90 ? 120 : 80
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
                                     ✨ Accès Libre
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
                                        disabled={!!bookingLoading}
                                        className="bg-zinc-900 text-zinc-400 text-xs font-medium px-4 py-2 rounded-lg border border-zinc-800 hover:bg-[#D4AF37] hover:text-black hover:border-[#D4AF37] transition-all duration-300 disabled:opacity-50"
                                    >
                                        {bookingLoading === `${space.id}-${time}` ? '...' : 'Réserver'}
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
                                ? 'bg-[#D4AF37]/5 border-[#D4AF37]/20' // Mon créneau (Gold subtil)
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
                                <div className="flex flex-col">
                                    <span className="text-xs text-red-300/60 font-medium">
                                        Réservé
                                    </span>
                                    <span className="text-xs text-zinc-600">
                                        {reservation?.profiles?.last_name} ({reservation?.profiles?.apartment_number})
                                    </span>
                                </div>
                            )}
                          </div>
                          
                          <button
                            onClick={(e) => {
                                e.stopPropagation()
                                handleCancel(reservation.id)
                            }}
                            className={`text-xs px-3 py-1.5 rounded transition-colors border ${
                                isMyReservation 
                                ? 'border-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/10' 
                                : 'border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-900/50'
                            }`}
                          >
                            Annuler
                          </button>
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

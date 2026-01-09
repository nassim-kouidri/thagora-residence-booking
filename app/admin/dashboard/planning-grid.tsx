
'use client'

import { useState, useEffect } from 'react'
import { generateTimeSlots, formatDate, formatDateForIso } from '@/utils/booking-logic'
import { getReservationsForDate, createAdminReservation, cancelReservation, type Reservation } from './reservations-actions'
import dayjs from 'dayjs'

type PlanningGridProps = {
  openingHour: number
  closingHour: number
}

// IDs des espaces en base de données
const SPACES = [
  { id: 1, name: '🏋️ Espace Sport + Piscine', shortName: 'Sport & Piscine', color: 'bg-blue-900/20 border-blue-800' },
  { id: 2, name: '🧖 Spa + Salle de jeux', shortName: 'Spa & Jeux', color: 'bg-purple-900/20 border-purple-800' }
]

export default function PlanningGrid({ openingHour, closingHour }: PlanningGridProps) {
  const [selectedDate, setSelectedDate] = useState(dayjs())
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(false)
  const [bookingLoading, setBookingLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(SPACES[0].id)

  // Génération des créneaux basés sur les props
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
  }, [selectedDate])

  // Navigation Date
  const handlePrevDay = () => setSelectedDate(curr => curr.subtract(1, 'day'))
  const handleNextDay = () => setSelectedDate(curr => curr.add(1, 'day'))
  const handleToday = () => setSelectedDate(dayjs())

  const handleReserve = async (spaceId: number, time: string) => {
      // Pas de confirmation nécessaire pour l'admin, c'est plus rapide.
      // Ou une petite confirmation si on veut être prudent.
      if (!confirm(`Réserver le créneau de ${time} pour vous-même (Admin) ?`)) return

      const slotId = `${spaceId}-${time}`
      setBookingLoading(slotId)

      const dateIso = formatDateForIso(selectedDate.toDate())
      const result = await createAdminReservation(spaceId, dateIso, time)

      if (result.success) {
        // On rafraichit les données pour voir la réservation apparaitre
        await fetchReservations()
      } else {
        alert(result.message)
      }
      setBookingLoading(null)
  }

  const handleCancel = async (reservationId: number) => {
    if (!confirm("Voulez-vous vraiment annuler cette réservation ?")) return

    // On utilise un petit loading local si on veut, ou le loading global
    // Pour faire simple et rapide on réutilise le loading global de la grille le temps de l'action
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
      // Comparaison simple des heures (Attention aux minutes si décalage)
      const resTime = dayjs(r.start_time).format('HH:mm')
      return r.space_id === spaceId && resTime === time
    })
  }

  return (
    <div className="bg-zinc-950 rounded-xl border border-white/10 overflow-hidden flex flex-col h-[calc(100vh-120px)] md:h-[700px] shadow-2xl shadow-black/50">
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
                {space.shortName}
                {activeTab === space.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37] shadow-[0_0_10px_#D4AF37]" />
                )}
            </button>
            ))}
        </div>
      </div>

      {/* Grille des Créneaux */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-0 md:p-4 bg-zinc-950 scrollbar-thin scrollbar-thumb-zinc-800">
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
                    {timeSlots.map((time) => {
                      const reservation = getReservationForSlot(space.id, time)
                      const isReserved = !!reservation

                      return (
                        <div 
                          key={`${space.id}-${time}`} 
                          className={`group relative flex items-center p-4 rounded-xl border transition-all duration-300 ${
                            isReserved 
                              ? 'bg-red-950/20 border-red-900/20' 
                              : 'bg-zinc-900/40 border-white/5 hover:border-[#D4AF37]/50 hover:bg-zinc-900/80 hover:shadow-[0_0_15px_rgba(0,0,0,0.5)]'
                          }`}
                        >
                          <div className={`w-16 font-mono text-lg font-light tracking-wider ${isReserved ? 'text-red-500/50' : 'text-zinc-400 group-hover:text-[#F3E5AB]'}`}>
                            {time}
                          </div>
                          <div className="flex-1 flex justify-center pl-4 border-l border-white/5">
                              {isReserved ? (
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex flex-col items-start overflow-hidden mr-2">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                        <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Réservé</span>
                                    </div>
                                    <span className="text-sm text-zinc-300 font-medium truncate w-full">
                                      {reservation?.profiles?.last_name} <span className="text-zinc-500 text-xs">({reservation?.profiles?.apartment_number})</span>
                                    </span>
                                  </div>
                                  
                                  <div className="flex-shrink-0">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleCancel(reservation.id)
                                        }}
                                        className="text-xs bg-red-900/50 text-red-200 border border-red-900 px-3 py-1.5 rounded hover:bg-red-900 transition-colors"
                                    >
                                        Annuler
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="w-full flex items-center justify-between">
                                    <span className="text-xs text-zinc-600 uppercase tracking-widest transition-colors">Disponible</span>
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

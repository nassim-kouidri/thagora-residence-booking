
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
  { id: 1, name: '🏋️ Espace Sport + Piscine', color: 'bg-blue-900/20 border-blue-800' },
  { id: 2, name: '🧖 Spa + Salle de jeux', color: 'bg-purple-900/20 border-purple-800' }
]

export default function PlanningGrid({ openingHour, closingHour }: PlanningGridProps) {
  const [selectedDate, setSelectedDate] = useState(dayjs())
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(false)
  const [bookingLoading, setBookingLoading] = useState<string | null>(null)
  
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
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden flex flex-col h-full">
      {/* Header du Calendrier */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
        <div className="flex items-center space-x-4">
          <div className="relative group">
            <h3 className="text-lg font-bold text-[#F3E5AB] capitalize flex items-center gap-2 cursor-pointer group-hover:text-white transition-colors">
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
          {loading && <span className="text-xs text-zinc-500 animate-pulse">(Chargement...)</span>}
          
          <div className="flex space-x-1 ml-4">
             <button onClick={handlePrevDay} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white">◀</button>
             <button onClick={handleToday} className="px-2 py-1 text-xs hover:bg-zinc-800 rounded text-zinc-400 hover:text-white border border-zinc-700">Aujourd'hui</button>
             <button onClick={handleNextDay} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white">▶</button>
          </div>
        </div>
        <div className="text-sm text-zinc-500">
           Horaires : {openingHour}h - {closingHour}h
        </div>
      </div>

      {/* Grille des Créneaux */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SPACES.map((space) => (
            <div key={space.id} className="flex flex-col space-y-2">
              <h4 className={`text-center py-2 font-medium rounded-t-lg border-t border-l border-r ${space.color} text-zinc-200`}>
                {space.name}
              </h4>
              
              <div className="space-y-2">
                {timeSlots.map((time) => {
                  const reservation = getReservationForSlot(space.id, time)
                  const isReserved = !!reservation

                  return (
                    <div 
                      key={`${space.id}-${time}`} 
                      className={`group relative flex items-center p-3 rounded-md border transition-colors ${
                        isReserved 
                          ? 'bg-red-900/10 border-red-900/30 cursor-not-allowed' 
                          : 'bg-zinc-950 border-zinc-800 hover:border-[#D4AF37]/50 cursor-pointer'
                      }`}
                    >
                      <div className={`w-16 font-mono text-sm ${isReserved ? 'text-red-400' : 'text-zinc-500 group-hover:text-[#F3E5AB]'}`}>
                        {time}
                      </div>
                      <div className="flex-1 flex justify-center">
                          {isReserved ? (
                            <div className="flex flex-col items-center relative w-full group/reserved h-full justify-center">
                              <span className="text-xs font-bold text-red-400">RÉSERVÉ</span>
                              <span className="text-[10px] text-zinc-500">
                                {reservation?.profiles?.last_name} ({reservation?.profiles?.apartment_number})
                              </span>
                              
                              <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/95 opacity-0 group-hover/reserved:opacity-100 transition-opacity rounded">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleCancel(reservation.id)
                                    }}
                                    className="text-xs bg-red-900/80 text-red-200 border border-red-700/50 px-3 py-1 rounded hover:bg-red-800 backdrop-blur-sm shadow-sm"
                                >
                                    Annuler
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-600 group-hover:text-zinc-400">Disponible</span>
                          )}
                      </div>
                      
                      {!isReserved && (
                        <div className={`transition-opacity ${bookingLoading === `${space.id}-${time}` ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            <button 
                                onClick={() => handleReserve(space.id, time)}
                                disabled={!!bookingLoading}
                                className="text-xs bg-[#F3E5AB] text-black px-2 py-1 rounded font-medium hover:bg-[#D4AF37] disabled:opacity-50 disabled:cursor-wait"
                            >
                                {bookingLoading === `${space.id}-${time}` ? '...' : 'Réserver'}
                            </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

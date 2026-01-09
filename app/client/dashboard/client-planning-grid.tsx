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
  { id: 1, name: '🏋️ Sport & Piscine', color: 'bg-blue-900/20 border-blue-800' },
  { id: 2, name: '🧖 Spa & Détente', color: 'bg-purple-900/20 border-purple-800' }
]

export default function ClientPlanningGrid({ openingHour, closingHour, currentUserId }: ClientPlanningGridProps) {
  // Navigation limitée : Aujourd'hui (0) ou Demain (1)
  const [dayOffset, setDayOffset] = useState(0) // 0 = Aujourd'hui, 1 = Demain
  
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
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden flex flex-col h-full shadow-xl">
      {/* Header : Navigation Simplifiée */}
      <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-900/50">
        <h3 className="text-xl font-bold text-[#F3E5AB] capitalize">
          {formatDate(selectedDate.toDate())}
        </h3>
        
        <div className="flex bg-black rounded-lg p-1 border border-zinc-800">
          <button 
            onClick={() => setDayOffset(0)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              dayOffset === 0 
                ? 'bg-[#F3E5AB] text-black shadow-sm' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Aujourd'hui
          </button>
          <button 
            onClick={() => setDayOffset(1)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              dayOffset === 1 
                ? 'bg-[#F3E5AB] text-black shadow-sm' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Demain
          </button>
        </div>
      </div>

      {/* Grille */}
      <div className="flex-1 overflow-auto p-4">
        {loading && <div className="text-center text-zinc-500 py-4 text-sm animate-pulse">Chargement des disponibilités...</div>}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SPACES.map((space) => (
            <div key={space.id} className="flex flex-col space-y-3">
              <h4 className={`text-center py-3 font-bold rounded-t-lg border-t border-l border-r ${space.color} text-zinc-200 uppercase tracking-wider text-sm`}>
                {space.name}
              </h4>
              
              <div className="space-y-2">
                {timeSlots.map((time) => {
                  const reservation = getReservationForSlot(space.id, time)
                  const isReserved = !!reservation
                  const isMyReservation = isReserved && reservation.user_id === currentUserId

                  return (
                    <div 
                      key={`${space.id}-${time}`} 
                      className={`relative flex items-center justify-between p-3 rounded-md border transition-all ${
                        isReserved 
                          ? isMyReservation
                            ? 'bg-green-900/10 border-green-800/50' // Ma réservation
                            : 'bg-red-900/10 border-red-900/30' // Réservé par autre
                          : 'bg-zinc-950 border-zinc-800 hover:border-[#D4AF37]/50' // Disponible
                      }`}
                    >
                      <div className="font-mono text-sm text-zinc-400 w-16">
                        {time}
                      </div>

                      <div className="flex-1 flex justify-center">
                        {isReserved ? (
                          isMyReservation ? (
                            <span className="text-xs font-bold text-green-400 flex items-center gap-1">
                              ✅ MA RÉSERVATION
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-red-500/70">
                              RÉSERVÉ
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-zinc-600">Disponible</span>
                        )}
                      </div>

                      <div className="w-20 flex justify-end">
                        {isReserved ? (
                          isMyReservation && (
                            <button
                              onClick={() => handleCancel(reservation.id)}
                              className="text-xs text-red-400 hover:text-red-300 underline"
                            >
                              Annuler
                            </button>
                          )
                        ) : (
                          <button 
                            onClick={() => handleReserve(space.id, time)}
                            disabled={!!actionLoading}
                            className="w-full text-xs bg-[#F3E5AB] text-black px-3 py-2 rounded font-bold hover:bg-[#D4AF37] disabled:opacity-50 transition-colors"
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
          ))}
        </div>
      </div>
    </div>
  )
}

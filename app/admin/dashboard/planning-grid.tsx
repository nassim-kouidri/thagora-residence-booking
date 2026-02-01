
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { generateSmartSlots, formatDate, formatDateForIso, CollectiveSlot, APP_TIMEZONE } from '@/utils/booking-logic'
import { getReservationsForDate, createAdminReservation, cancelReservation, type Reservation } from './reservations-actions'
import { getEffectiveDayConfig, type EffectiveDayConfig } from '@/app/admin/settings/schedule-actions'
import ConfirmDialog from '@/app/components/confirm-dialog'
import PickDateDialog from '@/app/components/pick-date-dialog'
import { useToast } from '@/app/components/toast-provider'
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
  const [dayConfig, setDayConfig] = useState<EffectiveDayConfig | null>(null)

  const toast = useToast()
  const [isPickDateOpen, setIsPickDateOpen] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [confirm, setConfirm] = useState<
    | null
    | { kind: 'reserve'; spaceId: number; time: string }
    | { kind: 'cancel'; reservationId: number; slotLabel: string; isMine: boolean }
  >(null)

  const effectiveOpeningHour = dayConfig && !dayConfig.is_closed ? dayConfig.opening_hour : openingHour
  const effectiveClosingHour = dayConfig && !dayConfig.is_closed ? dayConfig.closing_hour : closingHour

  // Génération des créneaux intelligents (Standards + Collectifs)
  const slots = useMemo(() => {
    if (dayConfig?.is_closed) return []
    return generateSmartSlots(effectiveOpeningHour, effectiveClosingHour, selectedDate.toDate(), collectiveSlots)
  }, [collectiveSlots, dayConfig, effectiveClosingHour, effectiveOpeningHour, selectedDate])

  const fetchReservations = useCallback(async () => {
    setLoading(true)
    const dateIso = formatDateForIso(selectedDate.toDate())
    const data = await getReservationsForDate(dateIso)
    setReservations(data)
    setLoading(false)
  }, [selectedDate])

  const fetchDayConfig = useCallback(async () => {
    const dateIso = formatDateForIso(selectedDate.toDate())
    const config = await getEffectiveDayConfig(dateIso)
    setDayConfig(config)
  }, [selectedDate])

  useEffect(() => {
    fetchDayConfig()
    fetchReservations()
  }, [fetchDayConfig, fetchReservations])

  // Navigation Date
  const handlePrevDay = () => setSelectedDate(curr => curr.subtract(1, 'day'))
  const handleNextDay = () => setSelectedDate(curr => curr.add(1, 'day'))

  const handleReserve = (spaceId: number, time: string) => {
    setConfirm({ kind: 'reserve', spaceId, time })
  }

  const handleCancel = (reservationId: number, slotLabel: string, isMine: boolean) => {
    setConfirm({ kind: 'cancel', reservationId, slotLabel, isMine })
  }

  const executeConfirm = async () => {
    if (!confirm) return
    setConfirmLoading(true)

    try {
      if (confirm.kind === 'reserve') {
        const { spaceId, time } = confirm
        const slotId = `${spaceId}-${time}`
        setBookingLoading(slotId)

        const dateIso = formatDateForIso(selectedDate.toDate())
        const result = await createAdminReservation(spaceId, dateIso, time)

        if (result.success) {
          toast.success(result.message)
          await fetchReservations()
        } else {
          toast.error(result.message)
        }

        setBookingLoading(null)
        setConfirm(null)
        return
      }

      if (confirm.kind === 'cancel') {
        setLoading(true)
        const result = await cancelReservation(confirm.reservationId)

        if (result.success) {
          toast.success(result.message)
          await fetchReservations()
        } else {
          toast.error(result.message)
          setLoading(false)
        }

        setConfirm(null)
      }
    } finally {
      setConfirmLoading(false)
    }
  }

  const getReservationForSlot = (spaceId: number, time: string) => {
    return reservations.find(r => {
      const resTime = dayjs(r.start_time).tz(APP_TIMEZONE).format('HH:mm')
      return r.space_id === spaceId && resTime === time
    })
  }

  const summary = useMemo(() => {
    const collectiveCount = slots.filter((s) => s.type === 'collective').length
    const standardTimes = slots.filter((s) => s.type === 'standard').map((s) => s.start)
    const totalStandard = standardTimes.length * SPACES.length

    const standardTimeSet = new Set(standardTimes)
    const reservedStandard = reservations.filter((r) => {
      const t = dayjs(r.start_time).tz(APP_TIMEZONE).format('HH:mm')
      return standardTimeSet.has(t)
    }).length

    const availableStandard = Math.max(0, totalStandard - reservedStandard)
    const myReservations = reservations.filter((r) => r.user_id === currentUserId).length

    return {
      collectiveCount,
      totalStandard,
      reservedStandard,
      availableStandard,
      myReservations,
    }
  }, [currentUserId, reservations, slots])

  const summaryTitle = useMemo(() => {
    if (dayConfig?.is_closed) return 'Espaces fermés'
    if (loading) return 'Chargement du planning...'
    if (slots.length === 0) return 'Aucun créneau disponible.'
    if (summary.reservedStandard === 0) return `Aucun créneau réservé le ${formatDate(selectedDate.toDate())}.`
    return `${summary.reservedStandard} créneau${summary.reservedStandard > 1 ? 'x' : ''} réservé${summary.reservedStandard > 1 ? 's' : ''} le ${formatDate(selectedDate.toDate())}.`
  }, [dayConfig, loading, selectedDate, slots.length, summary.reservedStandard])

  const reserveButtonClassName =
    'inline-flex items-center justify-center rounded-lg border px-4 py-2.5 text-xs font-medium transition-colors ' +
    'bg-[#D4AF37]/10 text-[#F3E5AB] border-[#D4AF37]/25 ' +
    'hover:bg-[#D4AF37]/20 hover:border-[#D4AF37]/40 ' +
    'active:bg-[#D4AF37]/30 active:border-[#D4AF37]/55 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/40 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <div className="w-full">
      {/* Sticky Date Navigation */}
      <div className="sticky top-0 z-30 bg-gradient-to-b from-neutral-950/95 to-neutral-950/80 backdrop-blur-xl border-b border-white/5 shadow-[0_16px_40px_rgba(0,0,0,0.35)] py-4 mb-8">
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
                <div
                    className="relative group flex items-center justify-center gap-3 min-w-[200px] px-2 cursor-pointer"
                    onClick={() => setIsPickDateOpen(true)}
                    title="Cliquer pour saisir une date (JJ/MM/AAAA)"
                >
                    <span className="text-lg font-medium text-zinc-200 capitalize group-hover:text-[#D4AF37] transition-colors py-1">
                        {formatDate(selectedDate.toDate())}
                    </span>
                    
                    {/* Calendar Icon */}
                    <span className="text-zinc-500 group-hover:text-[#D4AF37] transition-colors text-xl">
                        🗓️
                    </span>

                    {/*
                      NOTE:
                      On n'utilise pas `type="date"` ici car l'affichage (mm/dd/yyyy, etc.) dépend de la locale navigateur.
                      On force une saisie francophone via une saisie `JJ/MM/AAAA`.
                    */}
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
                {loading && (
                  <span className="text-xs text-[#D4AF37] animate-pulse" role="status" aria-live="polite">
                    Chargement...
                  </span>
                )}
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

        {/* Résumé contextuel */}
        <div className="px-2 pt-4">
          <div className="rounded-2xl border border-white/5 bg-gradient-to-b from-white/[0.06] to-white/[0.02] shadow-[0_10px_30px_rgba(0,0,0,0.35)] p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className={`text-sm font-medium ${dayConfig?.is_closed ? 'text-red-200' : 'text-zinc-200'}`}>{summaryTitle}</div>
                {dayConfig?.is_closed && (
                  <div className="text-xs text-red-300/80 mt-1">{dayConfig.closure_message}</div>
                )}
              </div>

              {!dayConfig?.is_closed && (
                <div className="flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[11px] border border-white/5 bg-black/30 text-zinc-300">
                    Libres: <span className="text-[#F3E5AB] font-semibold">{summary.availableStandard}</span>/{summary.totalStandard}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[11px] border border-white/5 bg-black/30 text-zinc-300">
                    Réservés: <span className="text-zinc-100 font-semibold">{summary.reservedStandard}</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[11px] border border-blue-500/20 bg-blue-950/15 text-blue-200">
                    Collectifs: <span className="font-semibold">{summary.collectiveCount}</span>
                  </span>
                  {summary.myReservations > 0 && (
                    <span className="px-2.5 py-1 rounded-full text-[11px] border border-[#D4AF37]/20 bg-[#D4AF37]/10 text-[#F3E5AB]">
                      Mes réservations: <span className="font-semibold">{summary.myReservations}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
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
                    {dayConfig?.is_closed && (
                      <div className="mb-3 rounded-lg border border-red-900/40 bg-red-900/10 p-4">
                        <div className="text-sm font-semibold text-red-200">Espaces fermés</div>
                        <div className="text-sm text-red-300/80 mt-1">{dayConfig.closure_message}</div>
                      </div>
                    )}
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
                                        className={reserveButtonClassName}
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
                                handleCancel(reservation.id, slot.label, isMyReservation)
                            }}
                            className={`text-xs px-3 py-1.5 rounded transition-colors border ${
                                isMyReservation 
                                ? 'border-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/10' 
                                : 'border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-900/50'
                            }`}
                            aria-label={`Annuler la réservation (${slot.label})`}
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

      <PickDateDialog
        key={`${isPickDateOpen ? 'open' : 'closed'}-${selectedDate.format('DD/MM/YYYY')}`}
        open={isPickDateOpen}
        initialDateFr={selectedDate.format('DD/MM/YYYY')}
        onClose={() => setIsPickDateOpen(false)}
        onPick={(d) => setSelectedDate(d)}
      />

      <ConfirmDialog
        open={!!confirm}
        title={
          confirm?.kind === 'reserve'
            ? 'Réserver ce créneau ?'
            : confirm?.kind === 'cancel'
              ? 'Annuler cette réservation ?'
              : ''
        }
        description={
          confirm?.kind === 'reserve'
            ? `Vous allez réserver le créneau de ${confirm.time} pour vous-même (Admin).`
            : confirm?.kind === 'cancel'
              ? `Créneau : ${confirm.slotLabel}${confirm.isMine ? '' : ' (locataire)'}`
              : undefined
        }
        confirmLabel={confirm?.kind === 'reserve' ? 'Réserver' : 'Annuler la réservation'}
        destructive={confirm?.kind === 'cancel' && !confirm?.isMine}
        loading={confirmLoading}
        onClose={() => {
          if (!confirmLoading) setConfirm(null)
        }}
        onConfirm={executeConfirm}
      />
    </div>
  )
}

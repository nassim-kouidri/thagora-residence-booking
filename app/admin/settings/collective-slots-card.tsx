'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { addCollectiveSlot, deleteCollectiveSlot, type CollectiveSlot } from '@/app/admin/settings/collective-actions'
import ConfirmDialog from '@/app/components/confirm-dialog'
import { useToast } from '@/app/components/toast-provider'

const DAYS = [
  'Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'
]

const initialState = {
  error: '',
  message: '',
  success: false
}

const TIME_PATTERN = '^([01]\\d|2[0-3]):[0-5]\\d$'

export default function CollectiveSlotsCard({ slots }: { slots: CollectiveSlot[] }) {
  const [state, formAction] = useActionState(addCollectiveSlot, initialState)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  const router = useRouter()
  const toast = useToast()

  const startInputRef = useRef<HTMLInputElement | null>(null)
  const endInputRef = useRef<HTMLInputElement | null>(null)
  const pendingStartDigitsBeforeCaretRef = useRef<number | null>(null)
  const pendingEndDigitsBeforeCaretRef = useRef<number | null>(null)

  const caretPosFromDigitCount = (formatted: string, digitCount: number) => {
    if (digitCount <= 0) return 0
    let seen = 0
    for (let i = 0; i < formatted.length; i++) {
      if (/[0-9]/.test(formatted[i])) {
        seen++
        if (seen === digitCount) return i + 1
      }
    }
    return formatted.length
  }

  const formatTimeInput = (raw: string) => {
    // Saisie 24h au clavier : on garde uniquement les chiffres.
    // UX : dès la première frappe, on affiche le masque complet avec le séparateur.
    // Exemple :
    //  - "0"    -> "0_:__"
    //  - "093"  -> "09:3_"
    //  - "0930" -> "09:30"
    // IMPORTANT:
    // Comme on pré-remplit les minutes à `00` dès la 1ère frappe, certains navigateurs
    // placent le curseur en fin de chaîne. La 2e frappe se retrouve alors après `:00`
    // et le `raw` peut devenir `1_:006` (au lieu de `16:00`).
    // On gère explicitement ces cas pour remapper correctement l'intention utilisateur.
    const rawTrimmed = raw.trim()
    const remapTailInput = () => {
      // Cas heures incomplètes (avec `_`) + minutes affichées `00` + 1 ou 2 chiffres tapés à la fin
      // Ex:
      //  - `1_:006`  -> `16:00`
      //  - `1_:0063` -> `16:3_`
      const mUnderscore = /^(\d)_:00(\d{1,2})$/.exec(rawTrimmed)
      if (mUnderscore) {
        const h1 = mUnderscore[1]
        const tail = mUnderscore[2]
        const h2 = tail[0]
        const minuteDigits = tail.slice(1)
        return `${h1}${h2}${minuteDigits}`
      }

      // Cas heures complètes + minutes affichées `00` + 1 ou 2 chiffres tapés à la fin
      // Ex:
      //  - `16:003`  -> `16:3_`
      //  - `16:0030` -> `16:30`
      const mHours = /^(\d{2}):00(\d{1,2})$/.exec(rawTrimmed)
      if (mHours) {
        return `${mHours[1]}${mHours[2]}`
      }

      return null
    }

    const remappedDigits = remapTailInput()
    const digits = (remappedDigits ?? rawTrimmed.replace(/\D/g, '')).slice(0, 4)
    if (digits.length === 0) return ''

    // Heures
    let hhRaw = digits.slice(0, 2)
    // Clamp uniquement quand l'utilisateur a saisi 2 chiffres
    if (hhRaw.length === 2) {
      const hhNum = Number(hhRaw)
      if (!Number.isNaN(hhNum) && hhNum > 23) hhRaw = '23'
    }
    const hh = hhRaw.padEnd(2, '_')

    // Minutes
    // Exigence UX:
    // - dès la 1re frappe, `mm` vaut par défaut `00`
    // - `mm` ne doit jamais dépasser 59
    let mm: string
    if (digits.length <= 2) {
      mm = '00'
    } else if (digits.length === 3) {
      mm = `${digits.slice(2, 3)}_`
    } else {
      let mmRaw = digits.slice(2, 4)
      const mmNum = Number(mmRaw)
      if (!Number.isNaN(mmNum) && mmNum > 59) mmRaw = '59'
      mm = mmRaw
    }

    return `${hh}:${mm}`
  }

  // Fix UX:
  // Sur un input contrôlé avec masque (HH:mm), certains navigateurs replacent le
  // curseur en fin de chaîne à chaque onChange. On recalcule une position stable
  // basée sur le nombre de chiffres avant le caret.
  useEffect(() => {
    const digitsBefore = pendingStartDigitsBeforeCaretRef.current
    if (digitsBefore == null) return
    const el = startInputRef.current
    if (!el) return

    const pos = caretPosFromDigitCount(startTime, digitsBefore)
    pendingStartDigitsBeforeCaretRef.current = null

    requestAnimationFrame(() => {
      try {
        el.setSelectionRange(pos, pos)
      } catch {
        // noop
      }
    })
  }, [startTime])

  useEffect(() => {
    const digitsBefore = pendingEndDigitsBeforeCaretRef.current
    if (digitsBefore == null) return
    const el = endInputRef.current
    if (!el) return

    const pos = caretPosFromDigitCount(endTime, digitsBefore)
    pendingEndDigitsBeforeCaretRef.current = null

    requestAnimationFrame(() => {
      try {
        el.setSelectionRange(pos, pos)
      } catch {
        // noop
      }
    })
  }, [endTime])

  const handleDelete = (id: number) => {
    setConfirmDeleteId(id)
  }

  const executeDelete = async () => {
    if (confirmDeleteId == null) return
    setIsDeleting(confirmDeleteId)
    const result = await deleteCollectiveSlot(confirmDeleteId)
    if (result.success) {
      toast.success(result.message)
      router.refresh()
    } else {
      toast.error(result.message)
    }
    setIsDeleting(null)
    setConfirmDeleteId(null)
  }

  return (
    <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 h-full flex flex-col">
      <h2 className="text-xl font-bold text-[#F3E5AB] mb-4">Créneaux Collectifs</h2>
      <p className="text-zinc-400 text-sm mb-6">
        Ajoutez des plages horaires &quot;Accès Libre&quot; (ex: Portes ouvertes). La réservation ne sera pas nécessaire sur ces créneaux.
      </p>

      {/* Liste des créneaux existants */}
      <div className="flex-1 overflow-y-auto mb-6 space-y-2 pr-2 max-h-48 scrollbar-thin scrollbar-thumb-zinc-700">
        {slots.length === 0 && (
          <div className="text-zinc-500 text-sm italic text-center py-4">Aucun créneau collectif configuré.</div>
        )}
        {slots.map(slot => (
          <div key={slot.id} className="flex items-center justify-between bg-zinc-950 p-3 rounded border border-zinc-800">
            <div>
              <span className="text-[#F3E5AB] font-medium">{DAYS[slot.day_of_week]}</span>
              <span className="text-zinc-400 text-sm ml-2">
                {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
              </span>
            </div>
            <button
              onClick={() => handleDelete(slot.id)}
              disabled={isDeleting === slot.id}
              className="text-red-400 hover:text-red-300 text-xs px-2 py-1 bg-red-900/10 hover:bg-red-900/20 rounded border border-red-900/30"
              aria-label={`Supprimer le créneau collectif du ${DAYS[slot.day_of_week]} (${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)})`}
            >
              {isDeleting === slot.id ? '...' : '✕'}
            </button>
          </div>
        ))}
      </div>

      {/* Formulaire d'ajout */}
      <form action={formAction} className="border-t border-zinc-800 pt-4 mt-auto">
        <div className="grid grid-cols-1 gap-3">
          <select 
            name="dayOfWeek" 
            className="bg-black border border-zinc-700 text-white text-sm rounded-md block w-full p-2.5 focus:border-[#D4AF37] focus:ring-[#D4AF37]"
          >
            {DAYS.map((day, idx) => (
              <option key={idx} value={idx}>{day}</option>
            ))}
          </select>
          
          <div className="flex gap-2">
            <div className="flex-1">
              <input 
                type="text"
                inputMode="numeric"
                name="startTime" 
                required
                placeholder="HH:mm"
                pattern={TIME_PATTERN}
                title="Format attendu : HH:mm (24h)"
                value={startTime}
                onChange={(e) => {
                  const el = e.currentTarget
                  const caret = el.selectionStart ?? el.value.length
                  pendingStartDigitsBeforeCaretRef.current = el.value.slice(0, caret).replace(/\D/g, '').length
                  setStartTime(formatTimeInput(el.value))
                }}
                ref={startInputRef}
                className="bg-black border border-zinc-700 text-white text-sm rounded-md block w-full p-2.5 focus:border-[#D4AF37] focus:ring-[#D4AF37]"
              />
            </div>
            <span className="text-zinc-500 self-center">à</span>
            <div className="flex-1">
              <input 
                type="text"
                inputMode="numeric"
                name="endTime" 
                required
                placeholder="HH:mm"
                pattern={TIME_PATTERN}
                title="Format attendu : HH:mm (24h)"
                value={endTime}
                onChange={(e) => {
                  const el = e.currentTarget
                  const caret = el.selectionStart ?? el.value.length
                  pendingEndDigitsBeforeCaretRef.current = el.value.slice(0, caret).replace(/\D/g, '').length
                  setEndTime(formatTimeInput(el.value))
                }}
                ref={endInputRef}
                className="bg-black border border-zinc-700 text-white text-sm rounded-md block w-full p-2.5 focus:border-[#D4AF37] focus:ring-[#D4AF37]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full text-black bg-[#F3E5AB] hover:bg-[#D4AF37] focus:ring-4 focus:outline-none focus:ring-[#D4AF37]/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center transition-colors mt-2"
          >
            Ajouter le créneau
          </button>

          <div role="status" aria-live="polite">
            {state?.error && <p className="text-red-400 text-xs mt-2">{state.error}</p>}
            {state?.success && <p className="text-green-400 text-xs mt-2">{state.message}</p>}
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={confirmDeleteId != null}
        title="Supprimer ce créneau collectif ?"
        description="Les créneaux standards qui se chevauchent redeviendront visibles et réservables."
        confirmLabel="Supprimer"
        destructive
        loading={confirmDeleteId != null && isDeleting === confirmDeleteId}
        onClose={() => {
          if (confirmDeleteId != null && isDeleting === confirmDeleteId) return
          setConfirmDeleteId(null)
        }}
        onConfirm={executeDelete}
      />
    </div>
  )
}

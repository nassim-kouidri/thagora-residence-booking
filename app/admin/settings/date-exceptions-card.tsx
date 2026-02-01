'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import ConfirmDialog from '@/app/components/confirm-dialog'
import { useToast } from '@/app/components/toast-provider'
import {
  upsertDateScheduleException,
  deleteDateScheduleException,
  type DateScheduleException,
} from '@/app/admin/settings/schedule-actions'

dayjs.extend(customParseFormat)

const initialState = {
  error: '',
  message: '',
  success: false,
}

function frDateToIso(fr: string): string | null {
  const v = fr.trim()
  // Format attendu: JJ/MM/AAAA
  const m = /^([0-3]\d)\/([0-1]\d)\/(\d{4})$/.exec(v)
  if (!m) return null
  const [, dd, mm, yyyy] = m
  const iso = `${yyyy}-${mm}-${dd}`
  return dayjs(iso, 'YYYY-MM-DD', true).isValid() ? iso : null
}

function isoToFrDate(iso: string): string {
  // iso attendu: YYYY-MM-DD
  const d = dayjs(iso, 'YYYY-MM-DD', true)
  return d.isValid() ? d.format('DD/MM/YYYY') : iso
}

export default function DateExceptionsCard({ exceptions }: { exceptions: DateScheduleException[] }) {
  const [state, formAction] = useActionState(upsertDateScheduleException, initialState)
  const [mode, setMode] = useState<'hours' | 'closed'>('hours')
  const [isDeleting, setIsDeleting] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [dateFr, setDateFr] = useState('')

  const router = useRouter()
  const toast = useToast()

  const dateInputRef = useRef<HTMLInputElement | null>(null)
  const pendingDateDigitsBeforeCaretRef = useRef<number | null>(null)

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

  const formatDateFrInput = (raw: string) => {
    // On laisse l'utilisateur taper uniquement des chiffres.
    // UX : dès la première frappe, on affiche le masque complet avec les séparateurs.
    // Exemple :
    //  - "1"      -> "1_/__/____"
    //  - "1701"   -> "17/01/____"
    //  - "17012026" -> "17/01/2026"
    const digits = raw.replace(/\D/g, '').slice(0, 8)
    if (digits.length === 0) return ''

    const dd = digits.slice(0, 2).padEnd(2, '_')
    const mm = digits.slice(2, 4).padEnd(2, '_')
    const yyyy = digits.slice(4, 8).padEnd(4, '_')
    return `${dd}/${mm}/${yyyy}`
  }

  // Fix UX:
  // Lorsque l'on formate un input contrôlé (masque), certains navigateurs replacent
  // le curseur en fin de champ. On conserve ici une position cohérente basée sur
  // le nombre de chiffres saisis avant le caret.
  useEffect(() => {
    const digitsBefore = pendingDateDigitsBeforeCaretRef.current
    if (digitsBefore == null) return
    const el = dateInputRef.current
    if (!el) return

    const pos = caretPosFromDigitCount(dateFr, digitsBefore)
    pendingDateDigitsBeforeCaretRef.current = null

    // Attendre le repaint pour éviter les sauts de curseur.
    requestAnimationFrame(() => {
      try {
        el.setSelectionRange(pos, pos)
      } catch {
        // Certains navigateurs peuvent refuser setSelectionRange dans quelques cas.
      }
    })
  }, [dateFr])

  const dateDigitsCount = dateFr.replace(/\D/g, '').length
  const dateIso = frDateToIso(dateFr)

  const handleDelete = (id: number) => {
    setConfirmDeleteId(id)
  }

  const executeDelete = async () => {
    if (confirmDeleteId == null) return
    setIsDeleting(confirmDeleteId)
    const result = await deleteDateScheduleException(confirmDeleteId)
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
      <h2 className="text-xl font-bold text-[#F3E5AB] mb-4">Exceptions Calendaires</h2>
      <p className="text-zinc-400 text-sm mb-6">
        Définissez des horaires pour une date précise, ou marquez un jour comme <span className="text-zinc-200">fermé</span>.
        Les exceptions ont priorité sur les horaires hebdomadaires.
      </p>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto mb-6 space-y-2 pr-2 max-h-56 scrollbar-thin scrollbar-thumb-zinc-700">
        {exceptions.length === 0 && (
          <div className="text-zinc-500 text-sm italic text-center py-4">Aucune exception configurée.</div>
        )}

        {exceptions.map((ex) => {
          const label = ex.is_closed
            ? `Fermé — ${ex.closure_message || ''}`
            : `${ex.opening_hour}h00 – ${ex.closing_hour}h00`

          return (
            <div key={ex.id} className="flex items-start justify-between bg-zinc-950 p-3 rounded border border-zinc-800 gap-3">
              <div>
                <div className="text-sm font-medium text-[#F3E5AB]">{isoToFrDate(ex.date)}</div>
                <div className={`text-xs ${ex.is_closed ? 'text-red-300/80' : 'text-zinc-400'}`}>{label}</div>
              </div>
              <button
                onClick={() => handleDelete(ex.id)}
                disabled={isDeleting === ex.id}
                className="text-red-400 hover:text-red-300 text-xs px-2 py-1 bg-red-900/10 hover:bg-red-900/20 rounded border border-red-900/30"
                aria-label={`Supprimer l'exception du ${isoToFrDate(ex.date)}`}
              >
                {isDeleting === ex.id ? '...' : '✕'}
              </button>
            </div>
          )
        })}
      </div>

      {/* Formulaire */}
      <form action={formAction} className="border-t border-zinc-800 pt-4 mt-auto space-y-3">
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Date</label>
            {/*
              IMPORTANT:
              Les inputs natifs `type="date"` affichent un format qui dépend de la locale du navigateur.
              Ici on force une saisie francophone (JJ/MM/AAAA) et on envoie au backend une date ISO.
            */}
            <input
              type="text"
              inputMode="numeric"
              placeholder="JJ/MM/AAAA"
              value={dateFr}
              onChange={(e) => {
                const el = e.currentTarget
                const caret = el.selectionStart ?? el.value.length
                pendingDateDigitsBeforeCaretRef.current = el.value.slice(0, caret).replace(/\D/g, '').length
                setDateFr(formatDateFrInput(el.value))
              }}
              ref={dateInputRef}
              className="bg-black border border-zinc-700 text-white text-sm rounded-md block w-full p-2.5 focus:border-[#D4AF37] focus:ring-[#D4AF37]"
            />
            <input type="hidden" name="date" value={dateIso ?? ''} />
            {dateDigitsCount === 8 && !dateIso && (
              <p className="text-red-400 text-xs mt-1">Format attendu : JJ/MM/AAAA</p>
            )}
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="radio"
                name="mode"
                value="hours"
                checked={mode === 'hours'}
                onChange={() => setMode('hours')}
              />
              Horaires
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="radio"
                name="mode"
                value="closed"
                checked={mode === 'closed'}
                onChange={() => setMode('closed')}
              />
              Fermé
            </label>
          </div>

          {mode === 'hours' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Ouverture</label>
                <div className="relative">
                  <input
                    type="number"
                    name="openingHour"
                    min={0}
                    max={23}
                    required
                    defaultValue={9}
                    className="bg-black border border-zinc-700 text-white text-sm rounded-md block w-full p-2.5 pr-10 focus:border-[#D4AF37] focus:ring-[#D4AF37]"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-zinc-500 text-sm">h</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Fermeture</label>
                <div className="relative">
                  <input
                    type="number"
                    name="closingHour"
                    min={0}
                    max={23}
                    required
                    defaultValue={20}
                    className="bg-black border border-zinc-700 text-white text-sm rounded-md block w-full p-2.5 pr-10 focus:border-[#D4AF37] focus:ring-[#D4AF37]"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-zinc-500 text-sm">h</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Message (visible côté locataires)</label>
              <input
                type="text"
                name="closureMessage"
                placeholder="Ex : Travaux de maintenance"
                required
                className="bg-black border border-zinc-700 text-white text-sm rounded-md block w-full p-2.5 focus:border-[#D4AF37] focus:ring-[#D4AF37]"
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full text-black bg-[#F3E5AB] hover:bg-[#D4AF37] focus:ring-4 focus:outline-none focus:ring-[#D4AF37]/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center transition-colors"
          >
            Enregistrer
          </button>

          <div role="status" aria-live="polite">
            {state?.error && <p className="text-red-400 text-xs">{state.error}</p>}
            {state?.success && <p className="text-green-400 text-xs">{state.message}</p>}
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={confirmDeleteId != null}
        title="Supprimer cette exception ?"
        description="Cette date reviendra à la configuration hebdomadaire (ou sera considérée fermée si non configurée)."
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

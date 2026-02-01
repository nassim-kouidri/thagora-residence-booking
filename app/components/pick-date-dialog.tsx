'use client'

import { useEffect, useRef, useState } from 'react'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import Modal from './modal'

dayjs.extend(customParseFormat)

function formatDateFrInput(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length === 0) return ''

  const dd = digits.slice(0, 2).padEnd(2, '_')
  const mm = digits.slice(2, 4).padEnd(2, '_')
  const yyyy = digits.slice(4, 8).padEnd(4, '_')
  return `${dd}/${mm}/${yyyy}`
}

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

export default function PickDateDialog({
  open,
  initialDateFr,
  onClose,
  onPick,
}: {
  open: boolean
  initialDateFr: string
  onClose: () => void
  onPick: (date: dayjs.Dayjs) => void
}) {
  const [value, setValue] = useState(() => initialDateFr)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const pendingDigitsBeforeCaretRef = useRef<number | null>(null)

  useEffect(() => {
    const digitsBefore = pendingDigitsBeforeCaretRef.current
    if (digitsBefore == null) return
    const el = inputRef.current
    if (!el) return

    const pos = caretPosFromDigitCount(value, digitsBefore)
    pendingDigitsBeforeCaretRef.current = null
    requestAnimationFrame(() => {
      try {
        el.setSelectionRange(pos, pos)
      } catch {
        // noop
      }
    })
  }, [value])

  const digitsCount = value.replace(/\D/g, '').length
  const parsed = dayjs(value.replace(/_/g, ''), 'DD/MM/YYYY', true)
  const isValid = digitsCount === 8 && parsed.isValid()

  return (
    <Modal
      open={open}
      title="Choisir une date"
      description="Format attendu : JJ/MM/AAAA"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-white/10 text-zinc-300 hover:bg-white/5"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isValid) return
              onPick(parsed)
              onClose()
            }}
            disabled={!isValid}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-[#F3E5AB] hover:bg-[#D4AF37] text-black disabled:opacity-50"
          >
            Valider
          </button>
        </>
      }
    >
      <label className="block text-xs font-medium text-zinc-400 mb-1" htmlFor="pick-date-input">
        Date
      </label>
      <input
        id="pick-date-input"
        ref={inputRef}
        type="text"
        inputMode="numeric"
        placeholder="JJ/MM/AAAA"
        value={value}
        onChange={(e) => {
          const el = e.currentTarget
          const caret = el.selectionStart ?? el.value.length
          pendingDigitsBeforeCaretRef.current = el.value.slice(0, caret).replace(/\D/g, '').length
          setValue(formatDateFrInput(el.value))
        }}
        className="bg-black border border-zinc-700 text-white text-sm rounded-md block w-full p-2.5 focus:border-[#D4AF37] focus:ring-[#D4AF37]"
      />
      {digitsCount === 8 && !parsed.isValid() && (
        <p className="text-red-400 text-xs mt-2" role="status" aria-live="polite">
          Date invalide.
        </p>
      )}
    </Modal>
  )
}

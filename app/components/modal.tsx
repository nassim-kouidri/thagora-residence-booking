'use client'

import type { ReactNode } from 'react'
import { useEffect, useId, useRef } from 'react'

type ModalProps = {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children?: ReactNode
  footer?: ReactNode
}

export default function Modal({ open, title, description, onClose, children, footer }: ModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const previousActive = useRef<HTMLElement | null>(null)

  const baseId = useId()
  const labelledById = `${baseId}-title`
  const describedById = `${baseId}-desc`

  useEffect(() => {
    if (!open) return
    previousActive.current = document.activeElement as HTMLElement | null
    const t = window.setTimeout(() => {
      panelRef.current?.focus()
    }, 0)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (open) return
    previousActive.current?.focus?.()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90]">
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledById}
          aria-describedby={description ? describedById : undefined}
          className="w-full max-w-lg rounded-2xl border border-white/10 bg-neutral-950/95 backdrop-blur-xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h3 id={labelledById} className="text-lg font-semibold text-[#F3E5AB]">
                  {title}
                </h3>
                {description && (
                  <p id={describedById} className="text-sm text-zinc-400 mt-1">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-zinc-400 hover:text-zinc-200"
                aria-label="Fermer la fenêtre"
              >
                ✕
              </button>
            </div>

            {children && <div className="mt-5">{children}</div>}
          </div>

          {footer && <div className="border-t border-white/10 p-4 flex items-center justify-end gap-3">{footer}</div>}
        </div>
      </div>
    </div>
  )
}

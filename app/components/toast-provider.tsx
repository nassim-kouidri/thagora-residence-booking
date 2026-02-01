'use client'

import type { ReactNode } from 'react'
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info'

export type Toast = {
  id: string
  type: ToastType
  message: string
}

type ToastContextValue = {
  push: (toast: Omit<Toast, 'id'>) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

function typeStyles(type: ToastType) {
  switch (type) {
    case 'success':
      return {
        wrapper: 'border-emerald-900/40 bg-emerald-950/60',
        dot: 'bg-emerald-400',
        text: 'text-emerald-100',
      }
    case 'error':
      return {
        wrapper: 'border-red-900/40 bg-red-950/60',
        dot: 'bg-red-400',
        text: 'text-red-100',
      }
    case 'info':
    default:
      return {
        wrapper: 'border-white/10 bg-neutral-950/70',
        dot: 'bg-[#D4AF37]',
        text: 'text-zinc-100',
      }
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const remove = useCallback((id: string) => {
    const t = timersRef.current.get(id)
    if (t) {
      clearTimeout(t)
      timersRef.current.delete(id)
    }
    setToasts((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const push = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      setToasts((prev) => [{ id, ...toast }, ...prev].slice(0, 3))
      const timer = setTimeout(() => remove(id), 3500)
      timersRef.current.set(id, timer)
    },
    [remove]
  )

  const value = useMemo<ToastContextValue>(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Region live pour lecteurs d'écran */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-sm" aria-live="polite" aria-relevant="additions removals">
        {toasts.map((t) => {
          const styles = typeStyles(t.type)
          return (
            <div
              key={t.id}
              role="status"
              className={`backdrop-blur-xl border rounded-xl px-4 py-3 shadow-lg ${styles.wrapper}`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-2 h-2 w-2 rounded-full ${styles.dot}`} aria-hidden="true" />
                <div className={`text-sm leading-snug ${styles.text}`}>{t.message}</div>
                <button
                  type="button"
                  onClick={() => remove(t.id)}
                  className="ml-auto text-xs text-zinc-400 hover:text-zinc-200"
                  aria-label="Fermer la notification"
                >
                  ✕
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return {
    push: ctx.push,
    success: (message: string) => ctx.push({ type: 'success', message }),
    error: (message: string) => ctx.push({ type: 'error', message }),
    info: (message: string) => ctx.push({ type: 'info', message }),
  }
}

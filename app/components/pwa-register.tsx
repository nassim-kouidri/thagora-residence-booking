'use client'

import { useEffect } from 'react'

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    const register = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js')
      } catch (e) {
        console.error('PWA: échec enregistrement service worker', e)
      }
    }

    register()
  }, [])

  return null
}

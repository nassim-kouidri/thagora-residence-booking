'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    try {
      // 1. Sign out from Supabase (clears local cookies/storage)
      await supabase.auth.signOut()
      
      // 2. Force a router refresh to clear the client cache
      router.refresh()
      
      // 3. Redirect to login
      router.push('/login')
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error)
      // Fallback redirect just in case
      window.location.href = '/login'
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="bg-red-900/30 hover:bg-red-900/50 text-red-200 border border-red-900/50 px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-wait"
    >
      {loading ? 'Déconnexion...' : 'Se déconnecter'}
    </button>
  )
}

'use client'

import { signOut } from '@/app/login/actions'

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut()}
      className="bg-red-900/30 hover:bg-red-900/50 text-red-200 border border-red-900/50 px-4 py-2 rounded-lg text-sm transition-colors"
    >
      Se déconnecter
    </button>
  )
}

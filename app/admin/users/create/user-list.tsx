'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deactivateUser } from './actions'
import ConfirmDialog from '@/app/components/confirm-dialog'
import { useToast } from '@/app/components/toast-provider'

type User = {
  id: string
  last_name: string
  apartment_number: string
  created_at: string
}

export default function UserList({ users }: { users: User[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [confirmUserId, setConfirmUserId] = useState<string | null>(null)
  const router = useRouter()
  const toast = useToast()

  const handleDelete = (userId: string) => {
    setConfirmUserId(userId)
  }

  const executeDelete = async () => {
    if (!confirmUserId) return

    setLoadingId(confirmUserId)
    const result = await deactivateUser(confirmUserId)

    if (!result.success) {
      toast.error(result.message)
    } else {
      toast.success(result.message)
      router.refresh()
    }
    setLoadingId(null)
    setConfirmUserId(null)
  }

  if (users.length === 0) {
    return (
      <div className="text-center text-zinc-500 py-8 border border-zinc-800 rounded-lg bg-zinc-900/50">
        Aucun locataire actif.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-[#F3E5AB]">Locataires Actifs ({users.length})</h3>
      <div className="grid gap-3">
        {users.map((user) => (
          <div 
            key={user.id} 
            className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-4 rounded-lg hover:border-[#F3E5AB]/30 transition-colors"
          >
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 rounded-full bg-[#F3E5AB]/10 flex items-center justify-center text-[#F3E5AB] font-bold text-sm">
                {user.apartment_number}
              </div>
              <div>
                <div className="font-medium text-white">
                  {user.last_name}
                </div>
                <div className="text-xs text-zinc-500">
                  Inscrit le {new Date(user.created_at).toLocaleDateString('fr-FR')}
                </div>
              </div>
            </div>
            <button
              onClick={() => handleDelete(user.id)}
              disabled={loadingId === user.id}
              className="px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 border border-red-900/50 hover:border-red-800 bg-red-900/10 hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
              aria-label={`Désactiver le locataire ${user.last_name} (${user.apartment_number})`}
            >
              {loadingId === user.id ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={confirmUserId != null}
        title="Désactiver ce locataire ?"
        description="Le compte sera marqué comme inactif (historique conservé)."
        confirmLabel="Désactiver"
        destructive
        loading={confirmUserId != null && loadingId === confirmUserId}
        onClose={() => {
          if (confirmUserId != null && loadingId === confirmUserId) return
          setConfirmUserId(null)
        }}
        onConfirm={executeDelete}
      />
    </div>
  )
}

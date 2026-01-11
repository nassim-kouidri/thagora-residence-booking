'use client'

import { useActionState, useState } from 'react'
import { addCollectiveSlot, deleteCollectiveSlot, type CollectiveSlot } from '@/app/admin/settings/collective-actions'

const DAYS = [
  'Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'
]

const initialState = {
  error: '',
  message: '',
  success: false
}

export default function CollectiveSlotsCard({ slots }: { slots: CollectiveSlot[] }) {
  const [state, formAction] = useActionState(addCollectiveSlot, initialState)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce créneau collectif ?')) return
    setIsDeleting(id)
    await deleteCollectiveSlot(id)
    setIsDeleting(null)
  }

  return (
    <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 h-full flex flex-col">
      <h2 className="text-xl font-bold text-[#F3E5AB] mb-4">Créneaux Collectifs</h2>
      <p className="text-zinc-400 text-sm mb-6">
        Ajoutez des plages horaires "Accès Libre" (ex: Portes ouvertes). La réservation ne sera pas nécessaire sur ces créneaux.
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
                type="time" 
                name="startTime" 
                required 
                className="bg-black border border-zinc-700 text-white text-sm rounded-md block w-full p-2.5 focus:border-[#D4AF37] focus:ring-[#D4AF37]"
              />
            </div>
            <span className="text-zinc-500 self-center">à</span>
            <div className="flex-1">
              <input 
                type="time" 
                name="endTime" 
                required 
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

          {state?.error && <p className="text-red-400 text-xs mt-2">{state.error}</p>}
          {state?.success && <p className="text-green-400 text-xs mt-2">{state.message}</p>}
        </div>
      </form>
    </div>
  )
}

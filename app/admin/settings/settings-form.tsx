'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { updateAppSettings } from '@/app/admin/settings/actions'

type SettingsFormProps = {
  initialOpeningHour: number
  initialClosingHour: number
}

const initialState = {
  error: '',
  message: '',
  success: false
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-black bg-[#F3E5AB] hover:bg-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? 'Mise à jour...' : 'Sauvegarder les horaires'}
    </button>
  )
}

export default function SettingsForm({ initialOpeningHour, initialClosingHour }: SettingsFormProps) {
  const [state, formAction] = useActionState(updateAppSettings, initialState)

  return (
    <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 h-full">
      <h2 className="text-xl font-bold text-[#F3E5AB] mb-4">Configuration Générale</h2>
      <p className="text-zinc-400 text-sm mb-6">Définissez les plages horaires d&apos;ouverture des espaces communs pour l&apos;ensemble de la résidence.</p>
      
      <form action={formAction} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="openingHour" className="block text-sm font-medium text-zinc-400">
              Ouverture
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                type="number"
                name="openingHour"
                id="openingHour"
                required
                min={0}
                max={23}
                defaultValue={initialOpeningHour}
                className="block w-full px-3 py-2 bg-black border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37] sm:text-sm"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-zinc-500 sm:text-sm">h00</span>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="closingHour" className="block text-sm font-medium text-zinc-400">
              Fermeture
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                type="number"
                name="closingHour"
                id="closingHour"
                required
                min={0}
                max={23}
                defaultValue={initialClosingHour}
                className="block w-full px-3 py-2 bg-black border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37] sm:text-sm"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-zinc-500 sm:text-sm">h00</span>
              </div>
            </div>
          </div>
        </div>

        {state?.error && (
          <div className="rounded-md bg-red-900/20 p-4 border border-red-900">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-400">Erreur</h3>
                <div className="mt-2 text-sm text-red-300">
                  <p>{state.error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {state?.success && (
          <div className="rounded-md bg-green-900/20 p-4 border border-green-900">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-400">Succès</h3>
                <div className="mt-2 text-sm text-green-300">
                  <p>{state.message}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2">
          <SubmitButton />
        </div>
      </form>
    </div>
  )
}

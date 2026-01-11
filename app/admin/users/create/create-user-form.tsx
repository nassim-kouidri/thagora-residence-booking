'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { createUser } from './actions'

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
      {pending ? 'Création en cours...' : 'Créer le locataire'}
    </button>
  )
}

export default function CreateUserForm() {
  const [state, formAction] = useActionState(createUser, initialState)

  return (
    <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
      <h2 className="text-xl font-bold text-[#F3E5AB] mb-4">Nouveau Locataire</h2>
      
      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-zinc-400">
            Nom de famille <span className="text-zinc-600 text-xs">(Optionnel)</span>
          </label>
          <input
            type="text"
            name="lastName"
            id="lastName"
            placeholder="Ex: Famille Salah"
            className="mt-1 block w-full px-3 py-2 bg-black border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37] sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="apartmentSuffix" className="block text-sm font-medium text-zinc-400">
            N° Appartement
          </label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <span className="inline-flex items-center rounded-l-md border border-r-0 border-zinc-700 bg-zinc-800 px-3 text-zinc-400 sm:text-sm">
              A0
            </span>
            <input
              type="text"
              name="apartmentSuffix"
              id="apartmentSuffix"
              required
              placeholder="3"
              className="block w-full min-w-0 flex-1 rounded-none rounded-r-md border border-zinc-700 bg-black px-3 py-2 text-white placeholder-zinc-500 focus:border-[#D4AF37] focus:ring-[#D4AF37] sm:text-sm"
            />
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            L'identifiant et le mot de passe seront générés automatiquement (ex: A03).
          </p>
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

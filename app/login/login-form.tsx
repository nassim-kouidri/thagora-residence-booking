'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { login } from './actions'

const initialState = {
  error: '',
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-black bg-[#F3E5AB] hover:bg-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? 'Connexion en cours...' : 'Se connecter'}
    </button>
  )
}

export default function LoginForm() {
  const [state, formAction] = useActionState(login, initialState)

  return (
    <form action={formAction} className="space-y-6 w-full max-w-sm">
      <div>
        <label
          htmlFor="identifier"
          className="block text-sm font-medium text-[#F3E5AB]"
        >
          Identifiant
        </label>
        <div className="mt-1">
          <input
            id="identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            required
            className="appearance-none block w-full px-3 py-3 border border-zinc-700 bg-zinc-900 placeholder-zinc-500 text-white rounded-md focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37] sm:text-sm"
            placeholder="Nom de famille"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-[#F3E5AB]"
        >
          Mot de passe
        </label>
        <div className="mt-1">
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="appearance-none block w-full px-3 py-3 border border-zinc-700 bg-zinc-900 placeholder-zinc-500 text-white rounded-md focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37] sm:text-sm"
            placeholder="••••••••"
          />
        </div>
      </div>

      {state?.error && (
        <div className="text-red-400 text-sm text-center bg-red-900/20 p-2 rounded border border-red-900">
          {state.error}
        </div>
      )}

      <div>
        <SubmitButton />
      </div>
    </form>
  )
}

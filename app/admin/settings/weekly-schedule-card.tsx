'use client'

import { useActionState } from 'react'
import { upsertWeeklySchedule, type WeeklySchedule } from '@/app/admin/settings/schedule-actions'

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

const initialState = {
  error: '',
  message: '',
  success: false,
}

function getScheduleForDay(schedules: WeeklySchedule[], dayOfWeek: number) {
  return schedules.find((s) => s.day_of_week === dayOfWeek)
}

export default function WeeklyScheduleCard({ schedules }: { schedules: WeeklySchedule[] }) {
  const [state, formAction] = useActionState(upsertWeeklySchedule, initialState)

  return (
    <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 h-full flex flex-col">
      <h2 className="text-xl font-bold text-[#F3E5AB] mb-4">Horaires Hebdomadaires</h2>
      <p className="text-zinc-400 text-sm mb-6">
        Définissez des plages horaires par jour de la semaine. Ces horaires sont la base du planning. Les exceptions calendaires gardent la priorité.
      </p>

      <div className="space-y-3">
        {DAYS.map((day, idx) => {
          const existing = getScheduleForDay(schedules, idx)

          return (
            <form
              key={idx}
              action={formAction}
              className="flex flex-col md:flex-row md:items-center gap-3 bg-zinc-950 p-3 rounded border border-zinc-800"
            >
              <input type="hidden" name="dayOfWeek" value={idx} />

              <div className="flex-1">
                <div className="text-sm font-medium text-[#F3E5AB]">{day}</div>
                <div className="text-xs text-zinc-500">
                  {existing
                    ? `Actuel : ${existing.opening_hour}h00 – ${existing.closing_hour}h00`
                    : 'Actuel : (non configuré)'}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="number"
                    name="openingHour"
                    min={0}
                    max={23}
                    required
                    defaultValue={existing?.opening_hour ?? 9}
                    className="w-20 pr-6 bg-black border border-zinc-700 text-white text-sm rounded-md p-2 focus:border-[#D4AF37] focus:ring-[#D4AF37]"
                  />
                  <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                    <span className="text-zinc-500 text-sm">h</span>
                  </div>
                </div>
                <span className="text-zinc-500 text-sm">→</span>
                <div className="relative">
                  <input
                    type="number"
                    name="closingHour"
                    min={0}
                    max={23}
                    required
                    defaultValue={existing?.closing_hour ?? 20}
                    className="w-20 pr-6 bg-black border border-zinc-700 text-white text-sm rounded-md p-2 focus:border-[#D4AF37] focus:ring-[#D4AF37]"
                  />
                  <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                    <span className="text-zinc-500 text-sm">h</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="md:w-auto w-full text-black bg-[#F3E5AB] hover:bg-[#D4AF37] focus:ring-4 focus:outline-none focus:ring-[#D4AF37]/50 font-medium rounded-lg text-sm px-4 py-2 text-center transition-colors"
              >
                Sauvegarder
              </button>
            </form>
          )
        })}
      </div>

      {(state?.error || state?.success) && (
        <div className="mt-4" role="status" aria-live="polite">
          {state?.error && <p className="text-red-400 text-xs">{state.error}</p>}
          {state?.success && <p className="text-green-400 text-xs">{state.message}</p>}
        </div>
      )}
    </div>
  )
}


import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import isBetween from 'dayjs/plugin/isBetween'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(isBetween)
dayjs.extend(customParseFormat)
dayjs.locale('fr')

export type CollectiveSlot = {
  id: number
  day_of_week: number
  start_time: string // HH:mm:ss
  end_time: string   // HH:mm:ss
}

export type GeneratedSlot = {
  id: string
  start: string // HH:mm
  end: string   // HH:mm
  type: 'standard' | 'collective'
  label: string
  durationMinutes: number
  // Pour les slots collectifs, on peut ajouter des infos sup si besoin
  collectiveId?: number 
}

/**
 * Génère la liste des créneaux (Standards + Collectifs) pour une journée donnée.
 * Gère les conflits : Un créneau collectif "mange" les créneaux standards qui le chevauchent.
 */
export function generateSmartSlots(
  openingHour: number, 
  closingHour: number, 
  selectedDate: Date,
  collectiveSlots: CollectiveSlot[]
): GeneratedSlot[] {
  const result: GeneratedSlot[] = []
  
  // 1. Récupérer les créneaux collectifs du jour
  const currentDayOfWeek = dayjs(selectedDate).day() // 0=Dimanche
  const todaysCollectiveSlots = collectiveSlots.filter(cs => cs.day_of_week === currentDayOfWeek)

  // Helper pour convertir "HH:mm" ou "HH:mm:ss" en minutes depuis minuit
  const toMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number)
    return h * 60 + m
  }

  // Helper pour formater minutes en "HH:mm"
  const toTimeStr = (totalMinutes: number) => {
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  }

  // 2. Générer les créneaux standards théoriques
  // Durée 90min (1h30) + Pause 30min = Cycle 120min
  const standardSlots: GeneratedSlot[] = []
  let currentMinutes = openingHour * 60
  const endMinutes = closingHour * 60

  while (currentMinutes + 90 <= endMinutes) {
    const startM = currentMinutes
    const endM = currentMinutes + 90
    
    const startStr = toTimeStr(startM)
    const endStr = toTimeStr(endM)

    // Vérification de conflit avec les créneaux collectifs
    const isOverlapping = todaysCollectiveSlots.some(cs => {
      const csStartM = toMinutes(cs.start_time)
      const csEndM = toMinutes(cs.end_time)
      
      // Chevauchement : (StartA < EndB) et (EndA > StartB)
      return startM < csEndM && endM > csStartM
    })

    if (!isOverlapping) {
      standardSlots.push({
        id: `std-${startStr}`,
        start: startStr,
        end: endStr,
        type: 'standard',
        label: `${startStr} - ${endStr}`,
        durationMinutes: 90
      })
    }

    currentMinutes += 120 // 1h30 + 30min pause
  }

  // 3. Ajouter les créneaux collectifs
  const collectiveGenerated: GeneratedSlot[] = todaysCollectiveSlots.map(cs => {
    // On enlève les secondes si présentes
    const startStr = cs.start_time.slice(0, 5) 
    const endStr = cs.end_time.slice(0, 5)
    
    // Calcul de la durée en minutes
    const startM = toMinutes(startStr)
    const endM = toMinutes(endStr)
    const duration = endM - startM

    return {
      id: `col-${cs.id}`,
      start: startStr,
      end: endStr,
      type: 'collective',
      label: `${startStr} - ${endStr}`,
      durationMinutes: duration,
      collectiveId: cs.id
    }
  })

  // 4. Fusionner et trier par heure de début
  const finalSlots = [...standardSlots, ...collectiveGenerated].sort((a, b) => {
    return toMinutes(a.start) - toMinutes(b.start)
  })

  return finalSlots
}


/**
 * @deprecated Utiliser generateSmartSlots à la place
 */
export function generateTimeSlots(openingHour: number, closingHour: number): string[] {
  const slots: string[] = []
  if (openingHour >= closingHour) return []
  if (openingHour < 0 || closingHour > 24) return []

  let currentMinutes = openingHour * 60
  const endMinutes = closingHour * 60

  while (currentMinutes + 90 <= endMinutes) {
    const h = Math.floor(currentMinutes / 60)
    const m = currentMinutes % 60
    const formattedTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
    slots.push(formattedTime)
    currentMinutes += 120
  }
  return slots
}

export function getSlotLabel(startTime: string): string {
  const [h, m] = startTime.split(':').map(Number)
  const startMinutes = h * 60 + m
  const endMinutes = startMinutes + 90
  
  const endH = Math.floor(endMinutes / 60)
  const endM = endMinutes % 60
  
  const format = (hours: number, minutes: number) => 
    `${hours}h${minutes.toString().padStart(2, '0')}`

  return `${format(h, m)} - ${format(endH, endM)}`
}

export function formatDate(date: Date | string): string {
  return dayjs(date).format('dddd D MMMM')
}

export function formatDateForIso(date: Date | string): string {
    return dayjs(date).format('YYYY-MM-DD')
}

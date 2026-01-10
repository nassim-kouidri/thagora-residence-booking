
import dayjs from 'dayjs'
import 'dayjs/locale/fr'

dayjs.locale('fr')

/**
 * Génère la liste des créneaux horaires disponibles entre l'heure d'ouverture et de fermeture.
 * Chaque créneau dure 1h30 (90 minutes).
 * 
 * @param openingHour Heure d'ouverture (ex: 8 pour 08:00)
 * @param closingHour Heure de fermeture (ex: 22 pour 22:00)
 * @returns Tableau d'heures de début formatées (ex: ["08:00", "09:30", ...])
 */
export function generateTimeSlots(openingHour: number, closingHour: number): string[] {
  const slots: string[] = []
  
  if (openingHour >= closingHour) return []
  if (openingHour < 0 || closingHour > 24) return []

  let currentMinutes = openingHour * 60
  const endMinutes = closingHour * 60

  // On ajoute des créneaux tant que le créneau entier (90min) rentre avant la fermeture
  while (currentMinutes + 90 <= endMinutes) {
    const h = Math.floor(currentMinutes / 60)
    const m = currentMinutes % 60
    
    // Formatage "HH:mm"
    const formattedTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
    slots.push(formattedTime)
    
    currentMinutes += 90
  }

  return slots
}

/**
 * Génère le libellé d'affichage pour un créneau de 1h30.
 * @param startTime Heure de début "HH:mm"
 * @returns Libellé (ex: "09h30 - 11h00")
 */
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

/**
 * Formate une date pour l'affichage (ex: "Lundi 1 Janvier")
 */
export function formatDate(date: Date | string): string {
  return dayjs(date).format('dddd D MMMM')
}

/**
 * Formate une date pour l'API / Base de données (YYYY-MM-DD)
 */
export function formatDateForIso(date: Date | string): string {
    return dayjs(date).format('YYYY-MM-DD')
}

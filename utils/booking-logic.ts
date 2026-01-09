
import dayjs from 'dayjs'
import 'dayjs/locale/fr'

dayjs.locale('fr')

/**
 * Génère la liste des créneaux horaires disponibles entre l'heure d'ouverture et de fermeture.
 * Chaque créneau dure 1 heure fixe.
 * 
 * @param openingHour Heure d'ouverture (ex: 8 pour 08:00)
 * @param closingHour Heure de fermeture (ex: 22 pour 22:00)
 * @returns Tableau d'heures formatées (ex: ["08:00", "09:00", ...])
 */
export function generateTimeSlots(openingHour: number, closingHour: number): string[] {
  const slots: string[] = []
  
  // Sécurité basique
  if (openingHour >= closingHour) return []
  if (openingHour < 0 || closingHour > 24) return []

  for (let hour = openingHour; hour < closingHour; hour++) {
    // Formatage "HH:00"
    const formattedHour = hour.toString().padStart(2, '0') + ':00'
    slots.push(formattedHour)
  }

  return slots
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

'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import isBetween from 'dayjs/plugin/isBetween'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(isBetween)
dayjs.locale('fr')

const TIMEZONE = 'Africa/Algiers'

export type TenantHistory = {
  id: string
  fullName: string
  apartment: string
  totalReservations: number
  upcomingReservations: any[]
  pastReservations: any[]
}

export type GlobalStats = {
  mostPopularSpace: { name: string; percentage: number }
  activeDays: { day: string; count: number }[]
  totalReservations: number
}

export async function getStatistics(): Promise<{
  tenants: TenantHistory[]
  globalStats: GlobalStats
  error?: string
}> {
  const supabase = createAdminClient()

  // 1. Fetch Users (Profiles)
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'client')
    // We include inactive users for history purposes? Yes.
  
  if (profilesError) return { tenants: [], globalStats: null as any, error: 'Erreur chargement profils' }

  // 2. Fetch Spaces
  const { data: spaces, error: spacesError } = await supabase
    .from('spaces')
    .select('id, name')
  
  if (spacesError) return { tenants: [], globalStats: null as any, error: 'Erreur chargement espaces' }

  const spaceMap = new Map(spaces.map(s => [s.id, s.name]))

  // 3. Fetch All Reservations
  const { data: reservations, error: resError } = await supabase
    .from('reservations')
    .select('*')
    .order('start_time', { ascending: false })

  if (resError) return { tenants: [], globalStats: null as any, error: 'Erreur chargement réservations' }

  // 4. Fetch App Settings for occupancy calculation
  const { data: settings } = await supabase
    .from('app_settings')
    .select('*')
    .single()
  
  const openingHour = Number(settings?.opening_hour) || 8
  const closingHour = Number(settings?.closing_hour) || 22
  const dailyHours = closingHour - openingHour

  // --- Process Tenant History ---
  const now = dayjs().tz(TIMEZONE)
  const tenantMap = new Map<string, TenantHistory>()

  // Initialize all tenants
  profiles.forEach(p => {
    tenantMap.set(p.id, {
      id: p.id,
      fullName: `${p.last_name} ${p.first_name || ''}`.trim(),
      apartment: p.apartment_number || 'N/A',
      totalReservations: 0,
      upcomingReservations: [],
      pastReservations: []
    })
  })

  // Distribute reservations
  reservations.forEach(res => {
    const tenant = tenantMap.get(res.user_id)
    if (tenant) {
      tenant.totalReservations++
      const start = dayjs(res.start_time).tz(TIMEZONE)
      const formattedRes = {
        id: res.id,
        spaceName: spaceMap.get(res.space_id) || 'Inconnu',
        date: start.format('DD MMMM YYYY'),
        time: start.format('HH:mm'),
        fullDate: start.toDate(),
      }

      if (start.isAfter(now)) {
        tenant.upcomingReservations.push(formattedRes)
      } else {
        tenant.pastReservations.push(formattedRes)
      }
    }
  })

  // Sort upcoming by date ascending (nearest first)
  // Sort past by date descending (most recent first) - already sorted by query usually but good to ensure
  tenantMap.forEach(t => {
    t.upcomingReservations.sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime())
    t.pastReservations.sort((a, b) => b.fullDate.getTime() - a.fullDate.getTime())
  })

  // --- Process Global Stats ---
  
  // A. Space Comparison
  const spaceCounts = new Map<number, number>()
  reservations.forEach(r => {
    spaceCounts.set(r.space_id, (spaceCounts.get(r.space_id) || 0) + 1)
  })
  
  let mostPopularSpaceName = 'Aucun'
  let mostPopularCount = 0
  let totalResCount = reservations.length

  spaceCounts.forEach((count, id) => {
    if (count > mostPopularCount) {
      mostPopularCount = count
      mostPopularSpaceName = spaceMap.get(id) || ''
    }
  })
  const popSpacePercentage = totalResCount > 0 ? Math.round((mostPopularCount / totalResCount) * 100) : 0



  // D. Active Days
  const daysMap = { 0: 'Dimanche', 1: 'Lundi', 2: 'Mardi', 3: 'Mercredi', 4: 'Jeudi', 5: 'Vendredi', 6: 'Samedi' }
  const dayCounts = new Map<number, number>()
  reservations.forEach(r => {
    const d = dayjs(r.start_time).tz(TIMEZONE).day()
    dayCounts.set(d, (dayCounts.get(d) || 0) + 1)
  })

  const activeDays = Object.entries(daysMap).map(([key, name]) => ({
    day: name,
    count: dayCounts.get(parseInt(key)) || 0
  })).sort((a, b) => b.count - a.count) // Sort by popularity


  return {
    tenants: Array.from(tenantMap.values()),
    globalStats: {
      mostPopularSpace: { name: mostPopularSpaceName, percentage: popSpacePercentage },
      activeDays,
      totalReservations: totalResCount
    }
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isAuthorized(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')

  if (!process.env.KEEPALIVE_TOKEN) {
    // Fail closed: require an explicit token in env.
    throw new Error('KEEPALIVE_TOKEN is not set')
  }

  return token === process.env.KEEPALIVE_TOKEN
}

export async function GET(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const startedAt = Date.now()

    // Several lightweight reads to generate activity without unnecessary load.
    const [spaces, profiles, reservations] = await Promise.all([
      supabase.from('spaces').select('id', { count: 'exact', head: true }).limit(1),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).limit(1),
      supabase.from('reservations').select('id', { count: 'exact', head: true }).limit(1),
    ])

    const errors = [spaces.error, profiles.error, reservations.error].filter(Boolean)

    return NextResponse.json(
      {
        ok: errors.length === 0,
        kind: 'morning',
        ms: Date.now() - startedAt,
        errors: errors.map((e) => e?.message),
        counts: {
          spaces: spaces.count ?? null,
          profiles: profiles.count ?? null,
          reservations: reservations.count ?? null,
        },
      },
      {
        status: errors.length === 0 ? 200 : 500,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    )
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  }
}

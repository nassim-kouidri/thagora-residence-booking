import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/session'
import { createAdminClient } from '@/utils/supabase/admin'

export async function middleware(request: NextRequest) {
  // 1. Initialize Supabase Client (handles cookies)
  const { supabase, response } = updateSession(request)

  // 2. Check Auth Status
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Public/Static paths handled by matcher, but explicit check for safety
  if (path.startsWith('/_next') || path.startsWith('/static')) {
    return response
  }
  
  const isAuthRoute = path === '/login'
  const isRoot = path === '/'
  const isClientRoute = path.startsWith('/client')
  const isAdminRoute = path.startsWith('/admin')

  // --- CASE 1: User NOT Logged In ---
  if (!user) {
    // If trying to access protected areas or root, redirect to Login
    if (isClientRoute || isAdminRoute || isRoot) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    // Otherwise (e.g. accessing /login), allow
    return response
  }

  // --- CASE 2: User Logged In ---
  if (user) {
    // Fetch Role to determine destination
    // FIX: Use Admin Client (Service Role) to bypass RLS policies and avoid "infinite recursion" error
    const supabaseAdmin = createAdminClient()
    
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (error) {
      console.error('Middleware: Error fetching profile for user', user.id, error)
    }

    // Default to 'client' only if strictly necessary, but log it.
    const role = profile?.role || 'client'

    const clientDashboard = '/client/dashboard'
    const adminDashboard = '/admin/dashboard'
    const targetDashboard = role === 'admin' ? adminDashboard : clientDashboard

    // A. User is on Login page or Root -> Redirect to their Dashboard
    if (isAuthRoute || isRoot) {
      const url = request.nextUrl.clone()
      url.pathname = targetDashboard
      return NextResponse.redirect(url)
    }

    // B. Role Enforcement
    // Admin trying to access Client pages
    if (isAdminRoute && role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = clientDashboard
      return NextResponse.redirect(url)
    }

    // Client trying to access Admin pages
    if (isClientRoute && role !== 'client') {
      console.log(`Middleware: Redirecting Client from ${path} to ${adminDashboard}`)
      const url = request.nextUrl.clone()
      url.pathname = adminDashboard
      return NextResponse.redirect(url)
    }
  }

  // If none of the above redirects triggered, return the original response (with cookies)
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

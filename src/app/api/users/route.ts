import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

async function authenticateRequest(request: Request) {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

  if (token && token.trim() !== '' && token !== 'undefined' && token !== 'null') {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const client = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false }
    }) as any
    const { data: userData, error } = await client.auth.getUser(token)
    return { user: userData?.user || null, error }
  }

  // Fallback to cookie-based session
  const serverSupabase = await createServerClient()
  const { data: userData, error } = await serverSupabase.auth.getUser()
  return { user: userData?.user || null, error }
}

export async function GET(request: Request) {
  try {
    const { user, error: authError } = await authenticateRequest(request)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')

    const serverSupabase = await createServerClient()
    let query = serverSupabase.from('profiles').select('id, full_name, role, email')

    if (role) {
      const lower = role.toLowerCase()
      const upper = role.toUpperCase()
      query = query.or(`role.eq.${lower},role.eq.${upper}`)
    }

    const { data, error } = await query.order('full_name')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ users: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await authenticateRequest(request)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serverSupabase = await createServerClient()
    // Load caller's profile to verify they are an Admin
    const { data: profile } = await serverSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const callerRole = (profile?.role || '').toLowerCase()
    if (callerRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, password, role } = body

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Name, email, password, and role are required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseServiceKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not defined in the environment.')
      return NextResponse.json({ 
        error: 'SUPABASE_SERVICE_ROLE_KEY is not defined in the environment. Please add it to your .env.local file to enable user creation.' 
      }, { status: 500 })
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey) as any

    // 1. Create the user in Supabase Auth
    const { data: authData, error: authError2 } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, role }
    })

    if (authError2) {
      console.error('Supabase Auth createUser error:', authError2)
      return NextResponse.json({ error: authError2.message }, { status: 500 })
    }

    const newUserId = authData.user?.id
    if (!newUserId) {
      console.error('Failed to retrieve new user ID')
      return NextResponse.json({ error: 'Could not fetch created user ID' }, { status: 500 })
    }

    // 2. Insert the corresponding profile in public.profiles table
    const { data: profileData, error: profileError } = await serviceClient
      .from('profiles')
      .upsert({
        id: newUserId,
        full_name: name,
        role: role as any,
        email,
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (profileError) {
      console.error('Profile creation failed for user id:', newUserId, profileError)
      return NextResponse.json({ error: 'Auth user created, but profile insertion failed: ' + profileError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, user: profileData })
  } catch (err: any) {
    console.error('POST /api/users exception:', err)
    return NextResponse.json({ error: err.message || err.toString() }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export async function POST(request: Request) {
  try {
    // 1. Verify caller has admin permission
    const serverSupabase = await createServerClient()
    const { data: { user }, error: userError } = await serverSupabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get requester's profile role
    const { data: callerProfile, error: profileErr } = await serverSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileErr || !callerProfile || callerProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // 2. Parse body
    const body = await request.json()
    const { userId, role, is_active } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Safety: Prevent modifying own profile to avoid self-lockout
    if (userId === user.id) {
      return NextResponse.json({ error: 'You cannot change your own role or active status' }, { status: 400 })
    }

    // 3. Create service role client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const serviceClient = createSupabaseClient<Database>(supabaseUrl, serviceRoleKey) as any

    // Build update object
    const updateData: any = {}
    if (role !== undefined) updateData.role = role
    if (is_active !== undefined) updateData.is_active = is_active

    // Update profiles table
    const { data: updatedProfile, error: updateErr } = await serviceClient
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // Update auth user ban duration using admin auth API if service role is valid
    if (is_active !== undefined && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        await serviceClient.auth.admin.updateUserById(userId, {
          ban_duration: is_active ? 'none' : '876600h', // 100 year ban for deactivation
        })
      } catch (authErr) {
        console.error('Auth deactivation failed:', authErr)
      }
    }

    return NextResponse.json({ success: true, profile: updatedProfile })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

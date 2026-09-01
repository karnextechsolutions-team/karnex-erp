import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Minimal RBAC
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || !['admin', 'ADMIN', 'HR', 'hr'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { date, records } = await req.json()
    if (!date || !records || !Array.isArray(records)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // Upsert attendance records for the given date
    // Upsert expects primary key or unique constraint. We have a UNIQUE(employee_id, date) constraint.
    const upsertData = records.map((r: any) => ({
      employee_id: r.employee_id,
      date: date,
      status: r.status,
      check_in_time: r.check_in_time || null,
      check_out_time: r.check_out_time || null
    }))

    const { error } = await supabase.from('attendance').upsert(upsertData, { onConflict: 'employee_id, date' })
    
    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

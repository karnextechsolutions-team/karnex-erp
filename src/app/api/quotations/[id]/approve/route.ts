import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = (profile?.role || '').toLowerCase()
    
    // Allow admin, manager, or md roles
    if (!['admin', 'manager', 'md'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden: Requires MD or Admin approval rights' }, { status: 403 })
    }

    const body = await request.json()
    const { md_approval_status } = body

    if (!md_approval_status || !['Approved', 'Rejected'].includes(md_approval_status)) {
      return NextResponse.json({ error: 'Invalid approval status' }, { status: 400 })
    }

    const { id } = await context.params

    const { data, error } = await supabase
      .from('quotations')
      .update({ md_approval_status })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, quotation: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

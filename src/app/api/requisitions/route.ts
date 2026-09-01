import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const role = searchParams.get('role')

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let query = supabaseAdmin
      .from('material_requisitions')
      .select('*, profiles(first_name, last_name, role), mrn_items(*, raw_materials(name, unit, quantity_in_stock))')
      .order('requested_date', { ascending: false })

    if (role === 'admin' || role === 'manager' || role === 'procurement') {
      // Store admins see everything
    } else if (userId) {
      // Normal staff only see their own requests
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ requisitions: data || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { user_id, department, items } = body // items: { item_id, requested_qty }[]

    if (!user_id || !department || !items || !items.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Generate MRN Number
    const mrnNumber = `MRN-${Date.now().toString().slice(-6)}`

    // Create header
    const { data: mrn, error: mrnError } = await supabaseAdmin
      .from('material_requisitions')
      .insert({
        mrn_number: mrnNumber,
        user_id,
        department,
        status: 'Pending'
      })
      .select()
      .single()

    if (mrnError) throw mrnError

    // Create line items
    const mrnItems = items.map((item: any) => ({
      mrn_id: mrn.id,
      item_id: item.item_id,
      requested_qty: Number(item.requested_qty)
    }))

    const { error: itemsError } = await supabaseAdmin
      .from('mrn_items')
      .insert(mrnItems)

    if (itemsError) throw itemsError

    return NextResponse.json({ success: true, mrn })
  } catch (error: any) {
    console.error('MRN Creation Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { item_id, supplier_id, received_qty, unit_cost, remarks } = body

    if (!item_id || !received_qty || !unit_cost) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabaseAdmin.rpc('receive_consumable', {
      p_item_id: item_id,
      p_supplier_id: supplier_id || null,
      p_received_qty: Number(received_qty),
      p_unit_cost: Number(unit_cost),
      p_remarks: remarks || null
    })

    if (error) throw error

    return NextResponse.json({ success: true, data })

  } catch (error: any) {
    console.error('Receive Consumable Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

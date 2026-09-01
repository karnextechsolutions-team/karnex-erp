import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: Request) {
  try {
    const { order_id } = await request.json()

    if (!order_id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    // Use Service Role to securely bypass RLS and perform transactional DB updates
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Call the RPC function securely
    const { error } = await supabaseAdmin.rpc('complete_production_order', {
      p_order_id: order_id
    })

    if (error) {
      console.error('Production Completion Error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Production order completed successfully' })

  } catch (error: any) {
    console.error('Server error during production completion:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

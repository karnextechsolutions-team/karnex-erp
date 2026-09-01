import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { so_id, qa_params } = await request.json()

    if (!so_id || !qa_params) {
      return NextResponse.json({ error: 'Missing so_id or qa_params' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Call the RPC function securely using the Service Role Key
    const { error } = await supabaseAdmin.rpc('process_outbound_dispatch', {
      p_so_id: so_id,
      p_qa_params: qa_params
    })

    if (error) {
      console.error('Dispatch Completion Error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Dispatch completed successfully' })

  } catch (error: any) {
    console.error('Server error during dispatch completion:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

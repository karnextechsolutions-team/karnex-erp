import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { id } = params;
    
    const body = await request.json()
    const { status } = body

    if (!['Approved', 'Rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Must be Approved or Rejected.' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    if (status === 'Rejected') {
      const { error } = await supabaseAdmin.from('payments').update({ status: 'Rejected' }).eq('id', id)
      if (error) throw error
      return NextResponse.json({ success: true, message: 'Payment rejected' })
    }

    // Call the RPC for atomic approval and status updates
    const { error: rpcError } = await supabaseAdmin.rpc('approve_payment', { p_payment_id: id })

    if (rpcError) {
      console.error('Payment Approval RPC Error:', rpcError)
      return NextResponse.json({ error: rpcError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Payment approved successfully' })

  } catch (error: any) {
    console.error('Payment Approval Route Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

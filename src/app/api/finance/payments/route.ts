import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabaseAdmin
      .from('payments')
      .select('*, invoices(invoice_number), purchase_orders(po_number)')
      .eq('status', 'Pending Approval')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ payments: data || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, invoice_id, po_id, amount, payment_method, transaction_reference } = body

    if (!type || !amount || !payment_method) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (type === 'Inbound' && !invoice_id) {
      return NextResponse.json({ error: 'Inbound payments require an invoice_id' }, { status: 400 })
    }

    if (type === 'Outbound' && !po_id) {
      return NextResponse.json({ error: 'Outbound payments require a po_id' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabaseAdmin.from('payments').insert({
      type,
      invoice_id: type === 'Inbound' ? invoice_id : null,
      po_id: type === 'Outbound' ? po_id : null,
      amount,
      payment_method,
      transaction_reference,
      status: 'Pending Approval' // Maker role -> goes to pending
    }).select().single()

    if (error) throw error

    return NextResponse.json({ success: true, payment: data })

  } catch (error: any) {
    console.error('Payment Creation Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

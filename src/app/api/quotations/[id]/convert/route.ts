import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { id } = params;
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Fetch the quotation and items
    const { data: quote, error: quoteError } = await supabaseAdmin
      .from('quotations')
      .select('*, quotation_items(*)')
      .eq('id', id)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }

    if (quote.md_approval_status !== 'Approved') {
      return NextResponse.json({ error: 'Quotation must be MD Approved to convert' }, { status: 400 })
    }

    if (quote.status === 'Converted to SO') {
      return NextResponse.json({ error: 'Already converted' }, { status: 400 })
    }

    // 2. Generate SO Number
    const soNumber = 'SO-' + Date.now().toString().slice(-6)

    // 3. Create Sales Order
    const { data: so, error: soError } = await supabaseAdmin
      .from('sales_orders')
      .insert({
        quotation_id: quote.id,
        so_number: soNumber,
        customer_id: quote.customer_id,
        created_by: quote.created_by,
        order_date: new Date().toISOString(),
        status: 'Pending QA', // Fast track direct to QA stage
        approval_status: 'approved',
        currency: 'LKR',
        exchange_rate: 1,
        subtotal: quote.total_amount,
        discount: 0,
        total_amount: quote.total_amount,
      })
      .select()
      .single()

    if (soError) {
      return NextResponse.json({ error: 'Failed to create Sales Order: ' + soError.message }, { status: 500 })
    }

    // 4. Create SO Items
    // Automatically map quotation lines to sales order lines
    const soItems = quote.quotation_items.map((qi: any) => ({
      so_id: so.id,
      product_id: qi.item_id,
      quantity: qi.quantity,
      unit_price: qi.unit_price,
      total_price: qi.total_price
    }))

    if (soItems.length > 0) {
      const { error: itemsError } = await supabaseAdmin.from('so_items').insert(soItems)
      if (itemsError) {
        return NextResponse.json({ error: 'Failed to copy line items to SO: ' + itemsError.message }, { status: 500 })
      }
    }

    // 5. Update Quotation Status
    await supabaseAdmin
      .from('quotations')
      .update({ status: 'Converted to SO' })
      .eq('id', quote.id)

    return NextResponse.json({ success: true, so_id: so.id, so_number: so.so_number })
  } catch (error: any) {
    console.error('SO Conversion Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

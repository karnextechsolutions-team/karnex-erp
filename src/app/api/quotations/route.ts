import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      customer_id, 
      valid_until, 
      total_amount, 
      items, 
      category_type, 
      dispatch_no, 
      place_of_supply, 
      courier_charge, 
      tc_charge, 
      mode_of_payment 
    } = body

    if (!customer_id || !valid_until || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields or items' }, { status: 400 })
    }

    // Validate structure of items
    for (const item of items) {
      if (!item.item_id || item.quantity <= 0 || item.unit_price < 0) {
        return NextResponse.json({ error: 'Invalid item_id, quantity, or unit_price in items' }, { status: 400 })
      }
    }

    // Execute Postgres transaction RPC
    const { data, error } = await supabase.rpc('create_quotation_with_items', {
      p_customer_id: customer_id,
      p_created_by: user.id,
      p_valid_until: valid_until,
      p_total_amount: Number(total_amount),
      p_category_type: category_type || 'Conventional',
      p_dispatch_no: dispatch_no || null,
      p_place_of_supply: place_of_supply || null,
      p_courier_charge: Number(courier_charge || 0),
      p_tc_charge: Number(tc_charge || 0),
      p_mode_of_payment: mode_of_payment || null,
      p_items: items.map(item => ({
        item_id: item.item_id,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        total_price: Number(item.quantity) * Number(item.unit_price),
        reference_po: item.reference_po || null,
        cut_size: item.cut_size || null
      }))
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || !data.success) {
      return NextResponse.json({ error: data?.error || 'Failed to create quotation' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      quotation_id: data.quotation_id,
      quotation_number: data.quotation_number
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('quotations')
      .select('*, customers(name, type, country, currency)')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

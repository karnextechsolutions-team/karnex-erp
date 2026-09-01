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
      name,
      type,
      contact_person,
      phone,
      email,
      address,
      country,
      currency,
      credit_limit,
      payment_terms,
      sales_rep_id
    } = body

    if (!name) {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('customers')
      .insert({
        name,
        type: type || 'local',
        contact_person: contact_person || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        country: country || 'Sri Lanka',
        currency: currency || 'LKR',
        credit_limit: Number(credit_limit) || 0,
        payment_terms: payment_terms || 'Net 30',
        sales_rep_id: sales_rep_id || null,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, customer: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

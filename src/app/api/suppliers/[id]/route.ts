import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Fetch Supplier Profile
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single()

    if (supplierError || !supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    // 2. Fetch Purchase Orders for this supplier
    const { data: orders, error: ordersError } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('supplier_id', id)
      .order('created_at', { ascending: false })

    if (ordersError) {
      console.error('Error fetching POs:', ordersError)
    }

    const safeOrders = orders || []

    // Calculate metrics
    const totalOrdered = safeOrders.reduce((sum, po) => sum + (Number(po.total_amount) || 0), 0)

    // Placeholder logic for Payments and Outstanding 
    // (To be properly linked to a payables/invoices system in the future)
    const totalPaid = safeOrders
      .filter(po => po.status === 'received')
      .reduce((sum, po) => sum + (Number(po.total_amount) || 0), 0)
    
    const outstandingBalance = totalOrdered - totalPaid

    return NextResponse.json({
      ...supplier,
      metrics: {
        totalOrdered,
        totalPaid,
        outstandingBalance
      },
      orders: safeOrders,
      // Mocking payments for now until Payables module is fully fleshed out
      payments: [] 
    })
  } catch (err: any) {
    console.error('Error in GET /api/suppliers/[id]:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Fetch AR (Invoices) with eager payments
    const { data: invoices, error: invError } = await supabaseAdmin
      .from('invoices')
      .select('*, sales_orders(customers(id, name)), payments(*)')
      .neq('payment_status', 'Paid')
      
    if (invError) throw invError;

    // 2. Fetch AP (Purchase Orders) with eager payments
    const { data: pos, error: poError } = await supabaseAdmin
      .from('purchase_orders')
      .select('*, suppliers(id, name), payments(*)')
      .neq('payment_status', 'Paid')
      .eq('status', 'received')

    if (poError) throw poError;

    // Calculate Aging Buckets for AR
    const arMap = new Map<string, any>()
    const now = new Date().getTime()

    invoices.forEach((inv: any) => {
      const customer = inv.sales_orders?.customers
      if (!customer) return;
      
      const diffTime = now - new Date(inv.created_at).getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
      
      const approvedPayments = (inv.payments || []).filter((p: any) => p.status === 'Approved').reduce((sum: number, p: any) => sum + Number(p.amount), 0)
      const outstanding = Number(inv.total_amount) - approvedPayments
      if (outstanding <= 0) return;

      if (!arMap.has(customer.id)) {
        arMap.set(customer.id, {
          customerId: customer.id,
          customerName: customer.name,
          totalOutstanding: 0,
          bucket0_20: 0,
          bucket21_29: 0,
          bucket30Plus: 0,
          invoices: []
        })
      }

      const rec = arMap.get(customer.id)
      rec.totalOutstanding += outstanding
      if (diffDays <= 20) rec.bucket0_20 += outstanding
      else if (diffDays <= 29) rec.bucket21_29 += outstanding
      else rec.bucket30Plus += outstanding

      rec.invoices.push({ ...inv, outstanding })
    })

    // Calculate Aging Buckets for AP
    const apMap = new Map<string, any>()

    pos.forEach((po: any) => {
      const supplier = po.suppliers
      if (!supplier) return;
      
      const diffTime = now - new Date(po.order_date).getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
      
      const approvedPayments = (po.payments || []).filter((p: any) => p.status === 'Approved').reduce((sum: number, p: any) => sum + Number(p.amount), 0)
      const outstanding = Number(po.total_amount) - approvedPayments
      if (outstanding <= 0) return;

      if (!apMap.has(supplier.id)) {
        apMap.set(supplier.id, {
          supplierId: supplier.id,
          supplierName: supplier.name,
          totalOutstanding: 0,
          bucket0_20: 0,
          bucket21_29: 0,
          bucket30Plus: 0,
          pos: []
        })
      }

      const rec = apMap.get(supplier.id)
      rec.totalOutstanding += outstanding
      if (diffDays <= 20) rec.bucket0_20 += outstanding
      else if (diffDays <= 29) rec.bucket21_29 += outstanding
      else rec.bucket30Plus += outstanding

      rec.pos.push({ ...po, outstanding })
    })

    return NextResponse.json({ 
      ar: Array.from(arMap.values()), 
      ap: Array.from(apMap.values()) 
    })
  } catch (error: any) {
    console.error('Aging Calculation Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      po_id,
      supplier_id, 
      received_date, 
      vehicle_number, 
      items, 
      qa_checks 
    } = body

    if (!supplier_id || !received_date || !items || !qa_checks || items.length === 0) {
      return NextResponse.json({ error: 'Missing required GRN data' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Generate unique GRN number
    const grn_number = `GRN-${Date.now().toString().slice(-6)}`

    // Call the RPC to process everything in a single database transaction
    const { data: grn_id, error } = await supabase.rpc('process_grn_with_qa', {
      p_grn_number: grn_number,
      p_po_id: po_id || null,
      p_supplier_id: supplier_id,
      p_received_date: received_date,
      p_vehicle_number: vehicle_number || null,
      p_items: items,
      p_qa_checks: qa_checks
    })

    if (error) {
      console.error('RPC Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Determine final status based on QA checks logic applied in DB
    // All boolean checks must be true for QA Passed
    const qaPassed = 
      qa_checks.supplier_approved &&
      qa_checks.vehicle_condition_ok &&
      qa_checks.packaging_ok &&
      qa_checks.label_verified &&
      qa_checks.visual_quality_ok &&
      qa_checks.pest_free &&
      qa_checks.moisture_ok &&
      qa_checks.no_chemical_contamination &&
      qa_checks.docs_verified &&
      qa_checks.sampling_tested

    return NextResponse.json({ 
      success: true, 
      grn_id, 
      grn_number,
      status: qaPassed ? 'QA Passed' : 'QA Failed'
    }, { status: 201 })
    
  } catch (err: any) {
    console.error('Error in POST /api/grn:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { id } = params; // mrn_id
    
    const body = await request.json()
    const { items, action } = body // items: { item_id, issued_qty }[], action: 'Issue' | 'Reject'

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    if (action === 'Reject') {
      const { error } = await supabaseAdmin
        .from('material_requisitions')
        .update({ status: 'Rejected' })
        .eq('id', id)
        
      if (error) throw error
      return NextResponse.json({ success: true, message: 'Requisition rejected' })
    }

    if (!items || !items.length) {
      return NextResponse.json({ error: 'Missing items to issue' }, { status: 400 })
    }

    // Call the RPC for atomic issue and deduction
    const { error: rpcError } = await supabaseAdmin.rpc('issue_mrn_items', { 
      p_mrn_id: id,
      p_issued_items: items 
    })

    if (rpcError) {
      console.error('MRN Issue RPC Error:', rpcError)
      return NextResponse.json({ error: rpcError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Items issued successfully' })

  } catch (error: any) {
    console.error('MRN Issue Route Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2, XCircle, Printer, Download, Truck, Package, Clock, DollarSign } from 'lucide-react'
import ApprovalBadge from '@/components/ui/ApprovalBadge'
import { createNotification } from '@/lib/notifications'
import type { PurchaseOrder, Supplier, POItem, RawMaterial, Profile } from '@/types/database'

type PODetail = PurchaseOrder & { suppliers: Supplier | null }
type POItemDetail = POItem & { raw_materials: RawMaterial | null }

export default function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  
  const [po, setPo] = useState<PODetail | null>(null)
  const [items, setItems] = useState<POItemDetail[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    const supabase = createClient()
    
    // Fetch PO
    const { data: poData, error: poError } = await supabase
      .from('purchase_orders')
      .select('*, suppliers(*)')
      .eq('id', id)
      .single()
      
    if (poError) {
      toast.error('Failed to load PO: ' + poError.message)
      router.push('/procurement')
      return
    }
    
    setPo(poData)
    
    // Fetch Items
    const { data: itemsData, error: itemsError } = await supabase
      .from('po_items')
      .select('*, raw_materials(*)')
      .eq('po_id', id)
      
    if (itemsError) {
      toast.error('Failed to load PO items: ' + itemsError.message)
    } else {
      setItems(itemsData ?? [])
    }
    
    // Fetch Profile
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (profileData) setProfile(profileData)
    }
    
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [id])

  const canApprove = profile?.role === 'admin' || profile?.role === 'manager'

  const handleApprove = async () => {
    if (!po || !canApprove) return
    const supabase = createClient()
    const { error } = await supabase
      .from('purchase_orders')
      .update({ approval_status: 'approved' })
      .eq('id', po.id)

    if (error) {
      toast.error('Failed to approve PO: ' + error.message)
    } else {
      toast.success(`PO ${po.po_number} approved!`)
      await createNotification(po.created_by, 'PO Approved', `Your Purchase Order ${po.po_number} has been approved.`, 'success')
      fetchData()
    }
  }

  const handleReject = async () => {
    if (!po || !canApprove) return
    const supabase = createClient()
    const { error } = await supabase
      .from('purchase_orders')
      .update({ approval_status: 'rejected' })
      .eq('id', po.id)

    if (error) {
      toast.error('Failed to reject PO: ' + error.message)
    } else {
      toast.success(`PO ${po.po_number} rejected.`)
      await createNotification(po.created_by, 'PO Rejected', `Your Purchase Order ${po.po_number} has been rejected.`, 'error')
      fetchData()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
      </div>
    )
  }

  if (!po) return null

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-slate-100 text-slate-600'
      case 'sent': return 'bg-blue-100 text-blue-700'
      case 'partial': return 'bg-amber-100 text-amber-700'
      case 'received': return 'bg-green-100 text-green-700'
      case 'cancelled': return 'bg-red-100 text-red-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const canReceiveGoods = po.approval_status === 'approved' && ['sent', 'partial'].includes(po.status)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/procurement')}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{po.po_number}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${getStatusStyle(po.status)}`}>
                {po.status}
              </span>
              <ApprovalBadge status={po.approval_status} />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Created on {new Date(po.created_at).toLocaleDateString('en-GB')}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {canApprove && po.approval_status === 'pending' && (
            <>
              <button
                onClick={handleReject}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
              >
                <XCircle className="w-4 h-4" /> Reject
              </button>
              <button
                onClick={handleApprove}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-medium transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" /> Approve
              </button>
            </>
          )}
          
          {canReceiveGoods && (
            <button
              onClick={() => router.push(`/procurement/grn/${po.id}`)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Package className="w-4 h-4" /> Receive Goods
            </button>
          )}
          
          <button className="p-2 border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-600 transition-colors">
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Supplier Info */}
        <div className="md:col-span-2 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Truck className="w-4 h-4 text-gray-400" /> Supplier Details
          </h3>
          {po.suppliers ? (
            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Name</p>
                <p className="text-sm font-medium text-gray-900">{po.suppliers.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Contact</p>
                <p className="text-sm font-medium text-gray-900">{po.suppliers.contact_person || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Email</p>
                <p className="text-sm font-medium text-gray-900">{po.suppliers.email || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Phone</p>
                <p className="text-sm font-medium text-gray-900">{po.suppliers.phone || '—'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Address</p>
                <p className="text-sm font-medium text-gray-900">
                  {po.suppliers.address ? `${po.suppliers.address}, ${po.suppliers.country}` : po.suppliers.country}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Supplier information unavailable.</p>
          )}
        </div>

        {/* Order Summary */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" /> Order Info
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Order Date</span>
                <span className="text-sm font-medium text-gray-900">{new Date(po.order_date).toLocaleDateString('en-GB')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Expected Date</span>
                <span className="text-sm font-medium text-gray-900">{po.expected_date ? new Date(po.expected_date).toLocaleDateString('en-GB') : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Payment Terms</span>
                <span className="text-sm font-medium text-gray-900">{po.suppliers?.payment_terms || '—'}</span>
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-400" /> Payment Summary
            </h3>
            <div className="flex justify-between items-end">
              <span className="text-sm font-semibold text-gray-500">Total Amount</span>
              <span className="text-2xl font-bold text-gray-900">
                {po.currency} {Number(po.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Order Items</h3>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3">Item / Material</th>
              <th className="px-6 py-3">Code</th>
              <th className="px-6 py-3 text-right">Qty Ordered</th>
              <th className="px-6 py-3 text-right">Qty Received</th>
              <th className="px-6 py-3 text-right">Unit Price</th>
              <th className="px-6 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{item.raw_materials?.name || 'Unknown Material'}</td>
                <td className="px-6 py-4 text-gray-500">{item.raw_materials?.code || '—'}</td>
                <td className="px-6 py-4 text-right font-medium">
                  {item.quantity} {item.raw_materials?.unit}
                </td>
                <td className="px-6 py-4 text-right">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    item.received_qty >= item.quantity ? 'bg-green-100 text-green-700' : 
                    item.received_qty > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {item.received_qty} / {item.quantity}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-gray-600">
                  {Number(item.unit_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 text-right font-semibold text-gray-900">
                  {Number(item.total_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {po.notes && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">Notes</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{po.notes}</p>
        </div>
      )}
    </div>
  )
}

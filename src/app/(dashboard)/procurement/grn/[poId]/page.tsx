'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ArrowLeft, PackagePlus, AlertCircle, Save, CheckCircle2 } from 'lucide-react'
import { createNotification } from '@/lib/notifications'
import type { PurchaseOrder, Supplier, POItem, RawMaterial } from '@/types/database'

type POWithSupplier = PurchaseOrder & { suppliers: Supplier | null }
type POItemDetail = POItem & { raw_materials: RawMaterial | null }

export default function GoodsReceiptNotePage({ params }: { params: Promise<{ poId: string }> }) {
  const router = useRouter()
  const { poId } = use(params)

  const [po, setPo] = useState<POWithSupplier | null>(null)
  const [items, setItems] = useState<POItemDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [notes, setNotes] = useState('')

  // Receipt State
  // Map of po_item_id -> { qty: number, batch: string, expiry: string, location: string }
  const [receipts, setReceipts] = useState<Record<string, {
    qty: number,
    batch: string,
    expiry: string,
    location: string
  }>>({})

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const supabase = createClient()

      const { data: poData, error: poError } = await supabase
        .from('purchase_orders')
        .select('*, suppliers(*)')
        .eq('id', poId)
        .single()

      if (poError || !poData) {
        toast.error('Failed to load PO')
        router.push('/procurement')
        return
      }

      setPo(poData)

      const { data: itemsData, error: itemsError } = await supabase
        .from('po_items')
        .select('*, raw_materials(*)')
        .eq('po_id', poId)

      if (itemsError) {
        toast.error('Failed to load items')
      } else {
        setItems(itemsData ?? [])

        // Initialize receipt state
        const initialReceipts: Record<string, any> = {}
        itemsData?.forEach((item: any) => {
          const remaining = item.quantity - item.received_qty
          if (remaining > 0) {
            initialReceipts[item.id] = {
              qty: remaining,
              batch: '',
              expiry: '',
              location: 'Main Warehouse'
            }
          }
        })
        setReceipts(initialReceipts)
      }

      setLoading(false)
    }

    fetchData()
  }, [poId, router])

  const handleReceiptChange = (itemId: string, field: string, value: string | number) => {
    setReceipts(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!po) return

    setSubmitting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      toast.error('User not authenticated')
      setSubmitting(false)
      return
    }

    try {
      // 1. Create GRN Record
      const grnNumber = `GRN-${Date.now().toString().slice(-6)}`
      const { data: grnData, error: grnError } = await supabase
        .from('goods_receipts')
        .insert({
          grn_number: grnNumber,
          po_id: poId,
          received_by: user.id,
          received_date: new Date().toISOString(),
          notes: notes || null
        })
        .select()
        .single()

      if (grnError) throw grnError

      // Process each received item
      let fullyReceived = true

      for (const item of items) {
        const rec = receipts[item.id]
        if (!rec || rec.qty <= 0) {
          if (item.received_qty < item.quantity) fullyReceived = false
          continue
        }

        const newReceivedQty = item.received_qty + Number(rec.qty)
        if (newReceivedQty < item.quantity) fullyReceived = false

        // Update po_item received quantity
        const { error: poItemError } = await supabase
          .from('po_items')
          .update({ received_qty: newReceivedQty })
          .eq('id', item.id)

        if (poItemError) throw poItemError

        // Add to inventory_stock
        const { error: stockError } = await supabase
          .from('inventory_stock')
          .insert({
            material_id: item.material_id,
            batch_number: rec.batch || null,
            quantity: Number(rec.qty),
            expiry_date: rec.expiry || null,
            location: rec.location || null,
            grn_item_id: grnData.id // linking to GRN for audit
          })

        if (stockError) throw stockError

        // Add to stock_movements
        const { error: movementError } = await supabase
          .from('stock_movements')
          .insert({
            movement_type: 'in',
            stock_type: 'raw_material',
            reference_id: grnData.id,
            material_id: item.material_id,
            quantity: Number(rec.qty),
            batch_number: rec.batch || null,
            notes: `Received via PO ${po.po_number}`,
            created_by: user.id
          })

        if (movementError) throw movementError
      }

      // Update PO Status
      const newStatus = fullyReceived ? 'received' : 'partial'
      const { error: poUpdateError } = await supabase
        .from('purchase_orders')
        .update({ status: newStatus })
        .eq('id', poId)

      if (poUpdateError) throw poUpdateError

      // Notify PO Creator
      await createNotification(
        po.created_by,
        'Goods Received',
        `Goods have been received for PO ${po.po_number} (GRN: ${grnNumber}). Status: ${newStatus.toUpperCase()}`,
        'info'
      )

      toast.success('Goods Receipt Note created successfully!')
      router.push(`/procurement/${poId}`)

    } catch (err: any) {
      console.error(err)
      toast.error('Error creating GRN: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
      </div>
    )
  }

  if (!po) return null

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push(`/procurement/${poId}`)}
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Goods Receipt Note (GRN)</h1>
          <p className="text-sm text-gray-500 mt-1">Receive items for PO: {po.po_number}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <PackagePlus className="w-4 h-4" /> Received Items
            </h3>
          </div>

          <div className="p-6 overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="pb-3 pr-4 font-semibold">Material</th>
                  <th className="pb-3 px-4 font-semibold text-right">Ordered</th>
                  <th className="pb-3 px-4 font-semibold text-right">Prev. Received</th>
                  <th className="pb-3 px-4 font-semibold text-right text-green-700">Receive Qty</th>
                  <th className="pb-3 px-4 font-semibold">Batch No.</th>
                  <th className="pb-3 px-4 font-semibold">Expiry Date</th>
                  <th className="pb-3 pl-4 font-semibold">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map(item => {
                  const remaining = item.quantity - item.received_qty
                  const isFullyReceived = remaining <= 0

                  return (
                    <tr key={item.id} className={isFullyReceived ? 'bg-gray-50/50' : ''}>
                      <td className="py-4 pr-4">
                        <div className="font-medium text-gray-900">{item.raw_materials?.name}</div>
                        <div className="text-xs text-gray-500">{item.raw_materials?.code}</div>
                      </td>
                      <td className="py-4 px-4 text-right font-medium">{item.quantity}</td>
                      <td className="py-4 px-4 text-right text-gray-500">{item.received_qty}</td>

                      <td className="py-4 px-4">
                        {isFullyReceived ? (
                          <div className="text-right text-gray-400 text-xs font-semibold uppercase flex justify-end items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                          </div>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            max={remaining}
                            step="0.01"
                            value={receipts[item.id]?.qty ?? 0}
                            onChange={(e) => handleReceiptChange(item.id, 'qty', Number(e.target.value))}
                            className="w-24 text-right px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 float-right"
                          />
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <input
                          type="text"
                          disabled={isFullyReceived || receipts[item.id]?.qty === 0}
                          placeholder="Batch"
                          value={receipts[item.id]?.batch ?? ''}
                          onChange={(e) => handleReceiptChange(item.id, 'batch', e.target.value)}
                          className="w-32 px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:bg-gray-100"
                        />
                      </td>

                      <td className="py-4 px-4">
                        <input
                          type="date"
                          disabled={isFullyReceived || receipts[item.id]?.qty === 0}
                          value={receipts[item.id]?.expiry ?? ''}
                          onChange={(e) => handleReceiptChange(item.id, 'expiry', e.target.value)}
                          className="w-36 px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:bg-gray-100"
                        />
                      </td>

                      <td className="py-4 pl-4">
                        <input
                          type="text"
                          disabled={isFullyReceived || receipts[item.id]?.qty === 0}
                          placeholder="Location"
                          value={receipts[item.id]?.location ?? ''}
                          onChange={(e) => handleReceiptChange(item.id, 'location', e.target.value)}
                          className="w-32 px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:bg-gray-100"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm p-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            GRN Notes
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any comments regarding the condition of goods, delivery person, etc."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.push(`/procurement/${poId}`)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {submitting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Save className="w-4 h-4" />
            )}
            {submitting ? 'Saving...' : 'Confirm Receipt'}
          </button>
        </div>
      </form>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { 
  ArrowLeft, Plus, Trash2, CheckCircle2, XCircle, 
  Truck, Package, ClipboardCheck, AlertTriangle, Search
} from 'lucide-react'
import type { Supplier, RawMaterial, PurchaseOrder, POItem } from '@/types/database'

type POWithItems = PurchaseOrder & { po_items: POItem[] }

export default function NewGRNPage() {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<POWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [poId, setPoId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0])
  const [vehicleNumber, setVehicleNumber] = useState('')

  // Line Items State
  const [items, setItems] = useState([{ material_id: '', received_qty: 0, unit_price: 0, total_price: 0 }])

  // QA Checklist State
  const [qaChecks, setQaChecks] = useState({
    supplier_approved: false,
    vehicle_condition_ok: false,
    packaging_ok: false,
    label_verified: false,
    visual_quality_ok: false,
    pest_free: false,
    moisture_ok: false,
    no_chemical_contamination: false,
    docs_verified: false,
    sampling_tested: false,
    remarks: ''
  })

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      const [suppRes, matRes, poRes] = await Promise.all([
        supabase.from('suppliers').select('id, name, category, is_active').eq('is_active', true).order('name'),
        supabase.from('raw_materials').select('id, name, unit, code').order('name'),
        supabase.from('purchase_orders')
          .select('*, po_items(*)')
          .eq('approval_status', 'approved')
          .in('status', ['sent', 'partial'])
          .order('created_at', { ascending: false })
      ])

      if (suppRes.data) setSuppliers(suppRes.data)
      if (matRes.data) setRawMaterials(matRes.data)
      if (poRes.data) setPurchaseOrders(poRes.data)
      setLoading(false)
    }
    fetchData()
  }, [])

  const handlePoChange = (selectedPoId: string) => {
    setPoId(selectedPoId)
    const po = purchaseOrders.find(p => p.id === selectedPoId)
    if (po) {
      setSupplierId(po.supplier_id)
      const newItems = po.po_items.map(item => ({
        material_id: item.material_id,
        received_qty: Number(item.quantity) - Number(item.received_qty || 0), // Default to outstanding qty
        unit_price: Number(item.unit_price),
        total_price: (Number(item.quantity) - Number(item.received_qty || 0)) * Number(item.unit_price)
      }))
      setItems(newItems.length > 0 ? newItems : [{ material_id: '', received_qty: 0, unit_price: 0, total_price: 0 }])
      toast.success('Auto-filled details from Purchase Order')
    } else {
      setSupplierId('')
      setItems([{ material_id: '', received_qty: 0, unit_price: 0, total_price: 0 }])
    }
  }

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...items]
    const item = newItems[index]
    
    // @ts-ignore
    item[field] = value

    if (field === 'received_qty' || field === 'unit_price') {
      item.total_price = Number(item.received_qty) * Number(item.unit_price)
    }

    setItems(newItems)
  }

  const addItem = () => setItems([...items, { material_id: '', received_qty: 0, unit_price: 0, total_price: 0 }])
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index))

  const handleQaToggle = (key: keyof typeof qaChecks) => {
    setQaChecks(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!supplierId) return toast.error('Please select a supplier')
    if (items.length === 0 || items.some(i => !i.material_id || i.received_qty <= 0)) {
      return toast.error('Please add valid line items with quantity > 0')
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/grn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          po_id: poId || null,
          supplier_id: supplierId,
          received_date: receivedDate,
          vehicle_number: vehicleNumber,
          items: items.map(i => ({
            ...i,
            received_qty: Number(i.received_qty),
            unit_price: Number(i.unit_price),
            total_price: Number(i.total_price)
          })),
          qa_checks: qaChecks
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (data.status === 'QA Passed') {
        toast.success(`GRN ${data.grn_number} created successfully! Inventory updated.`)
      } else {
        toast.warning(`GRN ${data.grn_number} created, but QA Failed. Inventory NOT updated.`)
      }

      router.push('/procurement')
      router.refresh()
    } catch (err: any) {
      toast.error('Failed to submit GRN: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const qaParameters = [
    { key: 'supplier_approved', label: 'Supplier is Approved & Verified' },
    { key: 'vehicle_condition_ok', label: 'Vehicle Condition Acceptable' },
    { key: 'packaging_ok', label: 'Packaging is Intact' },
    { key: 'label_verified', label: 'Labels & Batch Numbers Verified' },
    { key: 'visual_quality_ok', label: 'Visual Quality Assessment Passed' },
    { key: 'pest_free', label: 'Free from Pests/Infestation' },
    { key: 'moisture_ok', label: 'Moisture Levels within Specs' },
    { key: 'no_chemical_contamination', label: 'No Odor / Chemical Contamination' },
    { key: 'docs_verified', label: 'COA and Required Documents Verified' },
    { key: 'sampling_tested', label: 'Quality Sample Tested (Lab)' }
  ]

  const totalGrnValue = items.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0)

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Receive Goods (GRN)</h1>
          <p className="text-sm text-gray-500 mt-0.5">Log received materials and perform QA checks</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Section 1: GRN Details */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <Truck className="w-5 h-5 text-gray-500" />
            <h2 className="font-semibold text-gray-800">1. Receiving Details</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-4 bg-blue-50 border border-blue-100 rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-blue-800 uppercase mb-1">Select Purchase Order (Optional)</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                  <select
                    value={poId}
                    onChange={e => handlePoChange(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-blue-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 text-blue-900"
                  >
                    <option value="">-- Create GRN Without PO --</option>
                    {purchaseOrders.map(po => (
                      <option key={po.id} value={po.id}>
                        {po.po_number} - {po.suppliers?.name ?? 'Unknown Supplier'} (LKR {Number(po.total_amount).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-blue-600 max-w-sm">
                Selecting a PO will automatically fill the supplier and expected raw materials.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Supplier *</label>
              <select
                required
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select Supplier...</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Received Date *</label>
              <input
                type="date"
                required
                value={receivedDate}
                onChange={e => setReceivedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Vehicle Number</label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={e => setVehicleNumber(e.target.value)}
                placeholder="e.g. WP-LD 1234"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Line Items */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-gray-500" />
              <h2 className="font-semibold text-gray-800">2. Received Materials</h2>
            </div>
          </div>
          
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                <thead>
                  <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                    <th className="pb-3 w-1/3">Raw Material</th>
                    <th className="pb-3 w-1/6">Qty</th>
                    <th className="pb-3 w-1/5">Unit Price (LKR)</th>
                    <th className="pb-3 w-1/5">Total (LKR)</th>
                    <th className="pb-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td className="py-3 pr-4">
                        <select
                          required
                          value={item.material_id}
                          onChange={e => handleItemChange(index, 'material_id', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                        >
                          <option value="">Select Material...</option>
                          {rawMaterials.map(rm => (
                            <option key={rm.id} value={rm.id}>{rm.code} - {rm.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 pr-4">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={item.received_qty || ''}
                          onChange={e => handleItemChange(index, 'received_qty', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={item.unit_price || ''}
                          onChange={e => handleItemChange(index, 'unit_price', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <input
                          type="number"
                          readOnly
                          value={item.total_price.toFixed(2)}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700"
                        />
                      </td>
                      <td className="py-3 text-center">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Item
              </button>
              <div className="text-right">
                <span className="text-sm font-medium text-gray-500 mr-4">Total GRN Value:</span>
                <span className="text-xl font-bold text-gray-900">LKR {totalGrnValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: QA Checklist */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-amber-50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-800">
              <ClipboardCheck className="w-5 h-5" />
              <h2 className="font-semibold text-amber-900">3. Quality Assurance Inspection</h2>
            </div>
            <div className="text-xs font-medium px-2.5 py-1 bg-amber-200 text-amber-800 rounded-full flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Mandatory
            </div>
          </div>
          
          <div className="p-6">
            <p className="text-sm text-gray-500 mb-6">
              Toggle the switch to <span className="font-semibold text-green-700">Pass</span> for each criterion. <br/>
              <strong>Note:</strong> Inventory is ONLY updated if ALL 10 checks are passed.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
              {qaParameters.map((param) => {
                const isPassed = qaChecks[param.key as keyof typeof qaChecks] as boolean
                return (
                  <div key={param.key} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <span className="text-sm font-medium text-gray-700">{param.label}</span>
                    <button
                      type="button"
                      onClick={() => handleQaToggle(param.key as keyof typeof qaChecks)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                        isPassed ? 'bg-green-600' : 'bg-gray-300'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isPassed ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="mt-6">
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">QA Remarks & Notes</label>
              <textarea
                rows={3}
                value={qaChecks.remarks}
                onChange={e => setQaChecks({ ...qaChecks, remarks: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 resize-none"
                placeholder="Enter any observations or reasons for failure..."
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end gap-4 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-green-700 text-white font-medium rounded-lg hover:bg-green-800 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
          >
            {submitting ? (
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
            ) : (
              <ClipboardCheck className="w-5 h-5" />
            )}
            Complete QA & Generate GRN
          </button>
        </div>

      </form>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Truck, CheckCircle2, XCircle, Search, ClipboardCheck, X } from 'lucide-react'
import type { SalesOrder } from '@/types/database'

export default function DispatchPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // QA Modal State
  const [showQAModal, setShowQAModal] = useState(false)
  const [selectedSO, setSelectedSO] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  
  // QA Form State
  const [qaParams, setQaParams] = useState({
    metal_inspection: false,
    moisture_testing: false,
    visual_quality: false,
    sensory_testing: false,
    foreign_matter: false,
    packing_material: false,
    pest_inspection: false,
    sealing_condition: false,
    label_accuracy: false,
    compliant_with_coa: false,
    remarks: ''
  })

  const fetchPendingDispatch = async () => {
    setLoading(true)
    const supabase = createClient()
    
    // Fetch orders pending QA
    const { data, error } = await supabase
      .from('sales_orders')
      .select('*, customers(name)')
      .eq('status', 'Pending QA')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Failed to load pending dispatches: ' + error.message)
    } else {
      setOrders(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchPendingDispatch()
  }, [])

  const handleStartQA = (order: any) => {
    setSelectedSO(order)
    setQaParams({
      metal_inspection: false, moisture_testing: false, visual_quality: false,
      sensory_testing: false, foreign_matter: false, packing_material: false,
      pest_inspection: false, sealing_condition: false, label_accuracy: false,
      compliant_with_coa: false, remarks: ''
    })
    setShowQAModal(true)
  }

  const handleToggle = (key: keyof typeof qaParams) => {
    setQaParams(prev => ({ ...prev, [key]: !prev[key as keyof typeof qaParams] }))
  }

  const handleSubmitQA = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate all true
    const allPassed = Object.entries(qaParams).every(([key, val]) => key === 'remarks' || val === true)
    if (!allPassed) {
      return toast.error('All 10 quality checks must be passed to approve dispatch.')
    }

    setSubmitting(true)
    const toastId = toast.loading('Processing dispatch and allocating inventory...')
    try {
      const res = await fetch('/api/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ so_id: selectedSO.id, qa_params: qaParams })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success('Sales Order dispatched and invoiced successfully!', { id: toastId })
      setShowQAModal(false)
      fetchPendingDispatch()
    } catch (error: any) {
      toast.error(error.message, { id: toastId })
    } finally {
      setSubmitting(false)
    }
  }

  const qaChecks = [
    { key: 'metal_inspection', label: 'Metal Detector Inspection' },
    { key: 'moisture_testing', label: 'Moisture Testing' },
    { key: 'visual_quality', label: 'Visual Quality & Color' },
    { key: 'sensory_testing', label: 'Sensory Testing (Odor/Taste)' },
    { key: 'foreign_matter', label: 'Free from Foreign Matter' },
    { key: 'packing_material', label: 'Packing Material Intact' },
    { key: 'pest_inspection', label: 'Pest / Insect Free' },
    { key: 'sealing_condition', label: 'Sealing Condition Verified' },
    { key: 'label_accuracy', label: 'Label Accuracy & Details' },
    { key: 'compliant_with_coa', label: 'Compliant with COA' },
  ]

  const filteredOrders = orders.filter(o => 
    o.so_number.toLowerCase().includes(search.toLowerCase()) || 
    (o.customers?.name || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Outbound Dispatch & Final QA</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage final vehicle loading checks before dispatching Sales Orders</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by SO number or customer..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto p-4">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">SO Number</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? <tr><td colSpan={6} className="p-4 text-center">Loading...</td></tr> : 
               filteredOrders.length === 0 ? <tr><td colSpan={6} className="p-4 text-center text-gray-400">No pending dispatches found.</td></tr> :
               filteredOrders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-gray-900">{order.so_number}</td>
                  <td className="px-4 py-3">{new Date(order.order_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-medium">{order.customers?.name}</td>
                  <td className="px-4 py-3">{Number(order.total_amount).toLocaleString('en-US', { style: 'currency', currency: order.currency || 'LKR' })}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      Pending QA
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleStartQA(order)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5" /> Start Loading QA
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* QA Modal */}
      {showQAModal && selectedSO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Truck className="w-5 h-5 text-gray-500" /> Final Outbound QA: {selectedSO.so_number}
              </h2>
              <button onClick={() => setShowQAModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            
            <form id="qa-form" onSubmit={handleSubmitQA} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg">
                <p className="text-sm text-amber-800 font-medium mb-1">Strict Compliance Warning</p>
                <p className="text-xs text-amber-700">All 10 parameters MUST pass to authorize dispatch. Approving this form will officially deduct Finished Goods from inventory and generate the final Invoice.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {qaChecks.map(check => (
                  <div key={check.key} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <span className="text-sm font-medium text-gray-700">{check.label}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={qaParams[check.key as keyof typeof qaParams] as boolean}
                      onClick={() => handleToggle(check.key as keyof typeof qaParams)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        qaParams[check.key as keyof typeof qaParams] ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        qaParams[check.key as keyof typeof qaParams] ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Remarks (Optional)</label>
                <textarea 
                  value={qaParams.remarks}
                  onChange={(e) => setQaParams({...qaParams, remarks: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Note any vehicle conditions, seal numbers, or weather observations..."
                />
              </div>
            </form>
            
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button type="button" disabled={submitting} onClick={() => setShowQAModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50">Cancel</button>
              <button type="submit" form="qa-form" disabled={submitting} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-2">
                {submitting ? 'Processing...' : 'Approve & Dispatch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

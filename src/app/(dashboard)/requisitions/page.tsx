'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Package2, CheckCircle2, XCircle, Plus, ClipboardList, PackageOpen, Trash2 } from 'lucide-react'

export default function RequisitionsDashboard() {
  const [activeTab, setActiveTab] = useState<'MyRequests' | 'Approvals'>('MyRequests')
  const [loading, setLoading] = useState(true)
  
  const [requisitions, setRequisitions] = useState<any[]>([])
  const [rawMaterials, setRawMaterials] = useState<any[]>([])
  const [userRole, setUserRole] = useState('')
  const [userId, setUserId] = useState('')

  // New MRN Modal State
  const [showNewModal, setShowNewModal] = useState(false)
  const [mrnForm, setMrnForm] = useState({ department: 'Production', items: [{ item_id: '', requested_qty: '' }] })
  
  // Issue Modal State
  const [showIssueModal, setShowIssueModal] = useState(false)
  const [selectedMrn, setSelectedMrn] = useState<any>(null)
  const [issueForm, setIssueForm] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUserId(user.id)
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setUserRole((profile?.role || '').toLowerCase())
      
      const res = await fetch(`/api/requisitions?userId=${user.id}&role=${(profile?.role || '').toLowerCase()}`)
      const data = await res.json()
      if (res.ok) setRequisitions(data.requisitions)
    }

    const { data: mats } = await supabase.from('raw_materials').select('id, name, quantity_in_stock, unit').eq('is_active', true).order('name')
    if (mats) setRawMaterials(mats)
    
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleAddMrnRow = () => setMrnForm({ ...mrnForm, items: [...mrnForm.items, { item_id: '', requested_qty: '' }] })
  const handleRemoveMrnRow = (idx: number) => {
    const newItems = [...mrnForm.items]
    newItems.splice(idx, 1)
    setMrnForm({ ...mrnForm, items: newItems })
  }
  const handleMrnItemChange = (idx: number, field: string, val: string) => {
    const newItems = [...mrnForm.items]
    newItems[idx] = { ...newItems[idx], [field]: val }
    setMrnForm({ ...mrnForm, items: newItems })
  }

  const handleSubmitNewMrn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mrnForm.items.length || mrnForm.items.some(i => !i.item_id || !i.requested_qty)) {
      return toast.error('Please complete all item rows')
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/requisitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, department: mrnForm.department, items: mrnForm.items })
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Requisition submitted')
      setShowNewModal(false)
      setMrnForm({ department: 'Production', items: [{ item_id: '', requested_qty: '' }] })
      fetchData()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const openIssueModal = (mrn: any) => {
    setSelectedMrn(mrn)
    setIssueForm(mrn.mrn_items.map((i: any) => ({
      item_id: i.item_id,
      name: i.raw_materials.name,
      unit: i.raw_materials.unit,
      requested: Number(i.requested_qty),
      stock: Number(i.raw_materials.quantity_in_stock),
      issued: Number(i.requested_qty) // default to full amount
    })))
    setShowIssueModal(true)
  }

  const handleIssueItemChange = (idx: number, val: string) => {
    const newItems = [...issueForm]
    newItems[idx].issued = val
    setIssueForm(newItems)
  }

  const handleIssueSubmit = async (e: React.FormEvent, action: 'Issue' | 'Reject') => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = action === 'Issue' 
        ? { action, items: issueForm.map(i => ({ item_id: i.item_id, issued_qty: Number(i.issued) })) }
        : { action }
        
      const res = await fetch(`/api/requisitions/${selectedMrn.id}/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(action === 'Issue' ? 'Items Issued' : 'MRN Rejected')
      setShowIssueModal(false)
      fetchData()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const isStoreAdmin = ['admin', 'manager', 'procurement'].includes(userRole)
  const myReqs = requisitions.filter(r => r.user_id === userId)
  const pendingReqs = requisitions.filter(r => r.status === 'Pending')

  const displayList = activeTab === 'MyRequests' ? myReqs : pendingReqs

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Internal Requisitions</h1>
          <p className="text-sm text-gray-500 mt-0.5">Material Requisition Notes (MRN)</p>
        </div>
        {activeTab === 'MyRequests' && (
          <button 
            onClick={() => setShowNewModal(true)} 
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> New Requisition
          </button>
        )}
      </div>

      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('MyRequests')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'MyRequests' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          My Requests ({myReqs.length})
        </button>
        {isStoreAdmin && (
          <button
            onClick={() => setActiveTab('Approvals')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'Approvals' 
                ? 'border-purple-600 text-purple-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Store Approvals ({pendingReqs.length})
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto p-4">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : displayList.length === 0 ? (
            <div className="p-12 text-center">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No requisitions found.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">MRN No.</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Requester</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayList.map(mrn => (
                  <tr key={mrn.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-gray-900">{mrn.mrn_number}</td>
                    <td className="px-4 py-3">{new Date(mrn.requested_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{mrn.profiles?.first_name} {mrn.profiles?.last_name}</td>
                    <td className="px-4 py-3">{mrn.department}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        mrn.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                        mrn.status === 'Issued' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {mrn.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {activeTab === 'Approvals' && mrn.status === 'Pending' && (
                        <button onClick={() => openIssueModal(mrn)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white hover:bg-gray-800 rounded-lg text-xs font-medium transition-colors">
                          <PackageOpen className="w-3.5 h-3.5" /> Issue Items
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* New MRN Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-800">New Requisition</h2>
            </div>
            
            <form id="mrn-form" onSubmit={handleSubmitNewMrn} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select
                  required
                  value={mrnForm.department}
                  onChange={e => setMrnForm({...mrnForm, department: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Production">Production</option>
                  <option value="QA">Quality Assurance (QA)</option>
                  <option value="Admin">Administration</option>
                  <option value="Sales">Sales & Marketing</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Requested Items</label>
                  <button type="button" onClick={handleAddMrnRow} className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center">
                    <Plus className="w-4 h-4 mr-1" /> Add Row
                  </button>
                </div>
                <div className="space-y-3">
                  {mrnForm.items.map((row, idx) => (
                    <div key={idx} className="flex gap-3 items-start">
                      <div className="flex-1">
                        <select
                          required
                          value={row.item_id}
                          onChange={e => handleMrnItemChange(idx, 'item_id', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="">-- Select Item --</option>
                          {rawMaterials.map(mat => (
                            <option key={mat.id} value={mat.id}>{mat.name} ({mat.unit})</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-32">
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="Qty"
                          value={row.requested_qty}
                          onChange={e => handleMrnItemChange(idx, 'requested_qty', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      {mrnForm.items.length > 1 && (
                        <button type="button" onClick={() => handleRemoveMrnRow(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-0.5">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </form>
            
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button type="button" disabled={submitting} onClick={() => setShowNewModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50">Cancel</button>
              <button type="submit" form="mrn-form" disabled={submitting} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm disabled:opacity-50">
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Issue Modal */}
      {showIssueModal && selectedMrn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-800">Issue MRN: {selectedMrn.mrn_number}</h2>
              <span className="text-sm font-medium text-gray-500">{selectedMrn.department}</span>
            </div>
            
            <form id="issue-form" onSubmit={e => handleIssueSubmit(e, 'Issue')} className="p-6 overflow-y-auto max-h-[70vh]">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3">Item Name</th>
                    <th className="px-4 py-3 text-right">Stock</th>
                    <th className="px-4 py-3 text-right">Requested</th>
                    <th className="px-4 py-3 w-40">Issue Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {issueForm.map((item, idx) => (
                    <tr key={item.item_id}>
                      <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                      <td className={`px-4 py-3 text-right font-medium ${item.stock < item.requested ? 'text-red-600' : 'text-emerald-600'}`}>
                        {item.stock} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-right">{item.requested} {item.unit}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.01"
                            required
                            max={item.stock}
                            min={0}
                            value={item.issued}
                            onChange={e => handleIssueItemChange(idx, e.target.value)}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </form>
            
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
              <button 
                type="button" 
                disabled={submitting} 
                onClick={(e) => handleIssueSubmit(e, 'Reject')} 
                className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 transition-colors"
              >
                Reject Request
              </button>
              <div className="flex gap-3">
                <button type="button" disabled={submitting} onClick={() => setShowIssueModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50">Cancel</button>
                <button type="submit" form="issue-form" disabled={submitting} className="px-4 py-2 text-sm font-medium bg-gray-900 hover:bg-gray-800 text-white rounded-lg shadow-sm disabled:opacity-50">
                  {submitting ? 'Issuing...' : 'Confirm Issue'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

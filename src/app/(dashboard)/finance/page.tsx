'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { DollarSign, FileText, CheckCircle2, XCircle, Search, CreditCard } from 'lucide-react'

export default function FinanceDashboard() {
  const [activeTab, setActiveTab] = useState<'AR' | 'AP' | 'Approvals'>('AR')
  const [loading, setLoading] = useState(true)
  
  // Data State
  const [arAging, setArAging] = useState<any[]>([])
  const [apAging, setApAging] = useState<any[]>([])
  const [approvals, setApprovals] = useState<any[]>([])
  
  const [userRole, setUserRole] = useState('')

  // Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentType, setPaymentType] = useState<'Inbound' | 'Outbound'>('Inbound')
  const [selectedEntity, setSelectedEntity] = useState<any>(null)
  
  const [paymentForm, setPaymentForm] = useState({
    document_id: '',
    amount: '',
    payment_method: 'Bank Transfer',
    transaction_reference: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    const supabase = createClient()
    
    // Get Role
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setUserRole((profile?.role || '').toLowerCase())
    }

    try {
      // Fetch Aging
      const resAging = await fetch('/api/finance/aging')
      const agingData = await resAging.json()
      if (resAging.ok) {
        setArAging(agingData.ar)
        setApAging(agingData.ap)
      }

      // Fetch Approvals
      const resApp = await fetch('/api/finance/payments')
      const appData = await resApp.json()
      if (resApp.ok) {
        setApprovals(appData.payments)
      }
    } catch (e: any) {
      toast.error('Failed to load finance data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleOpenPaymentModal = (type: 'Inbound' | 'Outbound', entity: any) => {
    setPaymentType(type)
    setSelectedEntity(entity)
    setPaymentForm({
      document_id: '',
      amount: '',
      payment_method: 'Bank Transfer',
      transaction_reference: ''
    })
    setShowPaymentModal(true)
  }

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentForm.document_id || !paymentForm.amount) {
      return toast.error('Document and amount are required')
    }

    setSubmitting(true)
    try {
      const payload = {
        type: paymentType,
        invoice_id: paymentType === 'Inbound' ? paymentForm.document_id : null,
        po_id: paymentType === 'Outbound' ? paymentForm.document_id : null,
        amount: Number(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        transaction_reference: paymentForm.transaction_reference
      }

      const res = await fetch('/api/finance/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }

      toast.success('Payment submitted for approval')
      setShowPaymentModal(false)
      fetchData()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprovalAction = async (id: string, status: 'Approved' | 'Rejected') => {
    try {
      const res = await fetch(`/api/finance/payments/${id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      toast.success(`Payment ${status}`)
      fetchData()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const formatCurrency = (val: number) => Number(val).toLocaleString('en-US', { style: 'currency', currency: 'LKR' })

  const canApprove = ['admin', 'md'].includes(userRole)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Finance & Accounts</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage Accounts Receivable, Payable, and Approvals</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-200">
        {(['AR', 'AP', 'Approvals'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab === 'AR' ? 'Debtor Aging (AR)' : tab === 'AP' ? 'Creditor Aging (AP)' : `Payment Approvals (${approvals.length})`}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto p-4">
          
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : activeTab === 'AR' ? (
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">Customer Name</th>
                  <th className="px-4 py-3 text-right">0-20 Days</th>
                  <th className="px-4 py-3 text-right">21-29 Days</th>
                  <th className="px-4 py-3 text-right">30+ Days</th>
                  <th className="px-4 py-3 text-right font-bold">Total Outstanding</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {arAging.length === 0 ? <tr><td colSpan={6} className="p-4 text-center text-gray-400">No outstanding AR.</td></tr> :
                 arAging.map(row => (
                  <tr key={row.customerId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">{row.customerName}</td>
                    <td className="px-4 py-3 text-right text-green-600">{formatCurrency(row.bucket0_20)}</td>
                    <td className="px-4 py-3 text-right text-amber-600">{formatCurrency(row.bucket21_29)}</td>
                    <td className="px-4 py-3 text-right text-red-600 font-medium">{formatCurrency(row.bucket30Plus)}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(row.totalOutstanding)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleOpenPaymentModal('Inbound', row)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-medium transition-colors">
                        <DollarSign className="w-3.5 h-3.5" /> Receive Payment
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : activeTab === 'AP' ? (
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">Supplier Name</th>
                  <th className="px-4 py-3 text-right">0-20 Days</th>
                  <th className="px-4 py-3 text-right">21-29 Days</th>
                  <th className="px-4 py-3 text-right">30+ Days</th>
                  <th className="px-4 py-3 text-right font-bold">Total Outstanding</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {apAging.length === 0 ? <tr><td colSpan={6} className="p-4 text-center text-gray-400">No outstanding AP.</td></tr> :
                 apAging.map(row => (
                  <tr key={row.supplierId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">{row.supplierName}</td>
                    <td className="px-4 py-3 text-right text-green-600">{formatCurrency(row.bucket0_20)}</td>
                    <td className="px-4 py-3 text-right text-amber-600">{formatCurrency(row.bucket21_29)}</td>
                    <td className="px-4 py-3 text-right text-red-600 font-medium">{formatCurrency(row.bucket30Plus)}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(row.totalOutstanding)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleOpenPaymentModal('Outbound', row)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white hover:bg-gray-800 rounded-lg text-xs font-medium transition-colors">
                        <CreditCard className="w-3.5 h-3.5" /> Make Payment
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Document</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {approvals.length === 0 ? <tr><td colSpan={6} className="p-4 text-center text-gray-400">No pending approvals.</td></tr> :
                 approvals.map(app => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{new Date(app.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${app.type === 'Inbound' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {app.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{app.type === 'Inbound' ? app.invoices?.invoice_number : app.purchase_orders?.po_number}</td>
                    <td className="px-4 py-3">{app.payment_method} <span className="text-gray-400 text-xs">({app.transaction_reference || 'N/A'})</span></td>
                    <td className="px-4 py-3 font-bold text-gray-900">{formatCurrency(app.amount)}</td>
                    <td className="px-4 py-3 text-right">
                      {canApprove ? (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleApprovalAction(app.id, 'Approved')} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Approve">
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                          <button onClick={() => handleApprovalAction(app.id, 'Rejected')} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Reject">
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedEntity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-800">
                {paymentType === 'Inbound' ? 'Receive Payment' : 'Make Payment'}
              </h2>
            </div>
            
            <form id="payment-form" onSubmit={handleSubmitPayment} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {paymentType === 'Inbound' ? 'Select Unpaid Invoice' : 'Select Unpaid PO'}
                </label>
                <select
                  required
                  value={paymentForm.document_id}
                  onChange={e => setPaymentForm({...paymentForm, document_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">-- Select Document --</option>
                  {(paymentType === 'Inbound' ? selectedEntity.invoices : selectedEntity.pos).map((doc: any) => (
                    <option key={doc.id} value={doc.id}>
                      {paymentType === 'Inbound' ? doc.invoice_number : doc.po_number} - Balance: {formatCurrency(doc.outstanding)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (LKR)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={paymentForm.document_id ? (paymentType === 'Inbound' ? selectedEntity.invoices : selectedEntity.pos).find((d:any) => d.id === paymentForm.document_id)?.outstanding : undefined}
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select
                    value={paymentForm.payment_method}
                    onChange={e => setPaymentForm({...paymentForm, payment_method: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ref / Cheque No.</label>
                  <input
                    type="text"
                    value={paymentForm.transaction_reference}
                    onChange={e => setPaymentForm({...paymentForm, transaction_reference: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </form>
            
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button type="button" disabled={submitting} onClick={() => setShowPaymentModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50">Cancel</button>
              <button type="submit" form="payment-form" disabled={submitting} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm disabled:opacity-50">
                {submitting ? 'Submitting...' : 'Submit for Approval'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

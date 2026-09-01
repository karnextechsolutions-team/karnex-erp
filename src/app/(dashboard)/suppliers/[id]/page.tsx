'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { 
  ArrowLeft, Building2, Phone, MapPin, CreditCard, 
  Pencil, X, Truck, FileText, CheckCircle, Clock 
} from 'lucide-react'
import type { Supplier, PurchaseOrder } from '@/types/database'

type SupplierWithMetrics = Supplier & {
  metrics: {
    totalOrdered: number
    totalPaid: number
    outstandingBalance: number
  }
  orders: PurchaseOrder[]
  payments: any[]
}

export default function SupplierProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [data, setData] = useState<SupplierWithMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'orders' | 'bills' | 'payments'>('orders')

  // Edit Modal State
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier>>({})

  const fetchSupplierData = async () => {
    try {
      const res = await fetch(`/api/suppliers/${params.id}`)
      if (!res.ok) throw new Error('Failed to fetch supplier details')
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSupplierData()
  }, [params.id])

  const handleEditClick = () => {
    if (data) {
      setEditingSupplier({
        id: data.id,
        name: data.name,
        category: data.category,
        address: data.address,
        phone: data.phone,
        payment_terms: data.payment_terms,
        bank_name: data.bank_name,
        account_name: data.account_name,
        account_number: data.account_number,
        branch: data.branch
      })
      setShowEditDialog(true)
    }
  }

  const handleUpdateSupplier = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSupplier.name) {
      toast.error('Supplier name is required')
      return
    }

    const supabase = createClient()
    const { error } = await supabase
      .from('suppliers')
      .update({
        name: editingSupplier.name,
        category: editingSupplier.category,
        address: editingSupplier.address || null,
        phone: editingSupplier.phone || null,
        payment_terms: editingSupplier.payment_terms,
        bank_name: editingSupplier.bank_name || null,
        account_name: editingSupplier.account_name || null,
        account_number: editingSupplier.account_number || null,
        branch: editingSupplier.branch || null
      })
      .eq('id', editingSupplier.id)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Supplier profile updated successfully!')
      setShowEditDialog(false)
      fetchSupplierData() // refresh data
    }
  }

  const formatCurrency = (amount: number) => {
    return `LKR ${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
      })
    } catch (e) {
      return dateStr
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'draft': 'bg-slate-100 text-slate-700',
      'sent': 'bg-blue-100 text-blue-700',
      'partial': 'bg-amber-100 text-amber-700',
      'received': 'bg-green-100 text-green-700',
      'cancelled': 'bg-red-100 text-red-700'
    }
    return (
      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full uppercase tracking-wider ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {status}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
      </div>
    )
  }

  if (!data) return <div>Supplier not found.</div>

  const unpaidOrders = data.orders.filter(o => o.status !== 'cancelled' && o.status !== 'received')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <button 
          onClick={() => router.push('/suppliers')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Supplier Profile</h1>
          <p className="text-sm text-gray-500 mt-0.5">View and manage supplier details</p>
        </div>
      </div>

      {/* Top Section - Profile */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="p-6 md:flex md:items-start md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center shrink-0">
              <Building2 className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold text-gray-900">{data.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                  {data.category}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mt-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" /> {data.phone || 'N/A'}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" /> {data.address || 'N/A'}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" /> Terms: {data.payment_terms}
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gray-400" /> 
                  Bank: {data.bank_name ? `${data.bank_name} (${data.account_number})` : 'Not configured'}
                </div>
              </div>
            </div>
          </div>
          <button 
            onClick={handleEditClick}
            className="w-full md:w-auto flex items-center justify-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Pencil className="w-4 h-4" /> Edit Profile
          </button>
        </div>

        {/* Top Section - Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100 border-t border-gray-100 bg-gray-50">
          <div className="p-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Ordered</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.metrics.totalOrdered)}</p>
          </div>
          <div className="p-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Paid</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.metrics.totalPaid)}</p>
          </div>
          <div className="p-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Outstanding Balance</p>
            <p className={`text-2xl font-bold ${data.metrics.outstandingBalance > 0 ? 'text-amber-600' : 'text-green-600'}`}>
              {formatCurrency(data.metrics.outstandingBalance)}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: 'orders', label: 'Order History', icon: Truck },
          { id: 'bills', label: 'Outstanding Bills', icon: FileText },
          { id: 'payments', label: 'Payment History', icon: CheckCircle }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id 
                ? 'border-green-600 text-green-700' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        
        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Doc No</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.orders.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500">No order history available.</td></tr>
              ) : (
                data.orders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(order.order_date)}</td>
                    <td className="px-6 py-4 font-mono text-sm font-medium text-gray-800">{order.po_number}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">{formatCurrency(order.total_amount)}</td>
                    <td className="px-6 py-4 text-center">{getStatusBadge(order.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* Bills Tab */}
        {activeTab === 'bills' && (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Reference</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Due Date</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount Owed</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {unpaidOrders.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500">No outstanding bills.</td></tr>
              ) : (
                unpaidOrders.map(order => {
                  // Rough estimation of due date
                  const date = new Date(order.order_date)
                  date.setDate(date.getDate() + (data.payment_terms === '30 Days' ? 30 : 7))
                  
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono text-sm font-medium text-gray-800">{order.po_number}</td>
                      <td className="px-6 py-4 text-sm text-amber-600 font-medium">{formatDate(date.toISOString())}</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">{formatCurrency(order.total_amount)}</td>
                      <td className="px-6 py-4 text-center">
                        <button className="px-3 py-1.5 bg-green-700 hover:bg-green-800 text-white rounded text-xs font-medium transition-colors">
                          Make Payment
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="p-12 text-center">
            <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No payment history found.</p>
            <p className="text-sm text-gray-400 mt-1">Payments integration module is currently pending.</p>
          </div>
        )}
      </div>

      {/* ── EDIT PROFILE MODAL ── */}
      {showEditDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold text-gray-900">Edit Supplier Profile</h3>
              <button onClick={() => setShowEditDialog(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateSupplier} className="p-6">
              
              <h4 className="text-sm font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Basic Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={editingSupplier.name || ''}
                    onChange={e => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Category *</label>
                  <select
                    value={editingSupplier.category || ''}
                    onChange={e => setEditingSupplier({ ...editingSupplier, category: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500"
                  >
                    <option value="Organic">Organic</option>
                    <option value="Conventional">Conventional</option>
                    <option value="Traders">Traders</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Contact Number</label>
                  <input
                    type="text"
                    value={editingSupplier.phone || ''}
                    onChange={e => setEditingSupplier({ ...editingSupplier, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Payment Term *</label>
                  <select
                    value={editingSupplier.payment_terms || ''}
                    onChange={e => setEditingSupplier({ ...editingSupplier, payment_terms: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500"
                  >
                    <option value="7 Days">7 Days</option>
                    <option value="30 Days">30 Days</option>
                  </select>
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Address</label>
                  <input
                    type="text"
                    value={editingSupplier.address || ''}
                    onChange={e => setEditingSupplier({ ...editingSupplier, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <h4 className="text-sm font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Bank Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={editingSupplier.bank_name || ''}
                    onChange={e => setEditingSupplier({ ...editingSupplier, bank_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                    placeholder="e.g. Commercial Bank"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Account Name</label>
                  <input
                    type="text"
                    value={editingSupplier.account_name || ''}
                    onChange={e => setEditingSupplier({ ...editingSupplier, account_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                    placeholder="e.g. Acme Holdings Ltd"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Account Number</label>
                  <input
                    type="text"
                    value={editingSupplier.account_number || ''}
                    onChange={e => setEditingSupplier({ ...editingSupplier, account_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                    placeholder="e.g. 10002938475"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Branch</label>
                  <input
                    type="text"
                    value={editingSupplier.branch || ''}
                    onChange={e => setEditingSupplier({ ...editingSupplier, branch: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                    placeholder="e.g. Colombo 03"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEditDialog(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

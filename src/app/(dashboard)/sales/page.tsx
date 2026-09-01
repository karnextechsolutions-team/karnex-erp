'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Search, ShoppingCart, Eye, CheckCircle, Truck, FileText, XCircle } from 'lucide-react'

export default function SalesPage() {
  const router = useRouter()
  
  const [activeTab, setActiveTab] = useState<'quotations' | 'orders'>('quotations')
  
  const [orders, setOrders] = useState<any[]>([])
  const [quotations, setQuotations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [userRole, setUserRole] = useState<string>('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      
      // Fetch User Role
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        setUserRole((profile?.role || '').toLowerCase())
      }

      // Fetch Sales Orders
      const { data: soData } = await supabase
        .from('sales_orders')
        .select('*, customers(name, type, country, currency)')
        .order('created_at', { ascending: false })
      
      setOrders(soData ?? [])

      // Fetch Quotations
      const res = await fetch('/api/quotations')
      if (res.ok) {
        const qtData = await res.json()
        setQuotations(qtData)
      }
    } catch (err) {
      console.error('Failed to fetch data', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const fmtDate = (d: string) => d
    ? new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})
    : '—'

  const fmtLKR = (n: number) =>
    'LKR ' + (n || 0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})

  const totalRevenue = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)

  // Filters for Orders
  const filteredOrders = orders.filter(o => {
    const matchSearch =
      (o.so_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (o.customers?.name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || o.status === statusFilter
    return matchSearch && matchStatus
  })

  // Filters for Quotations
  const filteredQuotations = quotations.filter(q => {
    const matchSearch =
      (q.quotation_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (q.customers?.name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || q.md_approval_status.toLowerCase() === statusFilter.toLowerCase()
    return matchSearch && matchStatus
  })

  async function updateOrderStatus(orderId: string, newStatus: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('sales_orders')
      .update({ status: newStatus })
      .eq('id', orderId)
    
    if (error) toast.error('Failed to update: ' + error.message)
    else { toast.success('Order status updated'); fetchData() }
  }

  async function handleQuotationApproval(id: string, status: 'Approved' | 'Rejected') {
    try {
      const res = await fetch(`/api/quotations/${id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ md_approval_status: status })
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to update status')
      toast.success(`Quotation ${status} successfully`)
      fetchData()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const getOrderStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: 'bg-slate-100 text-slate-600',
      confirmed: 'bg-blue-100 text-blue-700',
      dispatched: 'bg-amber-100 text-amber-700',
      delivered: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-600',
    }
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${map[status] || map.draft}`}>
        {status}
      </span>
    )
  }

  const getApprovalBadge = (status: string) => {
    const map: Record<string, string> = {
      'Pending Approval': 'bg-amber-100 text-amber-700',
      'Approved': 'bg-green-100 text-green-700',
      'Rejected': 'bg-red-100 text-red-700',
      'Draft': 'bg-slate-100 text-slate-600'
    }
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${map[status] || map.Draft}`}>
        {status}
      </span>
    )
  }

  const canApprove = ['admin', 'manager', 'md'].includes(userRole)

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Sales & Quotations</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage customer quotations, approvals, and sales orders</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/sales/quotations/new')}
            className="flex items-center gap-2 border border-green-700 text-green-700 hover:bg-green-50 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors bg-white shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Quotation
          </button>
          <button
            onClick={() => router.push('/sales/new')}
            className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Sales Order
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Quotations</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{quotations.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Pending Approvals</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{quotations.filter(q => q.md_approval_status === 'Pending Approval').length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Orders</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{orders.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Order Revenue</p>
          <p className="text-xl font-semibold text-gray-900 mt-1 truncate" title={fmtLKR(totalRevenue)}>
            {fmtLKR(totalRevenue)}
          </p>
        </div>
      </div>

      {/* TABS & FILTERS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto">
          <button
            onClick={() => { setActiveTab('quotations'); setStatusFilter('all'); setSearch('') }}
            className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-semibold transition-colors ${
              activeTab === 'quotations' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Quotations
          </button>
          <button
            onClick={() => { setActiveTab('orders'); setStatusFilter('all'); setSearch('') }}
            className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-semibold transition-colors ${
              activeTab === 'orders' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Sales Orders
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              placeholder={`Search ${activeTab === 'quotations' ? 'quotations' : 'orders'}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white min-w-[140px]"
          >
            <option value="all">All Status</option>
            {activeTab === 'quotations' ? (
              <>
                <option value="pending approval">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </>
            ) : (
              <>
                <option value="draft">Draft</option>
                <option value="confirmed">Confirmed</option>
                <option value="dispatched">Dispatched</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading data...</div>
        ) : activeTab === 'quotations' ? (
          /* QUOTATIONS TABLE */
          filteredQuotations.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">No quotations found</p>
              <button
                onClick={() => router.push('/sales/quotations/new')}
                className="mt-3 text-sm bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Create Quotation
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Document No</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Grand Total</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">MD Approval</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredQuotations.map(q => (
                    <tr key={q.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 font-mono">{q.quotation_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{fmtDate(q.created_at)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{q.customers?.name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{q.category_type}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                        {q.customers?.currency} {Number(q.total_amount).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getApprovalBadge(q.md_approval_status)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => router.push(`/sales/quotations/${q.id}`)}
                            className="p-1.5 text-gray-500 hover:text-gray-900 bg-gray-50 hover:bg-gray-200 rounded transition-colors"
                            title="View Quotation"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {q.md_approval_status === 'Pending Approval' && canApprove && (
                            <>
                              <button
                                onClick={() => handleQuotationApproval(q.id, 'Approved')}
                                className="p-1.5 text-green-700 hover:text-green-900 bg-green-50 hover:bg-green-200 rounded transition-colors"
                                title="Approve"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleQuotationApproval(q.id, 'Rejected')}
                                className="p-1.5 text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-200 rounded transition-colors"
                                title="Reject"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* SALES ORDERS TABLE */
          filteredOrders.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingCart className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">No sales orders found</p>
              <button
                onClick={() => router.push('/sales/new')}
                className="mt-3 text-sm bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Create New Order
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">SO Number</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Order Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Delivery Date</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredOrders.map(o => (
                    <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 font-mono">{o.so_number}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{o.customers?.name || '—'}</td>
                      <td className="px-4 py-3 text-sm">
                        {o.customers?.type === 'local'
                          ? <span className="inline-flex px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium capitalize">Local</span>
                          : <span className="inline-flex px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium capitalize">Export</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{fmtDate(o.order_date)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{fmtDate(o.delivery_date)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                        {o.customers?.currency} {Number(o.total_amount).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getOrderStatusBadge(o.status)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => router.push(`/sales/${o.id}`)}
                            className="p-1.5 text-gray-500 hover:text-gray-900 bg-gray-50 hover:bg-gray-200 rounded transition-colors"
                            title="View Order"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {o.status === 'draft' && (
                            <button
                              onClick={() => updateOrderStatus(o.id, 'confirmed')}
                              className="p-1.5 text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-200 rounded transition-colors"
                              title="Confirm Order"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          {o.status === 'confirmed' && (
                            <button
                              onClick={() => updateOrderStatus(o.id, 'dispatched')}
                              className="p-1.5 text-amber-600 hover:text-amber-900 bg-amber-50 hover:bg-amber-200 rounded transition-colors"
                              title="Dispatch Order"
                            >
                              <Truck className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  )
}

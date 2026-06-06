'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Search, ShoppingCart, Eye, CheckCircle, Truck } from 'lucide-react'

export default function SalesPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchOrders = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('sales_orders')
      .select('*, customers(name, type, country, currency)')
      .order('created_at', { ascending: false })
    
    setOrders(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const fmtDate = (d: string) => d
    ? new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})
    : '—'

  const fmtLKR = (n: number) =>
    'LKR ' + (n || 0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})

  const totalRevenue = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)

  const filtered = orders.filter(o => {
    const matchSearch =
      (o.so_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (o.customers?.name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || o.status === statusFilter
    return matchSearch && matchStatus
  })

  async function updateStatus(orderId: string, newStatus: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('sales_orders')
      .update({ status: newStatus })
      .eq('id', orderId)
    
    if (error) toast.error('Failed to update: ' + error.message)
    else { toast.success('Order status updated'); fetchOrders() }
  }

  const getStatusBadge = (status: string) => {
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

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Sales Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage customer orders and dispatching</p>
        </div>
        <button
          onClick={() => router.push('/sales/new')}
          className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> New Sales Order
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Orders</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{orders.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Confirmed</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{orders.filter(o => o.status === 'confirmed').length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Dispatched</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{orders.filter(o => o.status === 'dispatched').length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Revenue</p>
          <p className="text-xl font-semibold text-gray-900 mt-1 truncate" title={fmtLKR(totalRevenue)}>
            {fmtLKR(totalRevenue)}
          </p>
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            placeholder="Search by SO number or customer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="confirmed">Confirmed</option>
          <option value="dispatched">Dispatched</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* TABLE */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading sales orders...</div>
        ) : filtered.length === 0 ? (
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
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">SO Number</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Order Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Delivery Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Currency</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(o => (
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
                      <td className="px-4 py-3 text-sm text-gray-500">{o.currency}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                        {Number(o.total_amount).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(o.status)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => router.push(`/sales/${o.id}`)}
                            className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {o.status === 'draft' && (
                            <button
                              onClick={() => updateStatus(o.id, 'confirmed')}
                              className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Confirm Order"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          {o.status === 'confirmed' && (
                            <button
                              onClick={() => updateStatus(o.id, 'dispatched')}
                              className="p-1.5 text-gray-400 hover:text-amber-600 transition-colors"
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
            <div className="md:hidden space-y-3 p-4 bg-gray-50">
              {filtered.map(o => (
                <div key={o.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{o.so_number}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{o.customers?.name}</p>
                    </div>
                    {getStatusBadge(o.status)}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span>Date: {fmtDate(o.order_date)}</span>
                    <span className="font-semibold text-gray-900">{o.currency} {Number(o.total_amount).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    <button onClick={() => router.push(`/sales/${o.id}`)}
                      className="flex-1 text-xs border border-gray-200 text-gray-600 py-1.5 rounded-lg flex items-center justify-center gap-1 hover:bg-gray-50">
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>
                    {o.status === 'draft' && (
                      <button onClick={() => updateStatus(o.id, 'confirmed')}
                        className="flex-1 text-xs bg-blue-50 text-blue-700 py-1.5 rounded-lg flex items-center justify-center gap-1 hover:bg-blue-100">
                        <CheckCircle className="w-3.5 h-3.5" /> Confirm
                      </button>
                    )}
                    {o.status === 'confirmed' && (
                      <button onClick={() => updateStatus(o.id, 'dispatched')}
                        className="flex-1 text-xs bg-amber-50 text-amber-700 py-1.5 rounded-lg flex items-center justify-center gap-1 hover:bg-amber-100">
                        <Truck className="w-3.5 h-3.5" /> Dispatch
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

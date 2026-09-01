'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Search, Eye, Truck, CheckCircle, XCircle, ClipboardCheck } from 'lucide-react'
import type { PurchaseOrder, Profile, GRN } from '@/types/database'
import ApprovalBadge from '@/components/ui/ApprovalBadge'
import { createNotification } from '@/lib/notifications'

type POWithSupplier = PurchaseOrder & { suppliers?: { name: string; country: string } | null }
type GRNWithSupplier = GRN & { suppliers?: { name: string } | null }

export default function ProcurementPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [activeTab, setActiveTab] = useState<'orders' | 'grns'>('orders')

  // ── Purchase Orders & GRN State ──────────────────────────────────────────
  const [orders, setOrders] = useState<POWithSupplier[]>([])
  const [grns, setGrns] = useState<GRNWithSupplier[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // ── Data Fetching ──────────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true)
    const supabase = createClient()
    
    const { data: ordersRes, error: ordersError } = await supabase
      .from('purchase_orders')
      .select('*, suppliers(name, country)')
      .order('created_at', { ascending: false })

    const { data: grnsRes, error: grnsError } = await supabase
      .from('grns')
      .select('*, suppliers(name)')
      .order('created_at', { ascending: false })

    if (ordersError) {
      toast.error('Failed to load purchase orders: ' + ordersError.message)
    } else {
      setOrders(ordersRes ?? [])
    }
    if (!grnsError) setGrns(grnsRes ?? [])

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
  }, [])

  // ── Helpers ────────────────────────────────────────────────────────────────
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    } catch (e) {
      return dateStr
    }
  }

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

  // ── Filtered Datasets ──────────────────────────────────────────────────────
  const filteredOrders = orders.filter(o => {
    const matchSearch = o.po_number.toLowerCase().includes(search.toLowerCase()) ||
      (o.suppliers?.name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || o.status === statusFilter
    return matchSearch && matchStatus
  })

  const canApprove = profile?.role === 'admin' || profile?.role === 'manager'

  const handleApprove = async (po: POWithSupplier) => {
    if (!canApprove) return
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

  const handleReject = async (po: POWithSupplier) => {
    if (!canApprove) return
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Procurement</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage purchase orders and goods receipt notes</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          {[
            { id: 'orders', label: 'Purchase Orders', icon: Truck },
            { id: 'grns', label: 'Goods Received Notes (GRN)', icon: ClipboardCheck }
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

        {activeTab === 'orders' ? (
          <>
            {/* Stats Cards Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[
            { label: 'Total POs', val: orders.length, color: 'text-gray-700 border-gray-200' },
            { label: 'Draft', val: orders.filter(o => o.status === 'draft').length, color: 'text-slate-600 border-slate-200' },
            { label: 'Pending POs', val: orders.filter(o => ['sent', 'partial'].includes(o.status)).length, color: 'text-amber-600 border-amber-200' },
            { label: 'Received', val: orders.filter(o => o.status === 'received').length, color: 'text-green-600 border-green-200' }
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stat.val}</p>
              </div>
              <div className={`p-2.5 rounded-lg bg-gray-50 border ${stat.color}`}>
                <Truck className="w-5 h-5" />
              </div>
            </div>
          ))}
        </div>

        {/* Search + Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search PO number or supplier..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="partial">Partial</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <button
            onClick={() => router.push('/procurement/new')}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-green-700 hover:bg-green-800 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> New PO
          </button>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">PO Number</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Supplier</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Order Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Expected Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Approval</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Amount</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-4" colSpan={7}>
                      <div className="animate-pulse h-4 bg-gray-200 rounded w-3/4" />
                    </td>
                  </tr>
                ))
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td className="px-4 py-12 text-center" colSpan={8}>
                    <div className="text-gray-400">
                      <Truck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm font-medium">No purchase orders found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-xs font-semibold text-gray-700">{order.po_number}</td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-gray-800">{order.suppliers?.name ?? '—'}</p>
                      <p className="text-xs text-gray-400">{order.suppliers?.country ?? ''}</p>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">{formatDate(order.order_date)}</td>
                    <td className="px-4 py-3.5 text-gray-600">{formatDate(order.expected_date)}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${getStatusStyle(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <ApprovalBadge status={order.approval_status} />
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-gray-800">
                      LKR {Number(order.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {canApprove && order.approval_status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprove(order)}
                              className="inline-flex items-center gap-1 px-2 py-1 border border-green-200 bg-green-50 rounded-lg text-xs font-medium text-green-700 hover:bg-green-100 transition-colors"
                              title="Approve"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(order)}
                              className="inline-flex items-center gap-1 px-2 py-1 border border-red-200 bg-red-50 rounded-lg text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
                              title="Reject"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => router.push(`/procurement/${order.id}`)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="animate-pulse h-4 bg-gray-200 rounded w-1/2" />
                <div className="animate-pulse h-4 bg-gray-200 rounded w-3/4" />
              </div>
            ))
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
              <Truck className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-medium">No purchase orders found</p>
            </div>
          ) : (
            filteredOrders.map(po => (
              <div key={po.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{po.po_number}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{po.suppliers?.name}</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${getStatusStyle(po.status)}`}>
                    {po.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">{formatDate(po.order_date)}</p>
                  <p className="text-sm font-semibold text-gray-900">LKR {Number(po.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button onClick={() => router.push(`/procurement/${po.id}`)}
                    className="flex-1 text-xs border border-gray-200 py-1.5 rounded-lg text-gray-600">
                    View
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
          </>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Recent GRNs</h2>
              <button
                onClick={() => router.push('/procurement/grn/new')}
                className="flex items-center gap-1.5 bg-green-700 hover:bg-green-800 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" /> Create GRN
              </button>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">GRN No</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Supplier</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Vehicle No</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                       <tr><td className="px-4 py-8 text-center" colSpan={5}><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700 mx-auto"></div></td></tr>
                    ) : grns.length === 0 ? (
                       <tr><td className="px-4 py-12 text-center text-gray-500 font-medium" colSpan={5}>No Goods Received Notes found</td></tr>
                    ) : (
                      grns.map(grn => (
                        <tr key={grn.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3.5 font-mono text-xs font-semibold text-gray-800">{grn.grn_number}</td>
                          <td className="px-4 py-3.5 text-sm text-gray-600">{formatDate(grn.received_date)}</td>
                          <td className="px-4 py-3.5 text-sm font-medium text-gray-900">{grn.suppliers?.name}</td>
                          <td className="px-4 py-3.5 text-sm text-gray-600">{grn.vehicle_number || '—'}</td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                              grn.status === 'QA Passed' ? 'bg-green-100 text-green-700' :
                              grn.status === 'QA Failed' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {grn.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

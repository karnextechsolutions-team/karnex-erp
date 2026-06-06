'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Search, Eye, Truck, Users, X, Star, Pencil, CheckCircle, XCircle } from 'lucide-react'
import type { Supplier, PurchaseOrder, Profile } from '@/types/database'
import ApprovalBadge from '@/components/ui/ApprovalBadge'
import { createNotification } from '@/lib/notifications'

type POWithSupplier = PurchaseOrder & { suppliers?: { name: string; country: string } | null }

export default function ProcurementPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'orders' | 'suppliers'>('orders')
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)

  // ── Tab 1: Purchase Orders State ──────────────────────────────────────────
  const [orders, setOrders] = useState<POWithSupplier[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // ── Tab 2: Suppliers State ────────────────────────────────────────────────
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierSearch, setSupplierSearch] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    country: 'Sri Lanka',
    payment_terms: 'Net 30',
    rating: 0
  })
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null)

  // ── Data Fetching ──────────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true)
    const supabase = createClient()
    const [ordersRes, suppliersRes] = await Promise.all([
      supabase
        .from('purchase_orders')
        .select('*, suppliers(name, country)')
        .order('created_at', { ascending: false }),
      supabase
        .from('suppliers')
        .select('*')
        .order('name')
    ])

    if (ordersRes.error) {
      toast.error('Failed to load purchase orders: ' + ordersRes.error.message)
    } else {
      setOrders(ordersRes.data ?? [])
    }

    if (suppliersRes.error) {
      toast.error('Failed to load suppliers: ' + suppliersRes.error.message)
    } else {
      setSuppliers(suppliersRes.data ?? [])
    }

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

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    (s.email ?? '').toLowerCase().includes(supplierSearch.toLowerCase()) ||
    (s.contact_person ?? '').toLowerCase().includes(supplierSearch.toLowerCase())
  )

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

  // ── Form Submissions ──────────────────────────────────────────────────────
  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSupplier.name) {
      toast.error('Supplier name is required')
      return
    }

    const supabase = createClient()
    const { error } = await supabase.from('suppliers').insert({
      name: newSupplier.name,
      contact_person: newSupplier.contact_person || null,
      phone: newSupplier.phone || null,
      email: newSupplier.email || null,
      address: newSupplier.address || null,
      country: newSupplier.country,
      payment_terms: newSupplier.payment_terms,
      rating: newSupplier.rating || null,
      is_active: true
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Supplier added!')
      setShowAddDialog(false)
      setNewSupplier({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        country: 'Sri Lanka',
        payment_terms: 'Net 30',
        rating: 0
      })
      fetchData()
    }
  }

  const handleEditClick = (supplier: Supplier) => {
    setEditingSupplier({
      id: supplier.id,
      name: supplier.name,
      contact_person: supplier.contact_person ?? '',
      phone: supplier.phone ?? '',
      email: supplier.email ?? '',
      address: supplier.address ?? '',
      country: supplier.country ?? 'Sri Lanka',
      payment_terms: supplier.payment_terms ?? 'Net 30',
      rating: supplier.rating ?? 0
    })
    setShowEditDialog(true)
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
        contact_person: editingSupplier.contact_person || null,
        phone: editingSupplier.phone || null,
        email: editingSupplier.email || null,
        address: editingSupplier.address || null,
        country: editingSupplier.country,
        payment_terms: editingSupplier.payment_terms,
        rating: editingSupplier.rating || null
      })
      .eq('id', editingSupplier.id)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Supplier updated successfully!')
      setShowEditDialog(false)
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
          <p className="text-sm text-gray-500 mt-0.5">Manage suppliers and purchase orders</p>
        </div>
      </div>

      {/* Tabs UI */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
        {['orders', 'suppliers'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'orders' ? '📋 Purchase Orders' : '🏢 Suppliers'}
          </button>
        ))}
      </div>

      {/* 📋 PURCHASE ORDERS TAB */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
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
        </div>
      )}

      {/* 🏢 SUPPLIERS TAB */}
      {activeTab === 'suppliers' && (
        <div className="space-y-6">
          {/* Search + Filter bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 sm:max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search suppliers by name, email..."
                value={supplierSearch}
                onChange={e => setSupplierSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              />
            </div>

            <button
              onClick={() => setShowAddDialog(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-green-700 hover:bg-green-800 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Supplier
            </button>
          </div>

          {/* Supplier Desktop Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact Person</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Country</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment Terms</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Rating</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-4" colSpan={8}>
                        <div className="animate-pulse h-4 bg-gray-200 rounded w-3/4" />
                      </td>
                    </tr>
                  ))
                ) : filteredSuppliers.length === 0 ? (
                  <tr>
                    <td className="px-4 py-12 text-center" colSpan={8}>
                      <div className="text-gray-400">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm font-medium">No suppliers found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map(supplier => (
                    <tr key={supplier.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3.5 font-semibold text-gray-800">{supplier.name}</td>
                      <td className="px-4 py-3.5 text-gray-600">{supplier.contact_person ?? '—'}</td>
                      <td className="px-4 py-3.5 text-gray-600">{supplier.phone ?? '—'}</td>
                      <td className="px-4 py-3.5 text-gray-600">{supplier.email ?? '—'}</td>
                      <td className="px-4 py-3.5 text-gray-600">{supplier.country}</td>
                      <td className="px-4 py-3.5 text-gray-600">{supplier.payment_terms}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span
                              key={i}
                              className={i < (supplier.rating ?? 0) ? 'text-amber-400 font-bold' : 'text-gray-200'}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleEditClick(supplier)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ADD SUPPLIER DIALOG ── */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-t-2xl sm:rounded-xl shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Add New Supplier</h3>
              <button
                type="button"
                onClick={() => setShowAddDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSupplier} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newSupplier.name}
                    onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                    placeholder="e.g. Acme Industries"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={newSupplier.contact_person}
                    onChange={e => setNewSupplier({ ...newSupplier, contact_person: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={newSupplier.phone}
                    onChange={e => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                    placeholder="e.g. +94 77 123 4567"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newSupplier.email}
                    onChange={e => setNewSupplier({ ...newSupplier, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                    placeholder="e.g. contact@acme.com"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={newSupplier.address}
                    onChange={e => setNewSupplier({ ...newSupplier, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                    placeholder="e.g. 123 Main Street, Colombo 03"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={newSupplier.country}
                    onChange={e => setNewSupplier({ ...newSupplier, country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={newSupplier.payment_terms}
                    onChange={e => setNewSupplier({ ...newSupplier, payment_terms: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  >
                    <option value="Net 30">Net 30</option>
                    <option value="Net 60">Net 60</option>
                    <option value="Net 90">Net 90</option>
                    <option value="Advance">Advance</option>
                    <option value="COD">COD</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Rating (0-5)
                  </label>
                  <select
                    value={newSupplier.rating}
                    onChange={e => setNewSupplier({ ...newSupplier, rating: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  >
                    {[0, 1, 2, 3, 4, 5].map(n => (
                      <option key={n} value={n}>{n} Star{n !== 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddDialog(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT SUPPLIER DIALOG ── */}
      {showEditDialog && editingSupplier && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-t-2xl sm:rounded-xl shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Edit Supplier</h3>
              <button
                type="button"
                onClick={() => setShowEditDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateSupplier} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingSupplier.name}
                    onChange={e => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={editingSupplier.contact_person}
                    onChange={e => setEditingSupplier({ ...editingSupplier, contact_person: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={editingSupplier.phone}
                    onChange={e => setEditingSupplier({ ...editingSupplier, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editingSupplier.email}
                    onChange={e => setEditingSupplier({ ...editingSupplier, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={editingSupplier.address}
                    onChange={e => setEditingSupplier({ ...editingSupplier, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={editingSupplier.country}
                    onChange={e => setEditingSupplier({ ...editingSupplier, country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={editingSupplier.payment_terms}
                    onChange={e => setEditingSupplier({ ...editingSupplier, payment_terms: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  >
                    <option value="Net 30">Net 30</option>
                    <option value="Net 60">Net 60</option>
                    <option value="Net 90">Net 90</option>
                    <option value="Advance">Advance</option>
                    <option value="COD">COD</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Rating (0-5)
                  </label>
                  <select
                    value={editingSupplier.rating}
                    onChange={e => setEditingSupplier({ ...editingSupplier, rating: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  >
                    {[0, 1, 2, 3, 4, 5].map(n => (
                      <option key={n} value={n}>{n} Star{n !== 1 ? 's' : ''}</option>
                    ))}
                  </select>
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
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

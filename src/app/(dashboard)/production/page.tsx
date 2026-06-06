'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Search, Factory, Play, CheckCircle } from 'lucide-react'

export default function ProductionPage() {
  const router = useRouter()
  const [workOrders, setWorkOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [selectedWO, setSelectedWO] = useState<any>(null)
  const [actualQty, setActualQty] = useState(0)
  const [wasteQty, setWasteQty] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchWorkOrders() }, [])

  async function fetchWorkOrders() {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('work_orders')
      .select('id, wo_number, status, planned_date, planned_qty, actual_qty, waste_qty, product_id, products(id, name, sku, unit)')
      .order('created_at', { ascending: false })
    if (error) toast.error('Failed to load: ' + error.message)
    else setWorkOrders(data ?? [])
    setLoading(false)
  }

  async function handleStart(wo: any) {
    const supabase = createClient()
    const { error } = await supabase
      .from('work_orders')
      .update({ status: 'in_progress', started_at: new Date().toISOString() })
      .eq('id', wo.id)
    if (error) toast.error(error.message)
    else { toast.success('Work order started!'); fetchWorkOrders() }
  }

  async function handleComplete() {
    if (!selectedWO) return
    setSaving(true)
    const supabase = createClient()
    const { error: woError } = await supabase
      .from('work_orders')
      .update({
        status: 'completed',
        actual_qty: actualQty,
        waste_qty: wasteQty,
        completed_at: new Date().toISOString()
      })
      .eq('id', selectedWO.id)
    if (woError) { toast.error(woError.message); setSaving(false); return }
    const netQty = actualQty - wasteQty
    if (netQty > 0) {
      const batchNumber = 'BATCH-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000)
      await supabase.from('finished_goods_stock').insert({
        product_id: selectedWO.product_id,
        work_order_id: selectedWO.id,
        batch_number: batchNumber,
        quantity: netQty,
        production_date: new Date().toISOString().split('T')[0],
      })
    }
    toast.success('Work order completed! Stock updated.')
    setShowCompleteDialog(false)
    setSelectedWO(null)
    setSaving(false)
    fetchWorkOrders()
  }

  const filtered = workOrders.filter(wo => {
    const matchSearch =
      wo.wo_number?.toLowerCase().includes(search.toLowerCase()) ||
      wo.products?.name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || wo.status === statusFilter
    return matchSearch && matchStatus
  })

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      planned: 'bg-slate-100 text-slate-600',
      in_progress: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-600',
    }
    const label: Record<string, string> = {
      planned: 'Planned',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
    }
    return (
      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
        {label[status] ?? status}
      </span>
    )
  }

  const stats = [
    { label: 'Total', value: workOrders.length },
    { label: 'Planned', value: workOrders.filter(w => w.status === 'planned').length },
    { label: 'In Progress', value: workOrders.filter(w => w.status === 'in_progress').length },
    { label: 'Completed', value: workOrders.filter(w => w.status === 'completed').length },
  ]

  const yieldPct = selectedWO && selectedWO.planned_qty > 0
    ? ((actualQty - wasteQty) / selectedWO.planned_qty * 100).toFixed(1)
    : '0'
  const yieldColor = Number(yieldPct) >= 80
    ? 'text-green-600' : Number(yieldPct) >= 60
      ? 'text-amber-600' : 'text-red-600'

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Production</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage work orders and manufacturing runs</p>
        </div>
        <button
          onClick={() => router.push('/production/new')}
          className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Work Order
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{s.label}</p>
            <p className="text-xl md:text-2xl font-semibold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Search by WO number or product..."
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
          <option value="planned">Planned</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading work orders...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Factory className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No work orders found</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">Create your first work order to get started</p>
            <button
              onClick={() => router.push('/production/new')}
              className="text-sm bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg transition-colors"
            >
              New Work Order
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['WO Number', 'Product', 'Planned Date', 'Planned Qty', 'Actual Qty', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(wo => (
                  <tr key={wo.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{wo.wo_number}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-900">{wo.products?.name ?? '—'}</p>
                      {wo.products?.sku && <p className="text-xs text-gray-400">{wo.products.sku}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {wo.planned_date
                        ? new Date(wo.planned_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {wo.planned_qty} <span className="text-gray-400 text-xs">{wo.products?.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {wo.actual_qty != null ? wo.actual_qty : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">{statusBadge(wo.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {wo.status === 'planned' && (
                          <button
                            onClick={() => handleStart(wo)}
                            className="flex items-center gap-1.5 text-xs font-medium text-green-700 border border-green-200 hover:bg-green-50 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            <Play className="w-3 h-3" /> Start
                          </button>
                        )}
                        {wo.status === 'in_progress' && (
                          <button
                            onClick={() => {
                              setSelectedWO(wo)
                              setActualQty(wo.planned_qty)
                              setWasteQty(0)
                              setShowCompleteDialog(true)
                            }}
                            className="flex items-center gap-1.5 text-xs font-medium text-blue-700 border border-blue-200 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            <CheckCircle className="w-3 h-3" /> Complete
                          </button>
                        )}
                        {(wo.status === 'completed' || wo.status === 'cancelled') && (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400 bg-white border border-gray-200 rounded-xl">Loading work orders...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center bg-white border border-gray-200 rounded-xl">
            <Factory className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No work orders found</p>
          </div>
        ) : (
          filtered.map(wo => (
            <div key={wo.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{wo.wo_number}</p>
                  <p className="text-xs text-gray-500">{wo.products?.name}</p>
                </div>
                {statusBadge(wo.status)}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
                <div><span className="text-gray-400">Planned: </span>{wo.planned_qty} {wo.products?.unit}</div>
                <div><span className="text-gray-400">Date: </span>{wo.planned_date ? new Date(wo.planned_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</div>
              </div>
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                {wo.status === 'planned' && (
                  <button onClick={() => handleStart(wo)}
                    className="flex-1 text-xs bg-green-700 text-white py-1.5 rounded-lg flex items-center justify-center gap-1">
                    <Play className="w-3 h-3" /> Start
                  </button>
                )}
                {wo.status === 'in_progress' && (
                  <button onClick={() => { setSelectedWO(wo); setShowCompleteDialog(true) }}
                    className="flex-1 text-xs bg-blue-600 text-white py-1.5 rounded-lg flex items-center justify-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Complete
                  </button>
                )}
                {(wo.status === 'completed' || wo.status === 'cancelled') && (
                  <button disabled className="flex-1 text-xs border border-gray-200 text-gray-400 py-1.5 rounded-lg cursor-not-allowed">
                    {wo.status === 'completed' ? 'Completed' : 'Cancelled'}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Complete Dialog */}
      {showCompleteDialog && selectedWO && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Complete Work Order</h2>
            <p className="text-sm text-gray-500 mb-4">
              {selectedWO.wo_number} — {selectedWO.products?.name}
            </p>

            <div className="bg-gray-50 rounded-lg p-3 mb-4 flex justify-between">
              <span className="text-sm text-gray-500">Planned quantity</span>
              <span className="text-sm font-medium text-gray-900">
                {selectedWO.planned_qty} {selectedWO.products?.unit}
              </span>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Actual Qty Produced <span className="text-red-500">*</span>
                </label>
                <input
                  type="number" min="0" step="any"
                  value={actualQty}
                  onChange={e => setActualQty(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Waste / Loss Qty
                </label>
                <input
                  type="number" min="0" step="any"
                  value={wasteQty}
                  onChange={e => setWasteQty(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-5 flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-500">Net output</p>
                <p className="text-sm font-medium text-gray-900">
                  {Math.max(0, actualQty - wasteQty).toFixed(2)} {selectedWO.products?.unit}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Yield</p>
                <p className={`text-xl font-bold ${yieldColor}`}>{yieldPct}%</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowCompleteDialog(false); setSelectedWO(null) }}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleComplete}
                disabled={saving || actualQty <= 0}
                className="flex-1 bg-green-700 hover:bg-green-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                {saving ? 'Saving...' : 'Mark Complete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
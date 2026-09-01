'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { 
  Plus, Settings, ClipboardList, CheckCircle2, 
  Trash2, X, Factory, RefreshCw
} from 'lucide-react'
import type { BOM, ProductionOrder, Product, RawMaterial } from '@/types/database'

type BOMWithDetails = BOM & { products?: { name: string } | null }
type POWithDetails = ProductionOrder & { boms?: { name: string, product_id: string, products?: { name: string } | null } | null }

export default function ProductionPage() {
  const [activeTab, setActiveTab] = useState<'boms' | 'orders'>('boms')
  const [loading, setLoading] = useState(true)

  // Data State
  const [boms, setBoms] = useState<BOMWithDetails[]>([])
  const [orders, setOrders] = useState<POWithDetails[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [materials, setMaterials] = useState<RawMaterial[]>([])

  // Modal State
  const [showBomModal, setShowBomModal] = useState(false)
  const [showOrderModal, setShowOrderModal] = useState(false)

  // BOM Form State
  const [bomProductId, setBomProductId] = useState('')
  const [bomName, setBomName] = useState('')
  const [bomItems, setBomItems] = useState([{ material_id: '', quantity_required: 0 }])

  // Order Form State
  const [orderBomId, setOrderBomId] = useState('')
  const [orderQty, setOrderQty] = useState(1)

  const fetchData = async () => {
    setLoading(true)
    const supabase = createClient()
    
    const [bomsRes, ordersRes, productsRes, materialsRes] = await Promise.all([
      supabase.from('boms').select('*, products(name)').order('created_at', { ascending: false }),
      supabase.from('production_orders').select('*, boms(name, product_id, products(name))').order('created_at', { ascending: false }),
      supabase.from('products').select('*').order('name'),
      supabase.from('raw_materials').select('*').order('name')
    ])

    if (bomsRes.data) setBoms(bomsRes.data as any)
    if (ordersRes.data) setOrders(ordersRes.data as any)
    if (productsRes.data) setProducts(productsRes.data)
    if (materialsRes.data) setMaterials(materialsRes.data)
    
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleCreateBOM = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bomProductId || !bomName) return toast.error('Product and Name are required')
    if (bomItems.length === 0 || bomItems.some(i => !i.material_id || i.quantity_required <= 0)) {
      return toast.error('Please add valid materials with quantity > 0')
    }

    const supabase = createClient()
    const { data: bom, error: bomError } = await supabase
      .from('boms')
      .insert({ product_id: bomProductId, name: bomName, status: 'Active' })
      .select()
      .single()

    if (bomError) return toast.error('Failed to create BOM: ' + bomError.message)

    const itemsToInsert = bomItems.map(i => ({
      bom_id: bom.id,
      material_id: i.material_id,
      quantity_required: i.quantity_required
    }))

    const { error: itemsError } = await supabase.from('bom_items').insert(itemsToInsert)
    if (itemsError) return toast.error('Failed to add BOM items: ' + itemsError.message)

    toast.success('BOM created successfully')
    setShowBomModal(false)
    setBomProductId('')
    setBomName('')
    setBomItems([{ material_id: '', quantity_required: 0 }])
    fetchData()
  }

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orderBomId || orderQty <= 0) return toast.error('Valid BOM and Quantity are required')

    const orderNumber = 'PR-' + Date.now().toString().slice(-6)
    const supabase = createClient()
    const { error } = await supabase
      .from('production_orders')
      .insert({
        order_number: orderNumber,
        bom_id: orderBomId,
        quantity_to_produce: orderQty,
        status: 'In Progress'
      })

    if (error) return toast.error('Failed to create production run: ' + error.message)

    toast.success('Production Run created successfully')
    setShowOrderModal(false)
    setOrderBomId('')
    setOrderQty(1)
    fetchData()
  }

  const handleCompleteOrder = async (orderId: string) => {
    const toastId = toast.loading('Verifying stock and completing production run...')
    try {
      const res = await fetch('/api/production-orders/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success(data.message, { id: toastId })
      fetchData()
    } catch (error: any) {
      toast.error(error.message, { id: toastId })
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Manufacturing & Production</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage Bill of Materials and Production Runs</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex gap-4 border-b border-gray-100 px-4 pt-2">
          <button
            onClick={() => setActiveTab('boms')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'boms' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ClipboardList className="w-4 h-4" /> Bill of Materials
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'orders' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Factory className="w-4 h-4" /> Production Runs
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'boms' ? (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex justify-end">
                <button onClick={() => setShowBomModal(true)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors">
                  <Plus className="w-4 h-4" /> Create BOM
                </button>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3">BOM Name</th>
                      <th className="px-4 py-3">Finished Product</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? <tr><td colSpan={4} className="p-4 text-center">Loading...</td></tr> : 
                     boms.length === 0 ? <tr><td colSpan={4} className="p-4 text-center text-gray-400">No Bill of Materials found</td></tr> :
                     boms.map(bom => (
                      <tr key={bom.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-gray-900">{bom.name}</td>
                        <td className="px-4 py-3">{bom.products?.name}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${bom.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                            {bom.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs">{new Date(bom.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex justify-end">
                <button onClick={() => setShowOrderModal(true)} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors">
                  <Plus className="w-4 h-4" /> New Production Run
                </button>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3">Run Number</th>
                      <th className="px-4 py-3">Recipe (BOM)</th>
                      <th className="px-4 py-3">Qty to Produce</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? <tr><td colSpan={5} className="p-4 text-center">Loading...</td></tr> : 
                     orders.length === 0 ? <tr><td colSpan={5} className="p-4 text-center text-gray-400">No Production Runs found</td></tr> :
                     orders.map(order => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono font-semibold text-gray-900">{order.order_number}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{order.boms?.name}</p>
                          <p className="text-xs text-gray-500">{order.boms?.products?.name}</p>
                        </td>
                        <td className="px-4 py-3 font-semibold">{order.quantity_to_produce}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            order.status === 'Completed' ? 'bg-green-100 text-green-700' : 
                            order.status === 'In Progress' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {order.status === 'In Progress' && (
                            <button
                              onClick={() => handleCompleteOrder(order.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-lg text-xs font-medium transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Complete Run
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BOM Modal */}
      {showBomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-500" /> Create Bill of Materials
              </h2>
              <button onClick={() => setShowBomModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form id="bom-form" onSubmit={handleCreateBOM} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Finished Product *</label>
                  <select required value={bomProductId} onChange={e => setBomProductId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="">Select Product...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">BOM Name / Recipe Name *</label>
                  <input required type="text" value={bomName} onChange={e => setBomName(e.target.value)} placeholder="e.g. Standard Recipe" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-800">Raw Materials (For 1 Unit)</h3>
                  <button type="button" onClick={() => setBomItems([...bomItems, { material_id: '', quantity_required: 0 }])} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Add Material
                  </button>
                </div>
                <div className="space-y-3">
                  {bomItems.map((item, idx) => (
                    <div key={idx} className="flex gap-3 items-end">
                      <div className="flex-1">
                        <select required value={item.material_id} onChange={e => {
                          const newItems = [...bomItems]; newItems[idx].material_id = e.target.value; setBomItems(newItems)
                        }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                          <option value="">Select Raw Material...</option>
                          {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                        </select>
                      </div>
                      <div className="w-32">
                        <input required type="number" step="0.0001" min="0.0001" value={item.quantity_required || ''} onChange={e => {
                          const newItems = [...bomItems]; newItems[idx].quantity_required = Number(e.target.value); setBomItems(newItems)
                        }} placeholder="Qty" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      </div>
                      <button type="button" onClick={() => setBomItems(bomItems.filter((_, i) => i !== idx))} disabled={bomItems.length === 1} className="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-30">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </form>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button type="button" onClick={() => setShowBomModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button type="submit" form="bom-form" className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Save BOM</button>
            </div>
          </div>
        </div>
      )}

      {/* Production Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-gray-500" /> New Production Run
              </h2>
              <button onClick={() => setShowOrderModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form id="order-form" onSubmit={handleCreateOrder} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Select BOM (Recipe) *</label>
                <select required value={orderBomId} onChange={e => setOrderBomId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">Select BOM...</option>
                  {boms.map(b => <option key={b.id} value={b.id}>{b.name} ({b.products?.name})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Quantity to Produce *</label>
                <input required type="number" min="1" step="0.01" value={orderQty || ''} onChange={e => setOrderQty(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>

              {orderBomId && orderQty > 0 && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                  <p className="text-xs font-medium text-amber-800 mb-2">Estimated Raw Materials Required:</p>
                  <ul className="text-xs text-amber-700 space-y-1">
                    {/* Simplified requirement display. In a real app we would join bom_items. */}
                    <li>This will deduct required items from stock upon completion. Ensure you have enough inventory.</li>
                  </ul>
                </div>
              )}
            </form>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button type="button" onClick={() => setShowOrderModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button type="submit" form="order-form" className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">Start Run</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
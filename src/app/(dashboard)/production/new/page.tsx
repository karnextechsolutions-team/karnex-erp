'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Search, ArrowLeft, X, AlertTriangle, Loader2, Factory } from 'lucide-react'

interface Product {
  id: string
  name: string
  sku: string | null
  unit: string
}

interface BOMItem {
  id: string
  material_id: string
  quantity_required: number
  raw_materials: {
    id: string
    name: string
    unit: string
    code: string | null
  }
}

export default function NewWorkOrderPage() {
  const router = useRouter()
  const supabase = createClient()

  // ── States ─────────────────────────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([])
  const [bom, setBom] = useState<BOMItem[]>([])
  const [stockLevels, setStockLevels] = useState<Record<string, number>>({})
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchingProducts, setFetchingProducts] = useState(true)

  // Product combobox
  const [productSearch, setProductSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showProductDropdown, setShowProductDropdown] = useState(false)

  // Form inputs
  const [plannedDate, setPlannedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [plannedQty, setPlannedQty] = useState(1)
  const [notes, setNotes] = useState('')

  // ── Fetch active products on mount ─────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setFetchingProducts(true)
      const [{ data: productsData }, { data: authData }] = await Promise.all([
        supabase
          .from('products')
          .select('id, name, sku, unit')
          .eq('is_active', true)
          .order('name'),
        supabase.auth.getUser()
      ])
      setProducts((productsData as Product[]) ?? [])
      setUserId(authData.user?.id ?? null)
      setFetchingProducts(false)
    }
    load()
  }, [])

  // ── Fetch BOM + stock levels when product is selected ───────────────────────
  useEffect(() => {
    if (!selectedProduct) {
      setBom([])
      setStockLevels({})
      return
    }

    const productId = selectedProduct.id

    async function fetchBOMAndStock() {
      const { data: bomData } = await supabase
        .from('bill_of_materials')
        .select('*, raw_materials(id, name, unit, code)')
        .eq('product_id', productId)

      const materialIds = bomData?.map((b: any) => b.material_id) ?? []
      
      if (materialIds.length === 0) {
        setBom([])
        setStockLevels({})
        return
      }

      // Get stock for each material
      const { data: stockData } = await supabase
        .from('inventory_stock')
        .select('material_id, quantity')
        .in('material_id', materialIds)

      // Sum stock per material
      const stockMap: Record<string, number> = {}
      stockData?.forEach((s: any) => {
        stockMap[s.material_id] = (stockMap[s.material_id] ?? 0) + s.quantity
      })

      setBom((bomData as BOMItem[]) ?? [])
      setStockLevels(stockMap)
    }

    fetchBOMAndStock()
  }, [selectedProduct])

  // ── Derived values ─────────────────────────────────────────────────────────
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.sku ?? '').toLowerCase().includes(productSearch.toLowerCase())
  )

  const countSufficient = bom.filter(item => {
    const available = stockLevels[item.material_id] ?? 0
    const needed = item.quantity_required * plannedQty
    return available >= needed
  }).length

  const hasShortage = bom.length > 0 && countSufficient < bom.length

  // Date formatter
  const formatDisplayDate = (dateStr: string) => {
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

  // ── Submit handler ─────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct) { toast.error('Please select a product'); return }
    if (!plannedDate) { toast.error('Please set a planned date'); return }
    if (plannedQty <= 0) { toast.error('Planned quantity must be greater than 0'); return }
    if (!userId) { toast.error('Session error — please refresh'); return }

    setLoading(true)

    const woNumber = 'WO-' + new Date().getFullYear().toString().slice(-2) +
      '-' + Math.floor(1000 + Math.random() * 9000)

    const { error } = await supabase.from('work_orders').insert({
      wo_number: woNumber,
      product_id: selectedProduct.id,
      created_by: userId,
      planned_date: plannedDate,
      planned_qty: plannedQty,
      status: 'planned',
      notes: notes || null
    })

    if (error) {
      toast.error('Failed to create work order: ' + error.message)
      setLoading(false)
      return
    }

    toast.success(`${woNumber} created successfully!`)
    router.push('/production')
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (fetchingProducts) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">New Work Order</h1>
          <p className="text-sm text-gray-500 mt-0.5">Plan a production run and verify material availability</p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/production')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Column: Form + BOM Table */}
        <div className="flex-1 space-y-5 w-full">
          {/* Work Order Details Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Work Order Details</h2>

            {/* Product combobox */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Product <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  placeholder="Search and select product..."
                  value={selectedProduct ? selectedProduct.name : productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value)
                    setSelectedProduct(null)
                    setShowProductDropdown(true)
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                  autoComplete="off"
                />
                {selectedProduct && (
                  <button
                    type="button"
                    onClick={() => { setSelectedProduct(null); setProductSearch('') }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {showProductDropdown && !selectedProduct && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-52 overflow-y-auto">
                  {filteredProducts.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-400">No products found</div>
                  ) : (
                    filteredProducts.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-4 py-2.5 hover:bg-green-50 transition-colors border-b border-gray-50 last:border-0"
                        onClick={() => {
                          setSelectedProduct(p)
                          setProductSearch('')
                          setShowProductDropdown(false)
                        }}
                      >
                        <p className="text-sm font-medium text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">SKU: {p.sku ?? '—'} · Unit: {p.unit}</p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Dates & Qty */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Planned Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={plannedDate}
                  onChange={e => setPlannedDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Planned Quantity <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min="0.001"
                    step="any"
                    required
                    value={plannedQty}
                    onChange={e => setPlannedQty(parseFloat(e.target.value) || 0)}
                    className="w-full pl-3 pr-14 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  {selectedProduct && (
                    <span className="absolute right-3 text-xs text-gray-400 pointer-events-none">
                      {selectedProduct.unit}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Special instructions or remarks…"
                rows={3}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>
          </div>

          {/* Bill of Materials Card */}
          {selectedProduct && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  Bill of Materials — {selectedProduct.name}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Required materials for {plannedQty} {selectedProduct.unit}
                </p>
              </div>

              {bom.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">
                  No materials defined for this product in the Bill of Materials.
                </p>
              ) : (
                <div className="space-y-4">
                  {/* Warning Banner */}
                  {hasShortage && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2 items-start">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-700">
                        Some materials have insufficient stock. You can still create the work order but production may be blocked.
                      </p>
                    </div>
                  )}

                  <>
                    <div className="hidden md:block border border-gray-200 rounded-lg overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          <tr>
                            <th className="px-4 py-2 text-left">Material</th>
                            <th className="px-4 py-2 text-left">Unit</th>
                            <th className="px-4 py-2 text-right">Required/Unit</th>
                            <th className="px-4 py-2 text-right">Total Required</th>
                            <th className="px-4 py-2 text-right">In Stock</th>
                            <th className="px-4 py-2 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {bom.map(bomItem => {
                            const available = stockLevels[bomItem.material_id] ?? 0
                            const needed = bomItem.quantity_required * plannedQty
                            const isSufficient = available >= needed

                            return (
                              <tr key={bomItem.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-800">
                                  {bomItem.raw_materials.name}
                                </td>
                                <td className="px-4 py-3 text-gray-600">
                                  {bomItem.raw_materials.unit}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-600">
                                  {bomItem.quantity_required}
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-gray-800">
                                  {needed.toFixed(3)}
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-gray-800">
                                  {available.toFixed(3)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {isSufficient ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                                      ✓ Sufficient
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                                      ✗ Short by {(needed - available).toFixed(2)}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="md:hidden space-y-3">
                      {bom.map(bomItem => {
                        const available = stockLevels[bomItem.material_id] ?? 0
                        const needed = bomItem.quantity_required * plannedQty
                        const isSufficient = available >= needed
                        
                        return (
                          <div key={bomItem.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-medium text-sm text-gray-900">{bomItem.raw_materials.name}</span>
                              {isSufficient ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
                                  ✓ Sufficient
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                                  ✗ Short by {(needed - available).toFixed(2)}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div><span className="text-gray-500">Unit:</span> {bomItem.raw_materials.unit}</div>
                              <div><span className="text-gray-500">Req/Unit:</span> {bomItem.quantity_required}</div>
                              <div><span className="text-gray-500">Total Req:</span> <span className="font-medium text-gray-900">{needed.toFixed(3)}</span></div>
                              <div><span className="text-gray-500">In Stock:</span> <span className="font-medium text-gray-900">{available.toFixed(3)}</span></div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Order Summary sticky */}
        <div className="w-full lg:w-72 shrink-0 lg:sticky top-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Order Summary</h2>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Product</span>
                <span className="font-medium text-gray-800 text-right max-w-32 truncate">
                  {selectedProduct?.name ?? '—'}
                </span>
              </div>

              <div className="flex justify-between text-gray-500">
                <span>Planned Qty</span>
                <span className="font-medium text-gray-800 text-right">
                  {plannedQty} {selectedProduct?.unit ?? ''}
                </span>
              </div>

              <div className="flex justify-between text-gray-500">
                <span>Planned Date</span>
                <span className="font-medium text-gray-800 text-right">
                  {formatDisplayDate(plannedDate)}
                </span>
              </div>

              <div className="flex justify-between text-gray-500">
                <span>BOM Items</span>
                <span className="font-medium text-gray-800 text-right">
                  {bom.length}
                </span>
              </div>

              <div className="flex justify-between text-gray-500">
                <span>Materials OK</span>
                <span className="font-medium text-gray-800 text-right">
                  {countSufficient} / {bom.length}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !userId}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Factory className="w-4 h-4" />
                  Create Work Order
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => router.back()}
              className="w-full text-sm text-gray-500 hover:text-gray-800 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
            >
              Cancel
            </button>

            <p className="text-xs text-gray-400 text-center">
              <span className="inline-block w-2 h-2 rounded-full bg-slate-400 mr-1.5 align-middle" />
              Will be saved as <span className="font-medium text-gray-600">Planned</span>
            </p>
          </div>
        </div>
      </div>
    </form>
  )
}
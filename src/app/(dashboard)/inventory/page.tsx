'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Search, Plus, Package, AlertTriangle, X, Warehouse } from 'lucide-react'

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<'raw'|'finished'>('raw')
  const [rawStock, setRawStock] = useState<any[]>([])
  const [finishedStock, setFinishedStock] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addType, setAddType] = useState<'raw'|'finished'>('raw')
  const [materials, setMaterials] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [userId, setUserId] = useState<string|null>(null)

  // Add stock form
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [itemSearch, setItemSearch] = useState('')
  const [showItemDropdown, setShowItemDropdown] = useState(false)
  const [quantity, setQuantity] = useState(0)
  const [batchNumber, setBatchNumber] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [location, setLocation] = useState('')
  const [saving, setSaving] = useState(false)

  async function fetchAll() {
    setLoading(true)
    const supabase = createClient()
    const [
      { data: rawData },
      { data: finData },
      { data: matsData },
      { data: prodsData },
      { data: { user } }
    ] = await Promise.all([
      supabase.from('inventory_stock')
        .select('*, raw_materials(name, code, unit, reorder_point, category)')
        .order('created_at', { ascending: false }),
      supabase.from('finished_goods_stock')
        .select('*, products(name, sku, unit)')
        .order('created_at', { ascending: false }),
      supabase.from('raw_materials').select('id,name,code,unit').eq('is_active',true).order('name'),
      supabase.from('products').select('id,name,sku,unit').eq('is_active',true).order('name'),
      supabase.auth.getUser()
    ])
    setRawStock(rawData ?? [])
    setFinishedStock(finData ?? [])
    setMaterials(matsData ?? [])
    setProducts(prodsData ?? [])
    setUserId(user?.id ?? null)
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  // Stats
  const totalRawItems = rawStock.length
  const lowStockItems = rawStock.filter(s =>
    s.quantity < (s.raw_materials?.reorder_point ?? 0)
  ).length
  const totalFinishedItems = finishedStock.length

  // Filters
  const filteredRaw = rawStock.filter(s =>
    (s.raw_materials?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (s.batch_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (s.location ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (s.raw_materials?.category ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const filteredFinished = finishedStock.filter(s =>
    (s.products?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (s.products?.sku ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (s.batch_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (s.location ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const filteredItems = addType === 'raw'
    ? materials.filter(m => 
        m.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
        (m.code ?? '').toLowerCase().includes(itemSearch.toLowerCase())
      )
    : products.filter(p =>
        p.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
        (p.sku ?? '').toLowerCase().includes(itemSearch.toLowerCase())
      )

  // Helpers
  const renderExpiry = (expiryStr: string | null) => {
    if (!expiryStr) return <span className="text-gray-400">—</span>
    
    const expDate = new Date(expiryStr)
    const today = new Date()
    today.setHours(0,0,0,0)
    const diffTime = expDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    const formatted = expDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    
    if (diffDays < 0) return <span className="text-red-600 font-medium">{formatted} (Expired)</span>
    if (diffDays <= 30) return <span className="text-amber-600 font-medium">{formatted}</span>
    return <span className="text-gray-600">{formatted}</span>
  }

  const renderStatus = (item: any) => {
    const reorderPoint = item.raw_materials?.reorder_point ?? 0
    if (item.quantity <= 0) {
      return <span className="inline-flex px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">Out of Stock</span>
    } else if (item.quantity < reorderPoint) {
      return <span className="inline-flex px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">Low Stock</span>
    } else {
      return <span className="inline-flex px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">OK</span>
    }
  }

  const closeDialog = () => {
    setShowAddDialog(false)
    setSelectedItem(null)
    setItemSearch('')
    setQuantity(0)
    setBatchNumber('')
    setExpiryDate('')
    setLocation('')
    setSaving(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItem) { toast.error('Please select an item'); return }
    if (quantity < 0) { toast.error('Quantity must be positive'); return }
    
    setSaving(true)
    const supabase = createClient()

    if (addType === 'raw') {
      const { error } = await supabase.from('inventory_stock').insert({
        material_id: selectedItem.id,
        batch_number: batchNumber || null,
        quantity: quantity,
        expiry_date: expiryDate || null,
        location: location || null,
      })
      if (!error) {
        await supabase.from('stock_movements').insert({
          material_id: selectedItem.id,
          movement_type: 'in',
          quantity: quantity,
          reference_type: 'manual',
          created_by: userId,
          notes: 'Manual stock entry'
        })
        toast.success('Stock added successfully!')
        fetchAll()
        closeDialog()
      } else {
        toast.error('Failed to add stock: ' + error.message)
        setSaving(false)
      }
    } else {
      const { error } = await supabase.from('finished_goods_stock').insert({
        product_id: selectedItem.id,
        batch_number: batchNumber || null,
        quantity: quantity,
        production_date: new Date().toISOString().split('T')[0],
        expiry_date: expiryDate || null,
        location: location || null,
      })
      if (!error) {
        toast.success('Finished goods stock added!')
        fetchAll()
        closeDialog()
      } else {
        toast.error('Failed to add finished goods: ' + error.message)
        setSaving(false)
      }
    }
  }

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track raw materials and finished goods stock</p>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Stock
        </button>
      </div>

      {/* SUMMARY STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Raw Materials In Stock</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{totalRawItems}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Package className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Low Stock Alerts</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{lowStockItems}</p>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Finished Goods</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{totalFinishedItems}</p>
          </div>
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <Package className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* TABS & SEARCH */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('raw')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'raw' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Raw Materials
          </button>
          <button
            onClick={() => setActiveTab('finished')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'finished' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Finished Goods
          </button>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Search stock..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* DATA TABLES */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading inventory...</div>
        ) : activeTab === 'raw' ? (
          filteredRaw.length === 0 ? (
            <div className="p-12 text-center">
              <Warehouse className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No stock entries yet</p>
              <button
                onClick={() => { setAddType('raw'); setShowAddDialog(true); }}
                className="mt-3 text-sm bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Add First Stock Entry
              </button>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                    <tr>
                      <th className="px-4 py-3">Material</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Batch</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                      <th className="px-4 py-3">Unit</th>
                      <th className="px-4 py-3">Expiry</th>
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRaw.map(s => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{s.raw_materials?.name}</p>
                          <p className="text-xs text-gray-400 font-mono">{s.raw_materials?.code}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{s.raw_materials?.category || '—'}</td>
                        <td className="px-4 py-3 font-mono text-gray-500">{s.batch_number || '—'}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">{s.quantity}</td>
                        <td className="px-4 py-3 text-gray-500">{s.raw_materials?.unit}</td>
                        <td className="px-4 py-3">{renderExpiry(s.expiry_date)}</td>
                        <td className="px-4 py-3 text-gray-600">{s.location || '—'}</td>
                        <td className="px-4 py-3 text-center">{renderStatus(s)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden space-y-3 p-4 bg-gray-50">
                {filteredRaw.map(s => (
                  <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{s.raw_materials?.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{s.raw_materials?.code}</p>
                      </div>
                      {renderStatus(s)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mt-3 pt-3 border-t border-gray-50">
                      <div><span className="text-gray-400">Qty: </span><span className="font-medium text-gray-900">{s.quantity}</span> {s.raw_materials?.unit}</div>
                      <div><span className="text-gray-400">Batch: </span>{s.batch_number || '—'}</div>
                      <div><span className="text-gray-400">Location: </span>{s.location || '—'}</div>
                      <div><span className="text-gray-400">Expiry: </span>{renderExpiry(s.expiry_date)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )
        ) : (
          filteredFinished.length === 0 ? (
            <div className="p-12 text-center">
              <Warehouse className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No stock entries yet</p>
              <button
                onClick={() => { setAddType('finished'); setShowAddDialog(true); }}
                className="mt-3 text-sm bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Add First Stock Entry
              </button>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                    <tr>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3">Batch</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                      <th className="px-4 py-3">Unit</th>
                      <th className="px-4 py-3">Production Date</th>
                      <th className="px-4 py-3">Expiry</th>
                      <th className="px-4 py-3">Location</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredFinished.map(s => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{s.products?.name}</td>
                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">{s.products?.sku || '—'}</td>
                        <td className="px-4 py-3 font-mono text-gray-500">{s.batch_number || '—'}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">{s.quantity}</td>
                        <td className="px-4 py-3 text-gray-500">{s.products?.unit}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {s.production_date ? new Date(s.production_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td className="px-4 py-3">{renderExpiry(s.expiry_date)}</td>
                        <td className="px-4 py-3 text-gray-600">{s.location || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden space-y-3 p-4 bg-gray-50">
                {filteredFinished.map(s => (
                  <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{s.products?.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{s.products?.sku || '—'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mt-3 pt-3 border-t border-gray-50">
                      <div><span className="text-gray-400">Qty: </span><span className="font-medium text-gray-900">{s.quantity}</span> {s.products?.unit}</div>
                      <div><span className="text-gray-400">Batch: </span>{s.batch_number || '—'}</div>
                      <div><span className="text-gray-400">Prod Date: </span>{s.production_date ? new Date(s.production_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</div>
                      <div><span className="text-gray-400">Expiry: </span>{renderExpiry(s.expiry_date)}</div>
                      <div className="col-span-2"><span className="text-gray-400">Location: </span>{s.location || '—'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )
        )}
      </div>

      {/* ADD STOCK DIALOG */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Add Stock Entry</h2>
              <button onClick={closeDialog} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex gap-2 mb-4">
              <button 
                onClick={() => { setAddType('raw'); setSelectedItem(null); setItemSearch(''); setShowItemDropdown(false) }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  addType === 'raw'
                    ? 'bg-green-700 text-white border-green-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Raw Material
              </button>
              <button 
                onClick={() => { setAddType('finished'); setSelectedItem(null); setItemSearch(''); setShowItemDropdown(false) }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  addType === 'finished'
                    ? 'bg-green-700 text-white border-green-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Finished Good
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Item *</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                    placeholder={`Search ${addType === 'raw' ? 'materials' : 'products'}...`}
                    value={selectedItem ? selectedItem.name : itemSearch}
                    onChange={(e) => {
                      setItemSearch(e.target.value)
                      setSelectedItem(null)
                      setShowItemDropdown(true)
                    }}
                    onFocus={() => setShowItemDropdown(true)}
                    autoComplete="off"
                  />
                  {selectedItem && (
                    <button
                      type="button"
                      onClick={() => { setSelectedItem(null); setItemSearch('') }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {showItemDropdown && !selectedItem && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-52 overflow-y-auto">
                    {filteredItems.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-400">No items found</div>
                    ) : (
                      filteredItems.map(item => (
                        <button
                          key={item.id} type="button"
                          className="w-full text-left px-4 py-2.5 hover:bg-green-50 transition-colors border-b border-gray-50 last:border-0"
                          onClick={() => { setSelectedItem(item); setItemSearch(''); setShowItemDropdown(false) }}
                        >
                          <p className="text-sm font-medium text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {addType === 'raw' ? 'Code: ' : 'SKU: '}{item.code || item.sku || '—'} · Unit: {item.unit}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity *</label>
                  <div className="relative">
                    <input
                      type="number" min="0.001" step="any" required
                      value={quantity}
                      onChange={e => setQuantity(parseFloat(e.target.value) || 0)}
                      className="w-full pl-3 pr-12 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    {selectedItem && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
                        {selectedItem.unit}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Batch Number</label>
                  <input
                    type="text"
                    value={batchNumber}
                    onChange={e => setBatchNumber(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Expiry Date</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={e => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Warehouse A, Shelf 3"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 mt-6 border-t border-gray-100">
                <button type="button" onClick={closeDialog} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 bg-green-700 hover:bg-green-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
                  {saving ? 'Saving...' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

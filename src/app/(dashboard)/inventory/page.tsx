'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Search, Plus, Package, AlertTriangle, X, Warehouse, Edit2, Power } from 'lucide-react'

export default function InventoryPage() {
  const [mainTab, setMainTab] = useState<'stock' | 'materials' | 'products' | 'consumables_dir'>('stock')
  const [stockTab, setStockTab] = useState<'raw' | 'finished' | 'consumables'>('raw')
  
  const [rawStock, setRawStock] = useState<any[]>([])
  const [finishedStock, setFinishedStock] = useState<any[]>([])
  const [materials, setMaterials] = useState<any[]>([]) // Active only, for stock forms
  const [products, setProducts] = useState<any[]>([])   // Active only, for stock forms
  
  // Management lists (includes inactive)
  const [allMaterials, setAllMaterials] = useState<any[]>([])
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])

  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [matSearch, setMatSearch] = useState('')
  const [prodSearch, setProdSearch] = useState('')
  const [consumableDirSearch, setConsumableDirSearch] = useState('')

  // Add Stock Dialog State
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addType, setAddType] = useState<'raw' | 'finished'>('raw')
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [itemSearch, setItemSearch] = useState('')
  const [showItemDropdown, setShowItemDropdown] = useState(false)
  const [quantity, setQuantity] = useState(0)
  const [batchNumber, setBatchNumber] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [location, setLocation] = useState('')
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Raw Materials Management State
  const [showAddMat, setShowAddMat] = useState(false)
  const [editMat, setEditMat] = useState<any>(null)
  const [matForm, setMatForm] = useState({
    name: '', code: '', category: '', unit: 'kg', reorder_point: 0
  })

  // Products Management State
  const [showAddProd, setShowAddProd] = useState(false)
  const [editProd, setEditProd] = useState<any>(null)
  const [prodForm, setProdForm] = useState({
    name: '', sku: '', category: '', unit: 'kg',
    selling_price: 0, cost_price: 0, description: ''
  })

  // Consumables State
  const [showReceiveConsumable, setShowReceiveConsumable] = useState(false)
  const [consumableForm, setConsumableForm] = useState({
    item_id: '', quantity: '', unit_cost: '', supplier_id: '', remarks: ''
  })

  // Consumables Directory State
  const [showAddConsumableDir, setShowAddConsumableDir] = useState(false)
  const [consumableDirForm, setConsumableDirForm] = useState({
    name: '', code: '', unit: 'pcs', initial_quantity: ''
  })

  async function fetchAll() {
    setLoading(true)
    const supabase = createClient()
    const [
      { data: rawData },
      { data: finData },
      { data: matsData },
      { data: prodsData },
      { data: allMatsData },
      { data: allProdsData },
      { data: suppliersData },
      { data: { user } }
    ] = await Promise.all([
      supabase.from('inventory_stock')
        .select('*, raw_materials(name, code, unit, reorder_point, category)')
        .order('created_at', { ascending: false }),
      supabase.from('finished_goods_stock')
        .select('*, products(name, sku, unit)')
        .order('created_at', { ascending: false }),
      supabase.from('raw_materials').select('id,name,code,unit').eq('is_active', true).order('name'),
      supabase.from('products').select('id,name,sku,unit').eq('is_active', true).order('name'),
      supabase.from('raw_materials').select('*').order('name'),
      supabase.from('products').select('*').order('name'),
      supabase.from('suppliers').select('id, name').order('name'),
      supabase.auth.getUser()
    ])
    
    setRawStock(rawData ?? [])
    setFinishedStock(finData ?? [])
    setMaterials(matsData ?? [])
    setProducts(prodsData ?? [])
    setAllMaterials(allMatsData ?? [])
    setAllProducts(allProdsData ?? [])
    setSuppliers(suppliersData ?? [])
    setUserId(user?.id ?? null)
    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
  }, [])

  // Stats
  const totalRawItems = rawStock.length
  const lowStockItems = rawStock.filter(s =>
    s.quantity < (s.raw_materials?.reorder_point ?? 0)
  ).length
  const totalFinishedItems = finishedStock.length

  // Stock Filters
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

  const filteredConsumables = materials.filter(m => 
    m.category === 'Consumable' && 
    (m.name.toLowerCase().includes(search.toLowerCase()) || 
    (m.code ?? '').toLowerCase().includes(search.toLowerCase()))
  )

  const filteredConsumablesDir = allMaterials.filter(m => 
    m.category === 'Consumable' && 
    (m.name.toLowerCase().includes(consumableDirSearch.toLowerCase()) || 
    (m.code ?? '').toLowerCase().includes(consumableDirSearch.toLowerCase()))
  )

  // Material / Product Form Dropdowns Filters
  const filteredItems = addType === 'raw'
    ? materials.filter(m => 
        m.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
        (m.code ?? '').toLowerCase().includes(itemSearch.toLowerCase())
      )
    : products.filter(p =>
        p.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
        (p.sku ?? '').toLowerCase().includes(itemSearch.toLowerCase())
      )

  // Raw Materials List Filters
  const filteredAllMats = allMaterials.filter(m =>
    m.name.toLowerCase().includes(matSearch.toLowerCase()) ||
    (m.code ?? '').toLowerCase().includes(matSearch.toLowerCase()) ||
    (m.category ?? '').toLowerCase().includes(matSearch.toLowerCase())
  )

  // Products List Filters
  const filteredAllProds = allProducts.filter(p =>
    p.name.toLowerCase().includes(prodSearch.toLowerCase()) ||
    (p.sku ?? '').toLowerCase().includes(prodSearch.toLowerCase()) ||
    (p.category ?? '').toLowerCase().includes(prodSearch.toLowerCase())
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

  // --- SAVE ACTIONS ---
  const handleSaveStock = async (e: React.FormEvent) => {
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

  const handleReceiveConsumable = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!consumableForm.item_id || !consumableForm.quantity || !consumableForm.unit_cost) {
      return toast.error('Missing required fields')
    }
    setSaving(true)
    try {
      const res = await fetch('/api/inventory/consumables/receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: consumableForm.item_id,
          supplier_id: consumableForm.supplier_id || null,
          received_qty: consumableForm.quantity,
          unit_cost: consumableForm.unit_cost,
          remarks: consumableForm.remarks
        })
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Consumables received successfully!')
      setShowReceiveConsumable(false)
      setConsumableForm({ item_id: '', quantity: '', unit_cost: '', supplier_id: '', remarks: '' })
      fetchAll()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!matForm.name) { toast.error('Name is required'); return }
    if (!matForm.unit) { toast.error('Unit is required'); return }
    
    const supabase = createClient()
    if (editMat) {
      const { error } = await supabase.from('raw_materials').update({...matForm}).eq('id', editMat.id)
      if (error) toast.error(error.message)
      else { toast.success('Material updated!'); fetchAll(); setShowAddMat(false) }
    } else {
      const { error } = await supabase.from('raw_materials').insert({
        name: matForm.name, code: matForm.code || null,
        category: matForm.category || null, unit: matForm.unit,
        reorder_point: matForm.reorder_point, is_active: true
      })
      if (error) toast.error(error.message)
      else { toast.success('Material added!'); fetchAll(); setShowAddMat(false) }
    }
  }

  const handleSaveConsumableDir = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!consumableDirForm.name) { toast.error('Name is required'); return }
    if (!consumableDirForm.unit) { toast.error('Unit is required'); return }
    
    const supabase = createClient()
    const { data, error } = await supabase.from('raw_materials').insert({
      name: consumableDirForm.name, 
      code: consumableDirForm.code || null,
      category: 'Consumable', 
      unit: consumableDirForm.unit,
      reorder_point: 0, 
      is_active: true
    }).select().single()
    
    if (error) { toast.error(error.message); return }
    
    const qty = parseFloat(consumableDirForm.initial_quantity)
    if (!isNaN(qty) && qty > 0) {
      const { error: stockErr } = await supabase.from('inventory_stock').insert({
        material_id: data.id,
        quantity: qty
      })
      if (!stockErr) {
        await supabase.from('stock_movements').insert({
          material_id: data.id,
          movement_type: 'in',
          quantity: qty,
          reference_type: 'manual',
          created_by: userId,
          notes: 'Initial stock entry'
        })
      }
    }
    
    toast.success('Consumable Item added!')
    fetchAll()
    setShowAddConsumableDir(false)
    setConsumableDirForm({ name: '', code: '', unit: 'pcs', initial_quantity: '' })
  }

  const handleToggleMaterial = async (m: any) => {
    const supabase = createClient()
    const { error } = await supabase.from('raw_materials').update({ is_active: !m.is_active }).eq('id', m.id)
    if (error) toast.error(error.message)
    else { toast.success('Status updated!'); fetchAll() }
  }

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prodForm.name) { toast.error('Name is required'); return }
    if (!prodForm.unit) { toast.error('Unit is required'); return }
    
    const supabase = createClient()
    if (editProd) {
      const { error } = await supabase.from('products').update({...prodForm}).eq('id', editProd.id)
      if (error) toast.error(error.message)
      else { toast.success('Product updated!'); fetchAll(); setShowAddProd(false) }
    } else {
      const { error } = await supabase.from('products').insert({
        name: prodForm.name, sku: prodForm.sku || null,
        category: prodForm.category || null, unit: prodForm.unit,
        selling_price: prodForm.selling_price, cost_price: prodForm.cost_price,
        description: prodForm.description || null, is_active: true
      })
      if (error) toast.error(error.message)
      else { toast.success('Product added!'); fetchAll(); setShowAddProd(false) }
    }
  }

  const handleToggleProduct = async (p: any) => {
    const supabase = createClient()
    const { error } = await supabase.from('products').update({ is_active: !p.is_active }).eq('id', p.id)
    if (error) toast.error(error.message)
    else { toast.success('Status updated!'); fetchAll() }
  }

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track stock levels, manage raw materials, and finished products</p>
        </div>
      </div>

      {/* TOP NAVIGATION TABS */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto mb-6 scrollbar-none -mx-4 px-4 md:mx-0 md:px-0 shadow-sm">
        {[
          { key: 'stock', label: 'Stock Levels' },
          { key: 'materials', label: 'Raw Materials Directory' },
          { key: 'products', label: 'Products Directory' },
          { key: 'consumables_dir', label: 'Consumables Directory' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setMainTab(tab.key as any)}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all whitespace-nowrap ${
              mainTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ TAB 1: STOCK LEVELS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {mainTab === 'stock' && (
        <div className="space-y-6">
          {/* SUMMARY STATS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Raw Materials In Stock</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{totalRawItems}</p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <Package className="w-6 h-6" />
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Low Stock Alerts</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{lowStockItems}</p>
              </div>
              <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Finished Goods</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{totalFinishedItems}</p>
              </div>
              <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                <Package className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* SUB-TABS & SEARCH */}
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
              <button
                onClick={() => setStockTab('raw')}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                  stockTab === 'raw' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Raw Materials Stock
              </button>
              <button
                onClick={() => setStockTab('finished')}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                  stockTab === 'finished' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Finished Goods Stock
              </button>
              <button
                onClick={() => setStockTab('consumables')}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                  stockTab === 'consumables' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Consumables Stock
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Search stock..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              {stockTab === 'consumables' ? (
                <button
                  onClick={() => setShowReceiveConsumable(true)}
                  className="bg-purple-700 hover:bg-purple-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" /> Receive Consumables
                </button>
              ) : (
                <button
                  onClick={() => setShowAddDialog(true)}
                  className="bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" /> Add Stock
                </button>
              )}
            </div>
          </div>

          {/* DATA TABLES */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="p-8 text-center text-sm text-gray-400">Loading inventory...</div>
            ) : stockTab === 'raw' ? (
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
                          <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-semibold text-gray-900">{s.raw_materials?.name}</p>
                              <p className="text-xs text-gray-400 font-mono">{s.raw_materials?.code}</p>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{s.raw_materials?.category || '—'}</td>
                            <td className="px-4 py-3 font-mono text-gray-500">{s.batch_number || '—'}</td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900">{s.quantity}</td>
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
                          <div><span className="text-gray-400">Qty: </span><span className="font-semibold text-gray-900">{s.quantity}</span> {s.raw_materials?.unit}</div>
                          <div><span className="text-gray-400">Batch: </span>{s.batch_number || '—'}</div>
                          <div><span className="text-gray-400">Location: </span>{s.location || '—'}</div>
                          <div><span className="text-gray-400">Expiry: </span>{renderExpiry(s.expiry_date)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )
            ) : stockTab === 'finished' ? (
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
                          <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-semibold text-gray-900">{s.products?.name}</td>
                            <td className="px-4 py-3 text-xs text-gray-400 font-mono">{s.products?.sku || '—'}</td>
                            <td className="px-4 py-3 font-mono text-gray-500">{s.batch_number || '—'}</td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900">{s.quantity}</td>
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
                          <div><span className="text-gray-400">Qty: </span><span className="font-semibold text-gray-900">{s.quantity}</span> {s.products?.unit}</div>
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
            ) : stockTab === 'consumables' ? (
              filteredConsumables.length === 0 ? (
                <div className="p-12 text-center">
                  <Warehouse className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No consumables found in stock.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                      <tr>
                        <th className="px-4 py-3">Consumable Name</th>
                        <th className="px-4 py-3">Code</th>
                        <th className="px-4 py-3 text-right">In Stock Qty</th>
                        <th className="px-4 py-3">Unit</th>
                        <th className="px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredConsumables.map(c => (
                        <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-gray-900">{c.name}</td>
                          <td className="px-4 py-3 font-mono text-gray-500">{c.code || '—'}</td>
                          <td className="px-4 py-3 text-right font-semibold text-purple-700">{c.quantity_in_stock || 0}</td>
                          <td className="px-4 py-3 text-gray-500">{c.unit}</td>
                          <td className="px-4 py-3 text-center">
                            {(c.quantity_in_stock || 0) <= 0 
                              ? <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">Out of Stock</span>
                              : <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Available</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : null}
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ TAB 2: RAW MATERIALS DIRECTORY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {mainTab === 'materials' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Search materials by name or code..."
                value={matSearch}
                onChange={e => setMatSearch(e.target.value)}
              />
            </div>
            <button
              onClick={() => {
                setEditMat(null)
                setMatForm({ name: '', code: '', category: '', unit: 'kg', reorder_point: 0 })
                setShowAddMat(true)
              }}
              className="bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Material
            </button>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3 text-right">Reorder Point</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAllMats.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-gray-500">{m.code || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{m.name}</td>
                    <td className="px-4 py-3 text-gray-600">{m.category || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{m.unit}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{m.reorder_point}</td>
                    <td className="px-4 py-3 text-center">
                      {m.is_active 
                        ? <span className="inline-flex px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">Active</span>
                        : <span className="inline-flex px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">Inactive</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => { setEditMat(m); setMatForm(m); setShowAddMat(true) }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleMaterial(m)}
                          className={`p-1.5 transition-colors ${m.is_active ? 'text-gray-400 hover:text-red-600' : 'text-gray-400 hover:text-green-600'}`}
                          title="Toggle Status"
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3 mt-4">
            {filteredAllMats.map(m => (
              <div key={m.id} className="bg-white border border-gray-150 rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{m.name}</h3>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{m.code || 'No Code'}</p>
                  </div>
                  {m.is_active ? (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full font-medium">Active</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] rounded-full font-medium">Inactive</span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                  <div>
                    <span className="text-gray-400 text-xs block">Category</span>
                    <span className="text-gray-700 text-xs">{m.category || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs block">Unit</span>
                    <span className="text-gray-700 text-xs">{m.unit}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs block">Reorder</span>
                    <span className="text-gray-700 font-medium text-xs">{m.reorder_point}</span>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-gray-50">
                  <button onClick={() => { setEditMat(m); setMatForm(m); setShowAddMat(true) }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-md">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => handleToggleMaterial(m)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-50 hover:bg-gray-100 rounded-md ${m.is_active ? 'text-red-600' : 'text-green-600'}`}>
                    <Power className="w-3.5 h-3.5" /> {m.is_active ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ TAB 3: PRODUCTS DIRECTORY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {mainTab === 'products' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Search products by name or SKU..."
                value={prodSearch}
                onChange={e => setProdSearch(e.target.value)}
              />
            </div>
            <button
              onClick={() => {
                setEditProd(null)
                setProdForm({ name: '', sku: '', category: '', unit: 'kg', selling_price: 0, cost_price: 0, description: '' })
                setShowAddProd(true)
              }}
              className="bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Product
            </button>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3 text-right">Selling Price</th>
                  <th className="px-4 py-3 text-right">Cost Price</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAllProds.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-gray-500">{p.sku || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{p.name}</td>
                    <td className="px-4 py-3 text-gray-600">{p.category || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{p.unit}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      LKR {p.selling_price?.toLocaleString('en-US', {minimumFractionDigits:2})}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      LKR {p.cost_price?.toLocaleString('en-US', {minimumFractionDigits:2})}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.is_active 
                        ? <span className="inline-flex px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">Active</span>
                        : <span className="inline-flex px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">Inactive</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => { setEditProd(p); setProdForm(p); setShowAddProd(true) }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleProduct(p)}
                          className={`p-1.5 transition-colors ${p.is_active ? 'text-gray-400 hover:text-red-600' : 'text-gray-400 hover:text-green-600'}`}
                          title="Toggle Status"
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3 mt-4">
            {filteredAllProds.map(p => (
              <div key={p.id} className="bg-white border border-gray-150 rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{p.name}</h3>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{p.sku || 'No SKU'}</p>
                  </div>
                  {p.is_active ? (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full font-medium">Active</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] rounded-full font-medium">Inactive</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <span className="text-gray-400 text-xs block">Selling Price</span>
                    <span className="text-gray-900 font-semibold text-xs">LKR {p.selling_price?.toLocaleString('en-US', {minimumFractionDigits:2})}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs block">Cost Price</span>
                    <span className="text-gray-900 font-semibold text-xs">LKR {p.cost_price?.toLocaleString('en-US', {minimumFractionDigits:2})}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs block">Category</span>
                    <span className="text-gray-700 text-xs">{p.category || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs block">Unit</span>
                    <span className="text-gray-700 text-xs">{p.unit}</span>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-gray-50">
                  <button onClick={() => { setEditProd(p); setProdForm(p); setShowAddProd(true) }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-md">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => handleToggleProduct(p)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-50 hover:bg-gray-100 rounded-md ${p.is_active ? 'text-red-600' : 'text-green-600'}`}>
                    <Power className="w-3.5 h-3.5" /> {p.is_active ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ TAB 4: CONSUMABLES DIRECTORY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {mainTab === 'consumables_dir' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Search consumables by name or code..."
                value={consumableDirSearch}
                onChange={e => setConsumableDirSearch(e.target.value)}
              />
            </div>
            <button
              onClick={() => {
                setConsumableDirForm({ name: '', code: '', unit: 'pcs', initial_quantity: '' })
                setShowAddConsumableDir(true)
              }}
              className="bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Consumable Item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredConsumablesDir.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-gray-500">{m.code || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{m.name}</td>
                    <td className="px-4 py-3 text-gray-600">{m.unit}</td>
                    <td className="px-4 py-3 text-center">
                      {m.is_active 
                        ? <span className="inline-flex px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">Active</span>
                        : <span className="inline-flex px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">Inactive</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ DIALOGS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

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
                className={`flex-1 py-2 text-sm font-semibold rounded-lg border transition-colors ${
                  addType === 'raw'
                    ? 'bg-green-700 text-white border-green-700 shadow-sm'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Raw Material
              </button>
              <button 
                onClick={() => { setAddType('finished'); setSelectedItem(null); setItemSearch(''); setShowItemDropdown(false) }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg border transition-colors ${
                  addType === 'finished'
                    ? 'bg-green-700 text-white border-green-700 shadow-sm'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Finished Good
              </button>
            </div>

            <form onSubmit={handleSaveStock} className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Item *</label>
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
                          <p className="text-sm font-semibold text-gray-900">{item.name}</p>
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
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Quantity *</label>
                  <div className="relative">
                    <input
                      type="number" min="0.001" step="any" required
                      value={quantity || ''}
                      onChange={e => setQuantity(parseFloat(e.target.value) || 0)}
                      className="w-full pl-3 pr-12 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    {selectedItem && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-semibold">
                        {selectedItem.unit}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Batch Number</label>
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
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Expiry Date</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={e => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Location</label>
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
                <button type="button" onClick={closeDialog} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors bg-white">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 bg-green-700 hover:bg-green-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm">
                  {saving ? 'Saving...' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIVE CONSUMABLES DIALOG */}
      {showReceiveConsumable && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Receive Consumables</h2>
              <button onClick={() => setShowReceiveConsumable(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleReceiveConsumable} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Select Consumable *</label>
                <select
                  required
                  value={consumableForm.item_id}
                  onChange={e => setConsumableForm({ ...consumableForm, item_id: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                >
                  <option value="">-- Choose Item --</option>
                  {materials.filter(m => m.category === 'Consumable').map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.unit})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Quantity *</label>
                  <input
                    type="number" step="any" min="0" required
                    value={consumableForm.quantity}
                    onChange={e => setConsumableForm({ ...consumableForm, quantity: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Unit Cost *</label>
                  <input
                    type="number" step="0.01" min="0" required
                    value={consumableForm.unit_cost}
                    onChange={e => setConsumableForm({ ...consumableForm, unit_cost: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Supplier (Optional)</label>
                <select
                  value={consumableForm.supplier_id}
                  onChange={e => setConsumableForm({ ...consumableForm, supplier_id: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                >
                  <option value="">-- No Supplier --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Remarks</label>
                <input
                  type="text"
                  placeholder="Invoice number, delivery note, etc."
                  value={consumableForm.remarks}
                  onChange={e => setConsumableForm({ ...consumableForm, remarks: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-3 pt-4 mt-6 border-t border-gray-100">
                <button type="button" onClick={() => setShowReceiveConsumable(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors bg-white">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 bg-purple-700 hover:bg-purple-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm">
                  {saving ? 'Receiving...' : 'Receive Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD/EDIT MATERIAL DIALOG */}
      {showAddMat && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold text-gray-900">
                {editMat ? 'Edit Material' : 'Add Material'}
              </h2>
              <button onClick={() => setShowAddMat(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveMaterial} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Name *</label>
                <input
                  required
                  value={matForm.name} onChange={e => setMatForm({...matForm, name: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Code</label>
                  <input
                    value={matForm.code} onChange={e => setMatForm({...matForm, code: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Unit *</label>
                  <select
                    required
                    value={matForm.unit} onChange={e => setMatForm({...matForm, unit: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  >
                    {['kg','g','litre','ml','pcs','box','bag','tonne'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
                  <input
                    placeholder="e.g. Spices, Packaging"
                    value={matForm.category} onChange={e => setMatForm({...matForm, category: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Reorder Point</label>
                  <input
                    type="number" min="0" step="any"
                    value={matForm.reorder_point} onChange={e => setMatForm({...matForm, reorder_point: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4 mt-6 border-t border-gray-100">
                <button type="button" onClick={() => setShowAddMat(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors bg-white">
                  Cancel
                </button>
                <button type="submit" className="flex-1 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm">
                  Save Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD/EDIT PRODUCT DIALOG */}
      {showAddProd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold text-gray-900">
                {editProd ? 'Edit Product' : 'Add Product'}
              </h2>
              <button onClick={() => setShowAddProd(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Name *</label>
                <input
                  required
                  value={prodForm.name} onChange={e => setProdForm({...prodForm, name: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">SKU</label>
                  <input
                    value={prodForm.sku} onChange={e => setProdForm({...prodForm, sku: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Unit *</label>
                  <select
                    required
                    value={prodForm.unit} onChange={e => setProdForm({...prodForm, unit: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  >
                    {['kg','g','litre','ml','pcs','box','bag','tonne','packet'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Selling Price</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={prodForm.selling_price || ''} onChange={e => setProdForm({...prodForm, selling_price: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cost Price</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={prodForm.cost_price || ''} onChange={e => setProdForm({...prodForm, cost_price: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
                <input
                  value={prodForm.category} onChange={e => setProdForm({...prodForm, category: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                <textarea
                  value={prodForm.description} onChange={e => setProdForm({...prodForm, description: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  rows={2}
                />
              </div>
              <div className="flex gap-3 pt-4 mt-6 border-t border-gray-100">
                <button type="button" onClick={() => setShowAddProd(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors bg-white">
                  Cancel
                </button>
                <button type="submit" className="flex-1 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm">
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ADD CONSUMABLE DIRECTORY ITEM DIALOG */}
      {showAddConsumableDir && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Add Consumable Item</h2>
              <button onClick={() => setShowAddConsumableDir(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveConsumableDir} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Name *</label>
                <input
                  required
                  value={consumableDirForm.name} onChange={e => setConsumableDirForm({...consumableDirForm, name: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Item Code</label>
                  <input
                    value={consumableDirForm.code} onChange={e => setConsumableDirForm({...consumableDirForm, code: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Unit (UOM) *</label>
                  <select
                    required
                    value={consumableDirForm.unit} onChange={e => setConsumableDirForm({...consumableDirForm, unit: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  >
                    {['pcs','box','roll','pack','kg','g','litre','ml'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Initial Quantity (Optional)</label>
                <input
                  type="number" step="0.01" min="0"
                  value={consumableDirForm.initial_quantity} onChange={e => setConsumableDirForm({...consumableDirForm, initial_quantity: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="0"
                />
              </div>
              <div className="flex gap-3 pt-4 mt-6 border-t border-gray-100">
                <button type="button" onClick={() => setShowAddConsumableDir(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors bg-white">
                  Cancel
                </button>
                <button type="submit" className="flex-1 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm">
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

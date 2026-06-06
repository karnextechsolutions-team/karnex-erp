'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Search, Edit2, Trash2, X, Power } from 'lucide-react'
import { COMPANY } from '@/lib/company'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const tabs = [
    { key: 'company', label: 'Company' },
    { key: 'materials', label: 'Raw Materials' },
    { key: 'products', label: 'Products' },
    { key: 'bom', label: 'BOM' },
    { key: 'users', label: 'Users' }
  ] as const
  const [activeTab, setActiveTab] = useState<'company'|'materials'|'products'|'bom'|'users'>('company')

  // --- RAW MATERIALS ---
  const [materials, setMaterials] = useState<any[]>([])
  const [matSearch, setMatSearch] = useState('')
  const [showAddMat, setShowAddMat] = useState(false)
  const [editMat, setEditMat] = useState<any>(null)
  const [matForm, setMatForm] = useState({
    name: '', code: '', category: '', unit: 'kg', reorder_point: 0
  })

  // --- PRODUCTS ---
  const [products, setProducts] = useState<any[]>([])
  const [prodSearch, setProdSearch] = useState('')
  const [showAddProd, setShowAddProd] = useState(false)
  const [editProd, setEditProd] = useState<any>(null)
  const [prodForm, setProdForm] = useState({
    name: '', sku: '', category: '', unit: 'kg',
    selling_price: 0, cost_price: 0, description: ''
  })

  // --- BOM ---
  const [selectedBOMProduct, setSelectedBOMProduct] = useState<any>(null)
  const [bomItems, setBomItems] = useState<any[]>([])
  const [showAddBOMItem, setShowAddBOMItem] = useState(false)
  const [bomMatSearch, setBomMatSearch] = useState('')
  const [showBomMatDropdown, setShowBomMatDropdown] = useState(false)
  const [bomSelectedMat, setBomSelectedMat] = useState<any>(null)
  const [bomQtyRequired, setBomQtyRequired] = useState(1)
  const [bomProdSearch, setBomProdSearch] = useState('')

  // --- USERS ---
  const [users, setUsers] = useState<any[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [editUser, setEditUser] = useState<any>(null)
  const [newRole, setNewRole] = useState('')

  // --- DATA FETCHING ---
  const loadMaterials = async () => {
    const { data } = await supabase.from('raw_materials').select('*').order('name')
    setMaterials(data ?? [])
  }
  const loadProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('name')
    setProducts(data ?? [])
  }
  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('full_name')
    setUsers(data ?? [])
  }
  const loadBOM = async (productId: string) => {
    const { data } = await supabase.from('bill_of_materials')
      .select('*, raw_materials(name, unit, code)')
      .eq('product_id', productId)
    setBomItems(data ?? [])
  }

  useEffect(() => {
    loadMaterials()
    loadProducts()
    loadUsers()
  }, [])

  useEffect(() => {
    if (selectedBOMProduct) {
      loadBOM(selectedBOMProduct.id)
    } else {
      setBomItems([])
    }
  }, [selectedBOMProduct])

  // --- ACTIONS: MATERIALS ---
  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!matForm.name) { toast.error('Name is required'); return }
    if (!matForm.unit) { toast.error('Unit is required'); return }
    
    if (editMat) {
      const { error } = await supabase.from('raw_materials').update({...matForm}).eq('id', editMat.id)
      if (error) toast.error(error.message)
      else { toast.success('Material updated!'); loadMaterials(); setShowAddMat(false) }
    } else {
      const { error } = await supabase.from('raw_materials').insert({
        name: matForm.name, code: matForm.code || null,
        category: matForm.category || null, unit: matForm.unit,
        reorder_point: matForm.reorder_point, is_active: true
      })
      if (error) toast.error(error.message)
      else { toast.success('Material added!'); loadMaterials(); setShowAddMat(false) }
    }
  }

  const handleToggleMaterial = async (m: any) => {
    const { error } = await supabase.from('raw_materials').update({ is_active: !m.is_active }).eq('id', m.id)
    if (error) toast.error(error.message)
    else { toast.success('Status updated!'); loadMaterials() }
  }

  // --- ACTIONS: PRODUCTS ---
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prodForm.name) { toast.error('Name is required'); return }
    if (!prodForm.unit) { toast.error('Unit is required'); return }
    
    if (editProd) {
      const { error } = await supabase.from('products').update({...prodForm}).eq('id', editProd.id)
      if (error) toast.error(error.message)
      else { toast.success('Product updated!'); loadProducts(); setShowAddProd(false) }
    } else {
      const { error } = await supabase.from('products').insert({
        name: prodForm.name, sku: prodForm.sku || null,
        category: prodForm.category || null, unit: prodForm.unit,
        selling_price: prodForm.selling_price, cost_price: prodForm.cost_price,
        description: prodForm.description || null, is_active: true
      })
      if (error) toast.error(error.message)
      else { toast.success('Product added!'); loadProducts(); setShowAddProd(false) }
    }
  }

  const handleToggleProduct = async (p: any) => {
    const { error } = await supabase.from('products').update({ is_active: !p.is_active }).eq('id', p.id)
    if (error) toast.error(error.message)
    else { toast.success('Status updated!'); loadProducts() }
  }

  // --- ACTIONS: BOM ---
  const handleSaveBOMItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBOMProduct) return
    if (!bomSelectedMat) { toast.error('Please select a material'); return }
    if (bomQtyRequired <= 0) { toast.error('Quantity must be > 0'); return }
    
    const { error } = await supabase.from('bill_of_materials').insert({
      product_id: selectedBOMProduct.id,
      material_id: bomSelectedMat.id,
      quantity_required: bomQtyRequired
    })
    
    if (error) {
      if (error.code === '23505') toast.error('Material is already in BOM')
      else toast.error(error.message)
    } else {
      toast.success('Material added to BOM!')
      loadBOM(selectedBOMProduct.id)
      setShowAddBOMItem(false)
      setBomSelectedMat(null)
      setBomMatSearch('')
      setBomQtyRequired(1)
    }
  }

  const handleDeleteBOMItem = async (id: string) => {
    const { error } = await supabase.from('bill_of_materials').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Removed from BOM'); loadBOM(selectedBOMProduct.id) }
  }

  // --- ACTIONS: USERS ---
  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editUser || !newRole) return
    
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', editUser.id)
    if (error) toast.error(error.message)
    else { toast.success('Role updated!'); loadUsers(); setEditUser(null) }
  }

  // --- DERIVED / FILTERS ---
  const filteredMats = materials.filter(m =>
    m.name.toLowerCase().includes(matSearch.toLowerCase()) ||
    (m.code ?? '').toLowerCase().includes(matSearch.toLowerCase()) ||
    (m.category ?? '').toLowerCase().includes(matSearch.toLowerCase())
  )

  const filteredProds = products.filter(p =>
    p.name.toLowerCase().includes(prodSearch.toLowerCase()) ||
    (p.sku ?? '').toLowerCase().includes(prodSearch.toLowerCase()) ||
    (p.category ?? '').toLowerCase().includes(prodSearch.toLowerCase())
  )

  const filteredBomProducts = products.filter(p => 
    p.name.toLowerCase().includes(bomProdSearch.toLowerCase()) ||
    (p.sku ?? '').toLowerCase().includes(bomProdSearch.toLowerCase())
  )

  const filteredBomMaterials = materials.filter(m =>
    m.is_active && (
      m.name.toLowerCase().includes(bomMatSearch.toLowerCase()) ||
      (m.code ?? '').toLowerCase().includes(bomMatSearch.toLowerCase())
    )
  )

  const filteredUsers = users.filter(u =>
    (u.full_name ?? '').toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.email ?? '').toLowerCase().includes(userSearch.toLowerCase())
  )

  const getRoleBadge = (role: string) => {
    const map: Record<string, string> = {
      admin: 'bg-red-100 text-red-700',
      manager: 'bg-purple-100 text-purple-700',
      procurement: 'bg-blue-100 text-blue-700',
      production: 'bg-amber-100 text-amber-700',
      sales: 'bg-green-100 text-green-700',
      viewer: 'bg-gray-100 text-gray-600'
    }
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${map[role] || map.viewer}`}>
        {role || 'viewer'}
      </span>
    )
  }

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage products, materials, users and system configuration
          </p>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto mb-6 scrollbar-none -mx-4 px-4 md:mx-0 md:px-0">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ TAB 0: COMPANY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeTab === 'company' && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <img src="/logo.png" className="w-16 h-16 object-contain rounded-xl border border-gray-200 p-2 bg-white"/>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{COMPANY.name}</h2>
                <p className="text-sm text-gray-500">{COMPANY.tagline}</p>
              </div>
            </div>
            <button
              className="text-sm border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50">
              Edit
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><p className="text-gray-400 text-xs mb-1">Address</p><p>{COMPANY.address}</p></div>
            <div><p className="text-gray-400 text-xs mb-1">Phone</p><p>{COMPANY.phone}</p></div>
            <div><p className="text-gray-400 text-xs mb-1">Email</p><p>{COMPANY.email}</p></div>
            <div><p className="text-gray-400 text-xs mb-1">Country</p><p>{COMPANY.country}</p></div>
            <div><p className="text-gray-400 text-xs mb-1">Currency</p><p>{COMPANY.currency}</p></div>
          </div>
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700">
              To update company details, edit src/lib/company.ts and 
              replace public/logo.png with your logo file.
            </p>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ TAB 1: RAW MATERIALS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeTab === 'materials' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Search materials..."
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
              className="bg-green-700 hover:bg-green-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
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
                {filteredMats.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-gray-500">{m.code || '—'}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{m.name}</td>
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
            {filteredMats.map(m => (
              <div key={m.id} className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium text-gray-900">{m.name}</h3>
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
                  <button onClick={() => { setEditMat(m); setMatForm(m); setShowAddMat(true) }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-md">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => handleToggleMaterial(m)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-50 hover:bg-gray-100 rounded-md ${m.is_active ? 'text-red-600' : 'text-green-600'}`}>
                    <Power className="w-3.5 h-3.5" /> {m.is_active ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            ))}
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
                <input
                  required
                  value={matForm.name} onChange={e => setMatForm({...matForm, name: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Code</label>
                  <input
                    value={matForm.code} onChange={e => setMatForm({...matForm, code: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Unit *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                  <input
                    placeholder="e.g. Spices, Packaging"
                    value={matForm.category} onChange={e => setMatForm({...matForm, category: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Reorder Point</label>
                  <input
                    type="number" min="0" step="any"
                    value={matForm.reorder_point} onChange={e => setMatForm({...matForm, reorder_point: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4 mt-6 border-t border-gray-100">
                <button type="button" onClick={() => setShowAddMat(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="flex-1 bg-green-700 hover:bg-green-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
                  Save Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ TAB 2: PRODUCTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeTab === 'products' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Search products..."
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
              className="bg-green-700 hover:bg-green-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
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
                {filteredProds.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-gray-500">{p.sku || '—'}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
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
            {filteredProds.map(p => (
              <div key={p.id} className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium text-gray-900">{p.name}</h3>
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
                    <span className="text-gray-900 font-medium text-xs">LKR {p.selling_price?.toLocaleString('en-US', {minimumFractionDigits:2})}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs block">Cost Price</span>
                    <span className="text-gray-900 font-medium text-xs">LKR {p.cost_price?.toLocaleString('en-US', {minimumFractionDigits:2})}</span>
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
                  <button onClick={() => { setEditProd(p); setProdForm(p); setShowAddProd(true) }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-md">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => handleToggleProduct(p)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-50 hover:bg-gray-100 rounded-md ${p.is_active ? 'text-red-600' : 'text-green-600'}`}>
                    <Power className="w-3.5 h-3.5" /> {p.is_active ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            ))}
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
                <input
                  required
                  value={prodForm.name} onChange={e => setProdForm({...prodForm, name: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">SKU</label>
                  <input
                    value={prodForm.sku} onChange={e => setProdForm({...prodForm, sku: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Unit *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Selling Price</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={prodForm.selling_price} onChange={e => setProdForm({...prodForm, selling_price: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Cost Price</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={prodForm.cost_price} onChange={e => setProdForm({...prodForm, cost_price: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                <input
                  value={prodForm.category} onChange={e => setProdForm({...prodForm, category: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  value={prodForm.description} onChange={e => setProdForm({...prodForm, description: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  rows={2}
                />
              </div>
              <div className="flex gap-3 pt-4 mt-6 border-t border-gray-100">
                <button type="button" onClick={() => setShowAddProd(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="flex-1 bg-green-700 hover:bg-green-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ TAB 3: BOM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeTab === 'bom' && (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left panel: product list */}
          <div className="w-full lg:w-80 shrink-0 bg-white border border-gray-200 rounded-xl flex flex-col min-h-[500px]">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-3">Products</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Search products..."
                  value={bomProdSearch}
                  onChange={e => setBomProdSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[600px] p-2 space-y-1">
              {filteredBomProducts.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedBOMProduct(p)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                    selectedBOMProduct?.id === p.id ? 'bg-green-50 border border-green-100' : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <p className={`text-sm font-medium ${selectedBOMProduct?.id === p.id ? 'text-green-900' : 'text-gray-900'}`}>{p.name}</p>
                  <p className={`text-xs ${selectedBOMProduct?.id === p.id ? 'text-green-700' : 'text-gray-500'}`}>{p.sku || 'No SKU'}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Right panel: BOM details */}
          <div className="flex-1 bg-white border border-gray-200 rounded-xl p-6">
            {!selectedBOMProduct ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 py-20">
                <p className="text-sm font-medium">Select a product to view or edit its BOM</p>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">BOM for {selectedBOMProduct.name}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Define materials required to produce 1 {selectedBOMProduct.unit}</p>
                  </div>
                  <button
                    onClick={() => setShowAddBOMItem(true)}
                    className="bg-green-700 hover:bg-green-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add Material
                  </button>
                </div>

                <div className="hidden md:block border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                      <tr>
                        <th className="px-4 py-3">Material</th>
                        <th className="px-4 py-3">Code</th>
                        <th className="px-4 py-3">Unit</th>
                        <th className="px-4 py-3 text-right">Qty Required / {selectedBOMProduct.unit}</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {bomItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-400">No materials added yet</td>
                        </tr>
                      ) : (
                        bomItems.map(item => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{item.raw_materials?.name}</td>
                            <td className="px-4 py-3 text-gray-500 font-mono">{item.raw_materials?.code || '—'}</td>
                            <td className="px-4 py-3 text-gray-600">{item.raw_materials?.unit}</td>
                            <td className="px-4 py-3 text-right font-medium text-gray-900">{item.quantity_required}</td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleDeleteBOMItem(item.id)}
                                className="text-gray-400 hover:text-red-600 transition-colors p-1"
                                title="Remove"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3 mt-4">
                  {bomItems.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-400 bg-gray-50 rounded-lg border border-gray-100 text-sm">No materials added yet</div>
                  ) : (
                    bomItems.map(item => (
                      <div key={item.id} className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{item.raw_materials?.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-500 font-mono">{item.raw_materials?.code || 'No Code'}</span>
                            <span className="text-xs text-gray-400">&bull;</span>
                            <span className="text-xs font-medium text-gray-900">{item.quantity_required} {item.raw_materials?.unit}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteBOMItem(item.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors p-2 bg-gray-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADD BOM ITEM DIALOG */}
      {showAddBOMItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Add Material to BOM</h2>
              <button onClick={() => setShowAddBOMItem(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveBOMItem} className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Material *</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                    placeholder="Search materials..."
                    value={bomSelectedMat ? bomSelectedMat.name : bomMatSearch}
                    onChange={(e) => {
                      setBomMatSearch(e.target.value)
                      setBomSelectedMat(null)
                      setShowBomMatDropdown(true)
                    }}
                    onFocus={() => setShowBomMatDropdown(true)}
                    autoComplete="off"
                  />
                  {bomSelectedMat && (
                    <button
                      type="button"
                      onClick={() => { setBomSelectedMat(null); setBomMatSearch('') }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {showBomMatDropdown && !bomSelectedMat && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-52 overflow-y-auto">
                    {filteredBomMaterials.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-400">No active materials found</div>
                    ) : (
                      filteredBomMaterials.map(m => (
                        <button
                          key={m.id} type="button"
                          className="w-full text-left px-4 py-2.5 hover:bg-green-50 transition-colors border-b border-gray-50 last:border-0"
                          onClick={() => { setBomSelectedMat(m); setBomMatSearch(''); setShowBomMatDropdown(false) }}
                        >
                          <p className="text-sm font-medium text-gray-900">{m.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">Code: {m.code ?? '—'} · Unit: {m.unit}</p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Qty Required (per 1 {selectedBOMProduct?.unit}) *
                </label>
                <div className="relative">
                  <input
                    type="number" min="0.001" step="0.001" required
                    value={bomQtyRequired}
                    onChange={e => setBomQtyRequired(parseFloat(e.target.value) || 0)}
                    className="w-full pl-3 pr-16 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  {bomSelectedMat && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">
                      {bomSelectedMat.unit}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex gap-3 pt-4 mt-6 border-t border-gray-100">
                <button type="button" onClick={() => setShowAddBOMItem(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="flex-1 bg-green-700 hover:bg-green-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
                  Add to BOM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ TAB 4: USERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeTab === 'users' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Search users..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{u.full_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">{getRoleBadge(u.role)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => { setEditUser(u); setNewRole(u.role || 'viewer') }}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        Edit Role
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3 mt-4">
            {filteredUsers.map(u => (
              <div key={u.id} className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{u.full_name || 'No Name'}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{u.email}</p>
                  </div>
                  <div>{getRoleBadge(u.role)}</div>
                </div>
                <div className="flex justify-end pt-2 border-t border-gray-50">
                  <button
                    onClick={() => { setEditUser(u); setNewRole(u.role || 'viewer') }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Role
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EDIT ROLE DIALOG */}
      {editUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Edit User Role</h2>
              <button onClick={() => setEditUser(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-5 border border-gray-100">
              <p className="font-medium text-gray-900">{editUser.full_name || 'No Name'}</p>
              <p className="text-sm text-gray-500">{editUser.email}</p>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Role *</label>
                <select
                  required
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                  <option value="admin">admin</option>
                  <option value="manager">manager</option>
                  <option value="procurement">procurement</option>
                  <option value="production">production</option>
                  <option value="sales">sales</option>
                  <option value="viewer">viewer</option>
                </select>
              </div>
              
              <div className="flex gap-3 pt-4 mt-6 border-t border-gray-100">
                <button type="button" onClick={() => setEditUser(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="flex-1 bg-green-700 hover:bg-green-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
                  Save Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Search, Users, X, Pencil, Eye, DollarSign } from 'lucide-react'
import type { Supplier } from '@/types/database'

export default function SuppliersPage() {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Modals
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)

  // Form State
  const initialSupplierState = {
    name: '',
    category: 'Conventional' as 'Organic' | 'Conventional' | 'Traders',
    address: '',
    phone: '',
    payment_terms: '30 Days' as '7 Days' | '30 Days'
  }
  const [newSupplier, setNewSupplier] = useState(initialSupplierState)
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null)

  const fetchData = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name')

    if (error) {
      toast.error('Failed to load suppliers: ' + error.message)
    } else {
      setSuppliers(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Metrics
  const organicCount = suppliers.filter(s => s.category === 'Organic').length
  const conventionalCount = suppliers.filter(s => s.category === 'Conventional').length
  const tradersCount = suppliers.filter(s => s.category === 'Traders').length

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.phone ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSupplier.name) {
      toast.error('Supplier name is required')
      return
    }

    const supabase = createClient()
    const { error } = await supabase.from('suppliers').insert({
      name: newSupplier.name,
      category: newSupplier.category,
      address: newSupplier.address || null,
      phone: newSupplier.phone || null,
      payment_terms: newSupplier.payment_terms,
      country: 'Sri Lanka', // Default hidden requirement
      is_active: true
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Supplier added successfully!')
      setShowAddDialog(false)
      setNewSupplier(initialSupplierState)
      fetchData()
    }
  }

  const handleEditClick = (supplier: Supplier) => {
    setEditingSupplier({
      id: supplier.id,
      name: supplier.name,
      category: supplier.category || 'Conventional',
      address: supplier.address ?? '',
      phone: supplier.phone ?? '',
      payment_terms: supplier.payment_terms ?? '30 Days'
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
        category: editingSupplier.category,
        address: editingSupplier.address || null,
        phone: editingSupplier.phone || null,
        payment_terms: editingSupplier.payment_terms
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Suppliers Directory</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage raw material suppliers and traders</p>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="flex items-center justify-center gap-1.5 bg-green-700 hover:bg-green-800 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Supplier
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Suppliers</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">{suppliers.length}</p>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 border text-gray-700 border-gray-200">
            <Users className="w-6 h-6" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Suppliers by Category</p>
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded">Organic: {organicCount}</span>
            <span className="font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">Conventional: {conventionalCount}</span>
            <span className="font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Traders: {tradersCount}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Payables</p>
            <p className="text-2xl font-bold text-gray-800 mt-1 text-gray-400">LKR 0.00</p>
            <p className="text-xs text-gray-400 mt-1">Accounts Payable integration pending</p>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 border text-gray-700 border-gray-200">
            <DollarSign className="w-6 h-6 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name or contact number..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        />
      </div>

      {/* Table View */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact Number</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Address</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment Term</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-4" colSpan={6}>
                    <div className="animate-pulse h-4 bg-gray-200 rounded w-3/4" />
                  </td>
                </tr>
              ))
            ) : filteredSuppliers.length === 0 ? (
              <tr>
                <td className="px-4 py-12 text-center" colSpan={6}>
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
                  <td className="px-4 py-3.5">
                    <span className="inline-flex px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full font-medium">
                      {supplier.category || 'Conventional'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-gray-600">{supplier.phone ?? '—'}</td>
                  <td className="px-4 py-3.5 text-gray-600 truncate max-w-[200px]">{supplier.address ?? '—'}</td>
                  <td className="px-4 py-3.5 text-gray-600">{supplier.payment_terms}</td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditClick(supplier)}
                        className="inline-flex items-center justify-center p-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                        title="Edit Supplier"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push(`/suppliers/${supplier.id}`)}
                        className="inline-flex items-center justify-center p-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── ADD SUPPLIER MODAL (SIMPLIFIED) ── */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Add New Supplier</h3>
              <button onClick={() => setShowAddDialog(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSupplier} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={newSupplier.name}
                  onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Supplier Name"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Category *</label>
                <select
                  value={newSupplier.category}
                  onChange={e => setNewSupplier({ ...newSupplier, category: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                  <option value="Organic">Organic</option>
                  <option value="Conventional">Conventional</option>
                  <option value="Traders">Traders</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Contact Number</label>
                <input
                  type="text"
                  value={newSupplier.phone}
                  onChange={e => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g. +94 77 123 4567"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Address</label>
                <textarea
                  rows={2}
                  value={newSupplier.address}
                  onChange={e => setNewSupplier({ ...newSupplier, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  placeholder="Full Address"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Payment Term *</label>
                <select
                  value={newSupplier.payment_terms}
                  onChange={e => setNewSupplier({ ...newSupplier, payment_terms: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                  <option value="7 Days">7 Days</option>
                  <option value="30 Days">30 Days</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
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

      {/* ── EDIT SUPPLIER MODAL (SIMPLIFIED) ── */}
      {showEditDialog && editingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Edit Supplier</h3>
              <button onClick={() => setShowEditDialog(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateSupplier} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={editingSupplier.name}
                  onChange={e => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Category *</label>
                <select
                  value={editingSupplier.category}
                  onChange={e => setEditingSupplier({ ...editingSupplier, category: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                  <option value="Organic">Organic</option>
                  <option value="Conventional">Conventional</option>
                  <option value="Traders">Traders</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Contact Number</label>
                <input
                  type="text"
                  value={editingSupplier.phone}
                  onChange={e => setEditingSupplier({ ...editingSupplier, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Address</label>
                <textarea
                  rows={2}
                  value={editingSupplier.address}
                  onChange={e => setEditingSupplier({ ...editingSupplier, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Payment Term *</label>
                <select
                  value={editingSupplier.payment_terms}
                  onChange={e => setEditingSupplier({ ...editingSupplier, payment_terms: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                  <option value="7 Days">7 Days</option>
                  <option value="30 Days">30 Days</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
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

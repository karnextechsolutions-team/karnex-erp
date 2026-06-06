'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Search, Plus, Edit2, X, Users, Globe, Building2 } from 'lucide-react'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editCustomer, setEditCustomer] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', type: 'local', contact_person: '', phone: '',
    email: '', address: '', country: 'Sri Lanka',
    currency: 'LKR', credit_limit: 0, payment_terms: 'Net 30'
  })

  const fetchCustomers = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase.from('customers').select('*').order('name')
    setCustomers(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  const filtered = customers.filter(c => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.contact_person ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? '').toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || c.type === typeFilter
    return matchSearch && matchType
  })

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name) { toast.error('Name is required'); return }
    
    setSaving(true)
    const supabase = createClient()
    
    if (editCustomer) {
      const { error } = await supabase.from('customers').update({...form}).eq('id', editCustomer.id)
      if (error) toast.error('Failed to update: ' + error.message)
      else { toast.success('Customer updated!'); fetchCustomers(); setShowAddDialog(false) }
    } else {
      const { error } = await supabase.from('customers').insert({...form, is_active: true})
      if (error) toast.error('Failed to add: ' + error.message)
      else { toast.success('Customer added!'); fetchCustomers(); setShowAddDialog(false) }
    }
    setSaving(false)
  }

  const fmtLKR = (n: number) => 'LKR ' + (n || 0).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">Local and export customer directory</p>
        </div>
        <button
          onClick={() => {
            setEditCustomer(null)
            setForm({
              name: '', type: 'local', contact_person: '', phone: '',
              email: '', address: '', country: 'Sri Lanka',
              currency: 'LKR', credit_limit: 0, payment_terms: 'Net 30'
            })
            setShowAddDialog(true)
          }}
          className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Customers</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{customers.length}</p>
          </div>
          <div className="p-3 bg-gray-50 text-gray-600 rounded-lg"><Users className="w-6 h-6" /></div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Local</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{customers.filter(c => c.type === 'local').length}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Building2 className="w-6 h-6" /></div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Export</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{customers.filter(c => c.type === 'export').length}</p>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><Globe className="w-6 h-6" /></div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            placeholder="Search customers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {['all', 'local', 'export'].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                typeFilter === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading customers...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No customers found</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Country</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Currency</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Credit Limit</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(c => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-sm">
                        {c.type === 'local' 
                          ? <span className="inline-flex px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium capitalize">{c.type}</span>
                          : <span className="inline-flex px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium capitalize">{c.type}</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{c.country || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{c.contact_person || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{c.phone || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{c.currency || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium text-right">{fmtLKR(c.credit_limit)}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        <button
                          onClick={() => { setEditCustomer(c); setForm(c); setShowAddDialog(true) }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden space-y-3 p-4 bg-gray-50">
              {filtered.map(c => (
                <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{c.contact_person || 'No Contact Person'}</p>
                    </div>
                    {c.type === 'local' 
                      ? <span className="inline-flex px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium capitalize">{c.type}</span>
                      : <span className="inline-flex px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium capitalize">{c.type}</span>
                    }
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
                    <div><span className="text-gray-400">Country: </span>{c.country || '—'}</div>
                    <div><span className="text-gray-400">Phone: </span>{c.phone || '—'}</div>
                    <div className="col-span-2"><span className="text-gray-400">Credit: </span><span className="font-semibold text-gray-900">{fmtLKR(c.credit_limit)}</span> ({c.currency || '—'})</div>
                  </div>
                  <div className="flex pt-3 border-t border-gray-100">
                    <button onClick={() => { setEditCustomer(c); setForm(c); setShowAddDialog(true) }}
                      className="flex-1 text-xs border border-gray-200 text-gray-600 py-1.5 rounded-lg flex items-center justify-center gap-1 hover:bg-gray-50">
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* DIALOG */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold text-gray-900">
                {editCustomer ? 'Edit Customer' : 'Add Customer'}
              </h2>
              <button onClick={() => setShowAddDialog(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
                <input
                  required
                  value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                  <select
                    value={form.type} onChange={e => setForm({...form, type: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  >
                    <option value="local">Local</option>
                    <option value="export">Export</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Person</label>
                  <input
                    value={form.contact_person} onChange={e => setForm({...form, contact_person: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                  <input
                    value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                <input
                  value={form.address} onChange={e => setForm({...form, address: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
                  <input
                    value={form.country} onChange={e => setForm({...form, country: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Currency</label>
                  <select
                    value={form.currency} onChange={e => setForm({...form, currency: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  >
                    <option value="LKR">LKR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="AUD">AUD</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Credit Limit (LKR)</label>
                  <input
                    type="number" min="0" step="any"
                    value={form.credit_limit} onChange={e => setForm({...form, credit_limit: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Terms</label>
                  <select
                    value={form.payment_terms} onChange={e => setForm({...form, payment_terms: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  >
                    <option value="Net 30">Net 30</option>
                    <option value="Net 60">Net 60</option>
                    <option value="Net 90">Net 90</option>
                    <option value="Advance">Advance</option>
                    <option value="COD">COD</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4 mt-6 border-t border-gray-100">
                <button type="button" onClick={() => setShowAddDialog(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 bg-green-700 hover:bg-green-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
                  {saving ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

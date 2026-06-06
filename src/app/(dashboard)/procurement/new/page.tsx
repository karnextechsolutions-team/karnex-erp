'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Search, Trash2, Plus, ArrowLeft, X } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────
interface Supplier { id: string; name: string; country: string; payment_terms: string }
interface Material { id: string; name: string; code: string | null; unit: string }
interface LineItem {
  rowId: string
  material_id: string
  material_name: string
  material_unit: string
  search: string
  showDropdown: boolean
  quantity: number
  unit_price: number
}

function generateDocNumber(prefix: string): string {
  const year = new Date().getFullYear().toString().slice(-2)
  const random = Math.floor(1000 + Math.random() * 9000)
  return `${prefix}-${year}-${random}`
}

function fmtLKR(n: number) {
  return 'LKR ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Searchable Combobox ────────────────────────────────────
interface ComboboxProps {
  placeholder: string
  value: string          // display text
  onChange: (text: string) => void
  onSelect: (id: string, label: string) => void
  onClear: () => void
  options: { id: string; primary: string; secondary?: string }[]
  selected: boolean
}

function Combobox({ placeholder, value, onChange, onSelect, onClear, options, selected }: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          className="w-full pl-9 pr-8 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          placeholder={placeholder}
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
        />
        {selected && (
          <button type="button" onClick={onClear}
            className="absolute right-2.5 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {open && !selected && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-52 overflow-y-auto">
          {options.length === 0
            ? <p className="px-4 py-3 text-sm text-gray-400">No results found</p>
            : options.map(opt => (
              <button key={opt.id} type="button"
                className="w-full text-left px-4 py-2.5 hover:bg-green-50 transition-colors border-b border-gray-50 last:border-0"
                onClick={() => { onSelect(opt.id, opt.primary); setOpen(false) }}>
                <p className="text-sm font-medium text-gray-900">{opt.primary}</p>
                {opt.secondary && <p className="text-xs text-gray-400 mt-0.5">{opt.secondary}</p>}
              </button>
            ))
          }
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────
export default function NewPurchaseOrderPage() {
  const router = useRouter()
  const supabase = createClient()

  const [userId, setUserId] = useState<string | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  // Supplier selection
  const [supplierSearch, setSupplierSearch] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState<{ id: string; name: string } | null>(null)

  // Form fields
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0])
  const [expectedDate, setExpectedDate] = useState('')
  const [currency, setCurrency] = useState('LKR')
  const [notes, setNotes] = useState('')

  // Line items
  const [lineItems, setLineItems] = useState<LineItem[]>([])

  // ── Fetch data on mount ──
  useEffect(() => {
    async function load() {
      setFetching(true)
      const [
        { data: suppData },
        { data: matData },
        { data: { user } },
      ] = await Promise.all([
        supabase.from('suppliers').select('id,name,country,payment_terms').eq('is_active', true).order('name'),
        supabase.from('raw_materials').select('id,name,code,unit').eq('is_active', true).order('name'),
        supabase.auth.getUser(),
      ])
      setSuppliers(suppData ?? [])
      setMaterials(matData ?? [])
      setUserId(user?.id ?? null)
      setFetching(false)
    }
    load()
  }, [])

  // ── Derived ──
  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(supplierSearch.toLowerCase())
  )

  const subtotal = lineItems.reduce((sum, i) => sum + i.quantity * i.unit_price, 0)

  // ── Line item helpers ──
  function addItem() {
    setLineItems(prev => [...prev, {
      rowId: crypto.randomUUID(),
      material_id: '', material_name: '', material_unit: '',
      search: '', showDropdown: false,
      quantity: 1, unit_price: 0,
    }])
  }

  function removeItem(rowId: string) {
    setLineItems(prev => prev.filter(i => i.rowId !== rowId))
  }

  function updateItem(rowId: string, changes: Partial<LineItem>) {
    setLineItems(prev => prev.map(i => i.rowId === rowId ? { ...i, ...changes } : i))
  }

  // ── Submit ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSupplier) { toast.error('Please select a supplier'); return }
    if (lineItems.length === 0) { toast.error('Add at least one line item'); return }
    if (lineItems.some(i => !i.material_id)) { toast.error('Please select a material for every line item'); return }
    if (lineItems.some(i => i.quantity <= 0)) { toast.error('All quantities must be greater than 0'); return }
    if (!userId) { toast.error('Session error — please refresh the page'); return }

    setLoading(true)

    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .insert({
        po_number: generateDocNumber('PO'),
        supplier_id: selectedSupplier.id,
        created_by: userId,
        order_date: orderDate,
        expected_date: expectedDate || null,
        currency,
        total_amount: subtotal,
        notes: notes || null,
        status: 'draft',
      })
      .select()
      .single()

    if (poError) {
      toast.error('Failed to create PO: ' + poError.message)
      setLoading(false)
      return
    }

    const { error: itemsError } = await supabase.from('po_items').insert(
      lineItems.map(item => ({
        po_id: po.id,
        material_id: item.material_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        received_qty: 0,
      }))
    )

    if (itemsError) {
      toast.error('PO created but line items failed: ' + itemsError.message)
      setLoading(false)
      return
    }

    toast.success(`${po.po_number} created successfully!`)
    router.push('/procurement')
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">New Purchase Order</h1>
          <p className="text-sm text-gray-500 mt-0.5">Fill in the details below and add line items</p>
        </div>
        <button type="button" onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-2 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* ── Left: Form ── */}
        <div className="w-full lg:flex-1 space-y-5">

          {/* Order Details Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Order Details</h2>

            {/* Supplier */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Supplier <span className="text-red-500">*</span>
              </label>
              <Combobox
                placeholder="Search and select supplier..."
                value={selectedSupplier ? selectedSupplier.name : supplierSearch}
                onChange={text => { setSupplierSearch(text); setSelectedSupplier(null) }}
                onSelect={(id, name) => { setSelectedSupplier({ id, name }); setSupplierSearch('') }}
                onClear={() => { setSelectedSupplier(null); setSupplierSearch('') }}
                selected={!!selectedSupplier}
                options={filteredSuppliers.map(s => ({
                  id: s.id,
                  primary: s.name,
                  secondary: `${s.country} · ${s.payment_terms}`,
                }))}
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Order Date <span className="text-red-500">*</span>
                </label>
                <input type="date" required value={orderDate}
                  onChange={e => setOrderDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Expected Date</label>
                <input type="date" value={expectedDate}
                  onChange={e => setExpectedDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            </div>

            {/* Currency */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Currency <span className="text-red-500">*</span>
              </label>
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                <option value="LKR">LKR — Sri Lankan Rupee</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                placeholder="Any special instructions or remarks..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
            </div>
          </div>

          {/* Line Items Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Line Items</h2>
                <p className="text-xs text-gray-400 mt-0.5">Add materials you want to purchase</p>
              </div>
              <button type="button" onClick={addItem}
                className="flex items-center gap-1.5 text-sm font-medium text-white bg-green-700 hover:bg-green-800 px-3 py-2 rounded-lg transition-colors">
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>

            {/* Table header */}
            {lineItems.length > 0 && (
              <div className="hidden md:grid grid-cols-12 gap-2 px-1 pb-2 border-b border-gray-100 mb-1">
                <p className="col-span-6 text-xs font-semibold text-gray-400 uppercase tracking-wide">Material</p>
                <p className="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Qty</p>
                <p className="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Unit Price</p>
                <p className="col-span-1 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Total</p>
                <p className="col-span-1" />
              </div>
            )}

            {/* Empty state */}
            {lineItems.length === 0 && (
              <div className="text-center py-10 text-gray-400">
                <p className="text-sm">No line items yet.</p>
                <p className="text-xs mt-1">Click "Add Item" to get started.</p>
              </div>
            )}

            {/* Rows */}
            {lineItems.map(item => {
              const filteredMats = materials.filter(m =>
                m.name.toLowerCase().includes(item.search.toLowerCase()) ||
                (m.code ?? '').toLowerCase().includes(item.search.toLowerCase())
              )
              return (
                <div key={item.rowId} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-2 items-start py-4 border-b border-gray-100 last:border-0">

                  {/* Material combobox */}
                  <div className="md:col-span-6 relative">
                    <label className="block md:hidden text-xs text-gray-500 mb-1">Material</label>
                    <div className="relative flex items-center">
                      <Search className="absolute left-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                      <input
                        className="w-full pl-8 pr-7 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                        placeholder="Search material..."
                        autoComplete="off"
                        value={item.material_id ? item.material_name : item.search}
                        onChange={e => updateItem(item.rowId, {
                          search: e.target.value,
                          material_id: '', material_name: '', material_unit: '',
                          showDropdown: true,
                        })}
                        onFocus={() => updateItem(item.rowId, { showDropdown: true })}
                      />
                      {item.material_id && (
                        <button type="button"
                          className="absolute right-2 text-gray-400 hover:text-gray-600"
                          onClick={() => updateItem(item.rowId, {
                            material_id: '', material_name: '', material_unit: '', search: '',
                          })}>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {item.showDropdown && !item.material_id && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-44 overflow-y-auto">
                        {filteredMats.length === 0
                          ? <p className="px-3 py-2 text-sm text-gray-400">No materials found</p>
                          : filteredMats.map(m => (
                            <button key={m.id} type="button"
                              className="w-full text-left px-3 py-2 hover:bg-green-50 transition-colors border-b border-gray-50 last:border-0"
                              onClick={() => updateItem(item.rowId, {
                                material_id: m.id,
                                material_name: m.name,
                                material_unit: m.unit,
                                search: '',
                                showDropdown: false,
                              })}>
                              <span className="text-sm font-medium text-gray-900">{m.name}</span>
                              <span className="text-xs text-gray-400 ml-2">{m.code ? `${m.code} · ` : ''}{m.unit}</span>
                            </button>
                          ))
                        }
                      </div>
                    )}
                    {item.material_unit && (
                      <p className="text-xs text-gray-400 mt-0.5 pl-1">{item.material_unit}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:contents gap-3">
                    {/* Qty */}
                    <div className="md:col-span-2">
                      <label className="block md:hidden text-xs text-gray-500 mb-1">Quantity</label>
                      <input type="number" min="0.001" step="any"
                        value={item.quantity}
                        onChange={e => updateItem(item.rowId, { quantity: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm md:text-right focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>

                    {/* Unit Price */}
                    <div className="md:col-span-2">
                      <label className="block md:hidden text-xs text-gray-500 mb-1">Unit Price</label>
                      <input type="number" min="0" step="any"
                        value={item.unit_price}
                        onChange={e => updateItem(item.rowId, { unit_price: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm md:text-right focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:contents mt-2 md:mt-0">
                    {/* Total */}
                    <div className="md:col-span-1 py-2 text-sm font-medium md:text-right text-gray-800 tabular-nums">
                      <span className="md:hidden text-xs text-gray-500 mr-2">Total:</span>
                      {(item.quantity * item.unit_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>

                    {/* Remove */}
                    <div className="md:col-span-1 flex justify-end md:justify-center pt-1.5">
                      <button type="button" onClick={() => removeItem(item.rowId)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1">
                        <Trash2 className="w-4 h-4" />
                        <span className="md:hidden text-xs">Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Subtotal row */}
            {lineItems.length > 0 && (
              <div className="flex justify-between items-center pt-3 mt-1">
                <span className="text-xs text-gray-400">Subtotal ({lineItems.length} item{lineItems.length !== 1 ? 's' : ''})</span>
                <span className="text-sm font-semibold text-gray-900">{fmtLKR(subtotal)}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Summary ── */}
        <div className="w-full lg:w-72 shrink-0 lg:sticky top-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Order Summary</h2>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Supplier</span>
                <span className="font-medium text-gray-800 text-right max-w-32 truncate">
                  {selectedSupplier?.name ?? '—'}
                </span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Items</span>
                <span className="font-medium text-gray-800">{lineItems.length}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span className="font-medium text-gray-800">{fmtLKR(subtotal)}</span>
              </div>
              <div className="border-t border-gray-100 pt-2.5 flex justify-between">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-bold text-lg text-gray-900">{fmtLKR(subtotal)}</span>
              </div>
            </div>

            <button type="submit" disabled={loading || !userId}
              className="w-full mt-5 flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors text-sm">
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Creating...</>
              ) : 'Create Purchase Order'}
            </button>

            <button type="button" onClick={() => router.back()}
              className="w-full mt-2 text-sm text-gray-500 hover:text-gray-800 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
              Cancel
            </button>

            <p className="text-xs text-gray-400 text-center mt-3">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1 align-middle" />
              Will be saved as <span className="font-medium text-gray-600">Draft</span>
            </p>
          </div>
        </div>
      </div>
    </form>
  )
}
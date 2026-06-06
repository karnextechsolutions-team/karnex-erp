'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ArrowLeft, Search, Plus, Trash2, X, ShoppingCart, Calculator } from 'lucide-react'

interface LineItem {
  rowId: string
  product_id: string
  product_name: string
  product_unit: string
  search: string
  showDropdown: boolean
  quantity: number
  unit_price: number
  total: number
}

export default function NewSalesOrderPage() {
  const router = useRouter()
  
  const [customers, setCustomers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [userId, setUserId] = useState<string|null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Customer combobox
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)

  // Form
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split('T')[0])
  const [deliveryDate, setDeliveryDate] = useState('')
  const [currency, setCurrency] = useState('LKR')
  const [notes, setNotes] = useState('')
  const [discount, setDiscount] = useState(0)

  // Line items
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { rowId: crypto.randomUUID(), product_id: '', product_name: '', product_unit: '', search: '', showDropdown: false, quantity: 1, unit_price: 0, total: 0 }
  ])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [
        { data: cData },
        { data: pData },
        { data: { user } }
      ] = await Promise.all([
        supabase.from('customers').select('id,name,type,country,currency').eq('is_active', true).order('name'),
        supabase.from('products').select('id,name,sku,unit,selling_price').eq('is_active', true).order('name'),
        supabase.auth.getUser()
      ])
      
      setCustomers(cData ?? [])
      setProducts(pData ?? [])
      setUserId(user?.id ?? null)
      setLoading(false)
    }
    load()
  }, [])

  // Auto-set currency based on customer
  useEffect(() => {
    if (selectedCustomer?.currency) {
      setCurrency(selectedCustomer.currency)
    }
  }, [selectedCustomer])

  const addLineItem = () => {
    setLineItems([...lineItems, { 
      rowId: crypto.randomUUID(), product_id: '', product_name: '', product_unit: '', 
      search: '', showDropdown: false, quantity: 1, unit_price: 0, total: 0 
    }])
  }

  const removeLineItem = (rowId: string) => {
    setLineItems(lineItems.filter(i => i.rowId !== rowId))
  }

  const updateLineItem = (rowId: string, updates: Partial<LineItem>) => {
    setLineItems(prev => prev.map(item => {
      if (item.rowId === rowId) {
        const updated = { ...item, ...updates }
        updated.total = updated.quantity * updated.unit_price
        return updated
      }
      return item
    }))
  }

  const handleProductSelect = (rowId: string, p: any) => {
    updateLineItem(rowId, {
      product_id: p.id,
      product_name: p.name,
      product_unit: p.unit,
      search: '',
      showDropdown: false,
      unit_price: p.selling_price || 0,
    })
  }

  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()))

  const subtotal = lineItems.reduce((sum, i) => sum + i.total, 0)
  const total = subtotal - discount

  const fmtLKR = (n: number) => n.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomer) { toast.error('Please select a customer'); return }
    if (lineItems.length === 0) { toast.error('Add at least one item'); return }
    if (lineItems.some(i => !i.product_id)) { toast.error('All items must have a product selected'); return }
    if (!userId) { toast.error('Session missing. Please refresh'); return }

    setSaving(true)
    const supabase = createClient()
    const soNumber = 'SO-' + new Date().getFullYear().toString().slice(-2) + '-' + Math.floor(1000 + Math.random() * 9000)

    const { data: orderData, error: orderError } = await supabase.from('sales_orders').insert({
      so_number: soNumber,
      customer_id: selectedCustomer.id,
      created_by: userId,
      order_date: orderDate,
      delivery_date: deliveryDate || null,
      currency,
      subtotal,
      discount,
      total_amount: total,
      status: 'draft',
      notes: notes || null
    }).select('id').single()

    if (orderError) {
      toast.error('Failed to create order: ' + orderError.message)
      setSaving(false)
      return
    }

    const itemsToInsert = lineItems.map(item => ({
      sales_order_id: orderData.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total
    }))

    const { error: itemsError } = await supabase.from('sales_order_items').insert(itemsToInsert)
    
    if (itemsError) {
      toast.error('Failed to add items: ' + itemsError.message)
      setSaving(false)
      return
    }

    toast.success('Sales order created successfully!')
    router.push('/sales')
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading form...</div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* PAGE HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">New Sales Order</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create a draft sales order for a customer</p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/sales')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* LEFT COLUMN: Main Form */}
        <div className="flex-1 space-y-6 w-full">
          
          {/* Details Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Order Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer *</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                    placeholder="Search customers..."
                    value={selectedCustomer ? selectedCustomer.name : customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value)
                      setSelectedCustomer(null)
                      setShowCustomerDropdown(true)
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    autoComplete="off"
                  />
                  {selectedCustomer && (
                    <button
                      type="button"
                      onClick={() => { setSelectedCustomer(null); setCustomerSearch('') }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {showCustomerDropdown && !selectedCustomer && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-52 overflow-y-auto">
                    {filteredCustomers.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-400">No customers found</div>
                    ) : (
                      filteredCustomers.map(c => (
                        <button
                          key={c.id} type="button"
                          className="w-full text-left px-4 py-2.5 hover:bg-green-50 transition-colors border-b border-gray-50 last:border-0"
                          onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); setShowCustomerDropdown(false) }}
                        >
                          <p className="text-sm font-medium text-gray-900">{c.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5 capitalize">{c.type} · {c.country || 'No country'}</p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Currency *</label>
                <select
                  required
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Order Date *</label>
                <input
                  type="date" required
                  value={orderDate}
                  onChange={e => setOrderDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Delivery Date</label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={e => setDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Special instructions or remarks…"
                rows={2}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>
          </div>

          {/* Line Items Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Line Items</h2>
            
            {lineItems.length > 0 && (
              <div className="hidden md:grid grid-cols-12 gap-2 px-1 pb-2 border-b border-gray-100 mb-1">
                <p className="col-span-5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Product</p>
                <p className="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Quantity</p>
                <p className="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Unit Price</p>
                <p className="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Total</p>
                <p className="col-span-1" />
              </div>
            )}
            <div className="mb-4">
              {lineItems.map((item, idx) => (
                <div key={item.rowId} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-2 items-start py-4 border-b border-gray-100 last:border-0">
                  {/* Product Combobox */}
                  <div className="md:col-span-5 relative">
                    <label className="block md:hidden text-xs text-gray-500 mb-1">Product</label>
                    <div className="relative">
                      <input
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                        placeholder="Select product..."
                        value={item.product_name || item.search}
                        onChange={(e) => {
                          updateLineItem(item.rowId, { search: e.target.value, product_id: '', product_name: '', showDropdown: true })
                        }}
                        onFocus={() => updateLineItem(item.rowId, { showDropdown: true })}
                        autoComplete="off"
                      />
                      {item.product_id && (
                        <button
                          type="button"
                          onClick={() => updateLineItem(item.rowId, { product_id: '', product_name: '', search: '', showDropdown: true })}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {item.showDropdown && !item.product_id && (
                      <div className="absolute left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                        {products.filter(p => p.name.toLowerCase().includes(item.search.toLowerCase())).map(p => (
                          <button
                            key={p.id} type="button"
                            className="w-full text-left px-3 py-2 hover:bg-green-50 transition-colors border-b border-gray-50 last:border-0"
                            onClick={() => handleProductSelect(item.rowId, p)}
                          >
                            <p className="text-sm font-medium text-gray-900">{p.name}</p>
                            <p className="text-xs text-gray-400">SKU: {p.sku || '—'} · LKR {p.selling_price}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:contents gap-3">
                    {/* Quantity */}
                    <div className="md:col-span-2 relative">
                      <label className="block md:hidden text-xs text-gray-500 mb-1">Quantity</label>
                      <input
                        type="number" min="0.001" step="any" required
                        value={item.quantity || ''}
                        onChange={e => updateLineItem(item.rowId, { quantity: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm md:text-right focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      {item.product_unit && (
                        <span className="absolute right-3 top-1/2 md:translate-y-[-50%] text-xs text-gray-400 pointer-events-none mt-3 md:mt-0">
                          {item.product_unit}
                        </span>
                      )}
                    </div>

                    {/* Unit Price */}
                    <div className="md:col-span-2">
                      <label className="block md:hidden text-xs text-gray-500 mb-1">Unit Price</label>
                      <input
                        type="number" min="0" step="0.01" required
                        value={item.unit_price || ''}
                        onChange={e => updateLineItem(item.rowId, { unit_price: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm md:text-right focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:contents mt-2 md:mt-0">
                    {/* Total */}
                    <div className="md:col-span-2 py-2 text-sm font-medium md:text-right text-gray-900 tabular-nums">
                      <span className="md:hidden text-xs text-gray-500 mr-2">Total:</span>
                      {fmtLKR(item.total)}
                    </div>

                    {/* Remove */}
                    <div className="md:col-span-1 flex justify-end md:justify-center pt-1.5">
                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLineItem(item.rowId)}
                          className="p-1.5 text-gray-400 hover:text-red-600 transition-colors flex items-center gap-1 bg-gray-50 hover:bg-red-50 md:bg-transparent rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="md:hidden text-xs">Remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addLineItem}
              className="flex items-center gap-1.5 text-sm font-medium text-green-700 hover:text-green-800 hover:bg-green-50 px-3 py-2 rounded-lg transition-colors border border-transparent hover:border-green-200"
            >
              <Plus className="w-4 h-4" /> Add Row
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Summary */}
        <div className="w-full lg:w-80 shrink-0 lg:sticky top-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-gray-500" />
              Order Summary
            </h2>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Customer</span>
                <span className="font-medium text-gray-800 text-right max-w-32 truncate">
                  {selectedCustomer?.name || '—'}
                </span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Items Count</span>
                <span className="font-medium text-gray-800 text-right">{lineItems.filter(i => i.product_id).length}</span>
              </div>
              <div className="flex justify-between text-gray-500 pt-3 border-t border-gray-100">
                <span>Subtotal</span>
                <span className="font-medium text-gray-800 text-right">{fmtLKR(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-gray-500">
                <span>Discount</span>
                <input
                  type="number" min="0" step="0.01"
                  value={discount || ''}
                  onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-24 px-2 py-1 border border-gray-200 rounded-md text-sm text-right focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Total ({currency})</span>
                <span className="text-xl font-bold text-gray-900">{fmtLKR(total)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              {saving ? 'Saving...' : 'Create Draft Order'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="w-full text-sm text-gray-500 hover:text-gray-800 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}

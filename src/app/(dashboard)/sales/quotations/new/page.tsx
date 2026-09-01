'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ArrowLeft, Search, Plus, Trash2, X, FileText, Calculator } from 'lucide-react'

interface QuotationLineItem {
  rowId: string
  item_id: string
  material_name: string
  material_unit: string
  search: string
  showDropdown: boolean
  reference_po: string
  cut_size: string
  quantity: number
  unit_price: number
  total: number
}

// English number to words converter
function convertNumberToWords(num: number): string {
  if (num === 0) return 'ZERO RUPEES'
  if (num < 0) return 'NEGATIVE AMOUNT'

  const a = [
    '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'
  ]
  const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

  function g(n: number): string {
    if (n < 20) return a[n]
    const digit = n % 10
    return b[Math.floor(n / 10)] + (digit ? ' ' + a[digit] : '')
  }

  function h(n: number): string {
    if (n < 100) return g(n)
    const remainder = n % 100
    return a[Math.floor(n / 100)] + ' hundred' + (remainder ? ' and ' + g(remainder) : '')
  }

  function convert(n: number): string {
    if (n < 1000) return h(n)
    if (n < 1000000) {
      const remainder = n % 1000
      return h(Math.floor(n / 1000)) + ' thousand' + (remainder ? ' ' + h(remainder) : '')
    }
    if (n < 1000000000) {
      const remainder = n % 1000000
      return h(Math.floor(n / 1000000)) + ' million' + (remainder ? ' ' + convert(remainder) : '')
    }
    return 'amount too large'
  }

  const parts = num.toFixed(2).split('.')
  const integerPart = parseInt(parts[0])
  const decimalPart = parseInt(parts[1])

  let result = convert(integerPart) + ' rupees'
  if (decimalPart > 0) {
    result += ' and ' + g(decimalPart) + ' cents only'
  } else {
    result += ' only'
  }
  return result.toUpperCase()
}

export default function NewQuotationPage() {
  const router = useRouter()
  
  const [customers, setCustomers] = useState<any[]>([])
  const [materials, setMaterials] = useState<any[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Customer dropdown state
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)

  // Header form states
  const [validUntil, setValidUntil] = useState(() => {
    const today = new Date()
    today.setDate(today.getDate() + 30) // Default validity 30 days
    return today.toISOString().split('T')[0]
  })
  const [categoryType, setCategoryType] = useState<'Conventional' | 'Organic' | 'Fairtrade' | 'Organic & Fairtrade'>('Conventional')
  const [dispatchNo, setDispatchNo] = useState('')
  const [placeOfSupply, setPlaceOfSupply] = useState('')
  const [courierCharge, setCourierCharge] = useState(0)
  const [tcCharge, setTcCharge] = useState(0)
  const [modeOfPayment, setModeOfPayment] = useState('Bank Transfer')

  // Line items state
  const [lineItems, setLineItems] = useState<QuotationLineItem[]>([
    {
      rowId: crypto.randomUUID(),
      item_id: '',
      material_name: '',
      material_unit: '',
      search: '',
      showDropdown: false,
      reference_po: '',
      cut_size: '',
      quantity: 1,
      unit_price: 0,
      total: 0
    }
  ])

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      const [
        { data: customersData },
        { data: materialsData },
        { data: { user } }
      ] = await Promise.all([
        supabase.from('customers').select('id, name, type, country, currency, address').eq('is_active', true).order('name'),
        supabase.from('raw_materials').select('id, name, code, unit').eq('is_active', true).order('name'),
        supabase.auth.getUser()
      ])

      setCustomers(customersData ?? [])
      setMaterials(materialsData ?? [])
      setUserId(user?.id ?? null)
      setLoading(false)
    }
    loadData()
  }, [])

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        rowId: crypto.randomUUID(),
        item_id: '',
        material_name: '',
        material_unit: '',
        search: '',
        showDropdown: false,
        reference_po: '',
        cut_size: '',
        quantity: 1,
        unit_price: 0,
        total: 0
      }
    ])
  }

  const removeLineItem = (rowId: string) => {
    setLineItems(lineItems.filter(i => i.rowId !== rowId))
  }

  const updateLineItem = (rowId: string, updates: Partial<QuotationLineItem>) => {
    setLineItems(prev =>
      prev.map(item => {
        if (item.rowId === rowId) {
          const updated = { ...item, ...updates }
          updated.total = Number((updated.quantity * updated.unit_price).toFixed(2))
          return updated
        }
        return item
      })
    )
  }

  const handleMaterialSelect = (rowId: string, mat: any) => {
    updateLineItem(rowId, {
      item_id: mat.id,
      material_name: mat.name,
      material_unit: mat.unit,
      search: '',
      showDropdown: false,
      unit_price: 0
    })
  }

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  )

  // Calculations
  const totalValueOfSupply = lineItems.reduce((sum, item) => sum + item.total, 0)
  const grandTotal = totalValueOfSupply + Number(courierCharge || 0) + Number(tcCharge || 0)

  const formatCurrencyValue = (val: number) => {
    return val.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedCustomer) {
      toast.error('Please select a customer')
      return
    }
    if (lineItems.length === 0) {
      toast.error('Please add at least one line item')
      return
    }
    if (lineItems.some(i => !i.item_id)) {
      toast.error('All line items must have a raw material selected')
      return
    }
    if (lineItems.some(i => i.quantity <= 0)) {
      toast.error('Quantity must be greater than zero')
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/quotations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_id: selectedCustomer.id,
          valid_until: validUntil,
          total_amount: grandTotal,
          category_type: categoryType,
          dispatch_no: dispatchNo,
          place_of_supply: placeOfSupply,
          courier_charge: courierCharge,
          tc_charge: tcCharge,
          mode_of_payment: modeOfPayment,
          items: lineItems.map(item => ({
            item_id: item.item_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            reference_po: item.reference_po,
            cut_size: item.cut_size
          }))
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create quotation')
      }

      toast.success(`Quotation ${result.quotation_number} submitted for MD approval!`)
      router.push('/sales')
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
        <span className="ml-3 text-sm text-gray-500 font-medium">Loading form details...</span>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-6xl mx-auto space-y-6">
      {/* PAGE HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">New Sales Quotation</h1>
          <p className="text-sm text-gray-500 mt-1">Create quotation according to client's official specification</p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/sales')}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 bg-white rounded-lg px-3 py-2 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Main Form Fields */}
        <div className="flex-1 space-y-6 w-full">
          
          {/* Top Section: Customer, Address & Dates */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">Customer & Supply Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Dropdown */}
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Customer *</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                    placeholder="Type first letter to search customer..."
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
                          onClick={() => {
                            setSelectedCustomer(c)
                            setCustomerSearch('')
                            setShowCustomerDropdown(false)
                          }}
                        >
                          <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5 capitalize">{c.type} · {c.country}</p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Purchaser's Address (Auto-filled) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Purchaser's Address</label>
                <div className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-600 min-h-[42px] leading-tight">
                  {selectedCustomer ? (
                    <span>{selectedCustomer.address || 'No address specified'}, {selectedCustomer.country}</span>
                  ) : (
                    <span className="text-gray-400 italic">Select customer to display address</span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Document No.</label>
                <div className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-400 font-mono">
                  [Auto-Generated]
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Quotation Date</label>
                <div className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500">
                  {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Valid Until *</label>
                <input
                  type="date"
                  required
                  value={validUntil}
                  onChange={e => setValidUntil(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Supply details inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Dispatch No.</label>
                <input
                  type="text"
                  value={dispatchNo}
                  onChange={e => setDispatchNo(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  placeholder="e.g. DISP-2026-90"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Place of Supply</label>
                <input
                  type="text"
                  value={placeOfSupply}
                  onChange={e => setPlaceOfSupply(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  placeholder="e.g. Warehouse Port Authority, Colombo"
                />
              </div>
            </div>
          </div>

          {/* Category Selection */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Product Category Classification</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(['Conventional', 'Organic', 'Fairtrade', 'Organic & Fairtrade'] as const).map(cat => (
                <label key={cat} className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                  categoryType === cat 
                    ? 'border-green-600 bg-green-50 text-green-950 font-semibold' 
                    : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                }`}>
                  <input
                    type="radio"
                    name="categoryType"
                    value={cat}
                    checked={categoryType === cat}
                    onChange={() => setCategoryType(cat)}
                    className="w-4 h-4 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm">{cat}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Dynamic Line Items Grid */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm overflow-x-auto">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Quotation Lines</h2>
            
            <table className="w-full text-sm text-left border-collapse min-w-[900px]">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-3 w-40">Reference (PO NO)</th>
                  <th className="px-3 py-3">Description of Goods / Services *</th>
                  <th className="px-3 py-3 w-32">Cut Size</th>
                  <th className="px-3 py-3 w-28 text-right">Quantity</th>
                  <th className="px-3 py-3 w-32 text-right">Unit Price</th>
                  <th className="px-3 py-3 w-36 text-right">Amount (Rs.)</th>
                  <th className="px-3 py-3 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lineItems.map((item) => (
                  <tr key={item.rowId} className="hover:bg-gray-50/50 transition-colors">
                    {/* Reference (PO No) */}
                    <td className="px-3 py-3">
                      <input
                        type="text"
                        value={item.reference_po}
                        onChange={e => updateLineItem(item.rowId, { reference_po: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
                        placeholder="PO-XXXX"
                      />
                    </td>

                    {/* Item selector */}
                    <td className="px-3 py-3 relative">
                      <div className="relative">
                        <input
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                          placeholder="Select raw material..."
                          value={item.material_name || item.search}
                          onChange={(e) => {
                            updateLineItem(item.rowId, { search: e.target.value, item_id: '', material_name: '', showDropdown: true })
                          }}
                          onFocus={() => updateLineItem(item.rowId, { showDropdown: true })}
                          autoComplete="off"
                        />
                        {item.item_id && (
                          <button
                            type="button"
                            onClick={() => updateLineItem(item.rowId, { item_id: '', material_name: '', search: '', showDropdown: true })}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {item.showDropdown && !item.item_id && (
                        <div className="absolute left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                          {materials
                            .filter(m => m.name.toLowerCase().includes(item.search.toLowerCase()))
                            .map(m => (
                              <button
                                key={m.id} type="button"
                                className="w-full text-left px-3 py-2 hover:bg-green-50 transition-colors border-b border-gray-50 last:border-0"
                                onClick={() => handleMaterialSelect(item.rowId, m)}
                              >
                                <p className="text-sm font-semibold text-gray-900">{m.name}</p>
                                <p className="text-xs text-gray-400 mt-0.5">Code: {m.code || '—'} · Unit: {m.unit}</p>
                              </button>
                            ))}
                        </div>
                      )}
                    </td>

                    {/* Cut Size */}
                    <td className="px-3 py-3">
                      <input
                        type="text"
                        value={item.cut_size}
                        onChange={e => updateLineItem(item.rowId, { cut_size: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="e.g. 5mm, Large"
                      />
                    </td>

                    {/* Quantity */}
                    <td className="px-3 py-3 relative">
                      <div className="relative">
                        <input
                          type="number" min="0.001" step="any" required
                          value={item.quantity || ''}
                          onChange={e => updateLineItem(item.rowId, { quantity: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-green-500 pr-8"
                        />
                        {item.material_unit && (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-semibold pointer-events-none">
                            {item.material_unit}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Unit Price */}
                    <td className="px-3 py-3">
                      <input
                        type="number" min="0" step="0.01" required
                        value={item.unit_price || ''}
                        onChange={e => updateLineItem(item.rowId, { unit_price: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </td>

                    {/* Total price */}
                    <td className="px-3 py-3 text-right font-bold text-gray-900">
                      Rs. {formatCurrencyValue(item.total)}
                    </td>

                    {/* Trash Action */}
                    <td className="px-3 py-3 text-center">
                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLineItem(item.rowId)}
                          className="text-gray-400 hover:text-red-600 transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button
              type="button"
              onClick={addLineItem}
              className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-800 hover:bg-green-50 px-3 py-2 rounded-lg transition-colors border border-transparent hover:border-green-200"
            >
              <Plus className="w-4 h-4" /> Add Item Row
            </button>
          </div>

          {/* Bottom Section: Total in Words and Payment Mode */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Total Amount in Words</label>
              <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 tracking-wide leading-relaxed">
                {convertNumberToWords(grandTotal)}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mode of Payment *</label>
                <select
                  value={modeOfPayment}
                  onChange={e => setModeOfPayment(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                  {['Bank Transfer', 'Cash', 'Cheque', 'Credit Card', 'Letter of Credit', 'DP/DA'].map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

        </div>

        {/* Side Panel: Summary, Extras, Submit */}
        <div className="w-full lg:w-80 shrink-0 lg:sticky top-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-2">
              <Calculator className="w-4 h-4 text-gray-500" />
              Summary
            </h2>
            
            <div className="space-y-3 text-sm pt-2 border-b border-gray-100 pb-4">
              <div className="flex justify-between text-gray-500">
                <span>Value of Supply</span>
                <span className="font-semibold text-gray-900">Rs. {formatCurrencyValue(totalValueOfSupply)}</span>
              </div>
              
              {/* Courier Charge Input */}
              <div className="space-y-1">
                <span className="text-gray-500 text-xs block">Courier Charge (Rs.)</span>
                <input
                  type="number" min="0" step="0.01"
                  value={courierCharge || ''}
                  onChange={e => setCourierCharge(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-right font-medium"
                />
              </div>

              {/* TC Charge Input */}
              <div className="space-y-1">
                <span className="text-gray-500 text-xs block">TC Charge (Rs.)</span>
                <input
                  type="number" min="0" step="0.01"
                  value={tcCharge || ''}
                  onChange={e => setTcCharge(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-right font-medium"
                />
              </div>
            </div>

            <div className="bg-green-50/50 border border-green-200 rounded-lg p-4 mt-2">
              <span className="text-green-900 font-semibold text-xs block uppercase tracking-wider mb-1">Grand Total</span>
              <span className="text-2xl font-black text-green-950">Rs. {formatCurrencyValue(grandTotal)}</span>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-colors text-sm shadow-sm"
            >
              <FileText className="w-4 h-4" />
              {saving ? 'Submitting...' : 'Submit for MD Approval'}
            </button>
            
            <button
              type="button"
              onClick={() => router.push('/sales')}
              className="w-full text-sm text-gray-600 hover:text-gray-900 py-2 rounded-lg border border-gray-200 hover:border-gray-300 bg-white transition-colors shadow-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}

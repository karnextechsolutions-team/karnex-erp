'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle, XCircle, Printer } from 'lucide-react'

// Convert number to words helper
function numberToWords(num: number): string {
  if (num === 0) return 'ZERO'
  
  const a = ['','ONE ','TWO ','THREE ','FOUR ', 'FIVE ','SIX ','SEVEN ','EIGHT ','NINE ','TEN ','ELEVEN ','TWELVE ','THIRTEEN ','FOURTEEN ','FIFTEEN ','SIXTEEN ','SEVENTEEN ','EIGHTEEN ','NINETEEN ']
  const b = ['', '', 'TWENTY','THIRTY','FORTY','FIFTY', 'SIXTY','SEVENTY','EIGHTY','NINETY']

  const convert = (n: number): string => {
    if (n < 20) return a[n]
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '')
    if (n < 1000) return a[Math.floor(n / 100)] + 'HUNDRED ' + (n % 100 !== 0 ? 'AND ' + convert(n % 100) : '')
    if (n < 1000000) return convert(Math.floor(n / 1000)) + 'THOUSAND ' + (n % 1000 !== 0 ? convert(n % 1000) : '')
    if (n < 1000000000) return convert(Math.floor(n / 1000000)) + 'MILLION ' + (n % 1000000 !== 0 ? convert(n % 1000000) : '')
    return ''
  }

  const integerPart = Math.floor(num)
  const decimalPart = Math.round((num - integerPart) * 100)
  
  let str = convert(integerPart) + 'RUPEES'
  if (decimalPart > 0) {
    str += ' AND ' + convert(decimalPart) + 'CENTS'
  }
  return str + ' ONLY'
}

export default function QuotationViewPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const quotationId = resolvedParams.id
  
  const [quotation, setQuotation] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState('')

  const fetchQuotationData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        setUserRole((profile?.role || '').toLowerCase())
      }

      const { data: headerData, error: headerError } = await supabase
        .from('quotations')
        .select('*, customers(*)')
        .eq('id', quotationId)
        .single()
        
      if (headerError) throw headerError
      setQuotation(headerData)

      const { data: itemsData, error: itemsError } = await supabase
        .from('quotation_items')
        .select('*, raw_materials(name)')
        .eq('quotation_id', quotationId)
        
      if (itemsError) throw itemsError
      setItems(itemsData || [])
      
    } catch (err: any) {
      toast.error('Failed to load quotation: ' + err.message)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuotationData()
  }, [quotationId])

  async function handleQuotationApproval(status: 'Approved' | 'Rejected') {
    try {
      const res = await fetch(`/api/quotations/${quotationId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ md_approval_status: status })
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to update status')
      toast.success(`Quotation ${status} successfully`)
      fetchQuotationData()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function handleConvertToSO() {
    const toastId = toast.loading('Converting to Sales Order...')
    try {
      const res = await fetch(`/api/quotations/${quotationId}/convert`, { method: 'POST' })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to convert to Sales Order')
      toast.success(`Converted to Sales Order ${result.so_number}`, { id: toastId })
      fetchQuotationData()
      router.push('/sales')
    } catch (err: any) {
      toast.error(err.message, { id: toastId })
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading quotation details...</div>
  if (!quotation) return <div className="p-8 text-center text-red-500">Quotation not found.</div>

  const canApprove = ['admin', 'manager', 'md'].includes(userRole)
  const isPending = quotation.md_approval_status === 'Pending Approval'
  const isApproved = quotation.md_approval_status === 'Approved'
  const notConverted = quotation.status !== 'Converted to SO'

  const valueOfSupply = items.reduce((sum, it) => sum + Number(it.total_price), 0)
  const courierCharge = Number(quotation.courier_charge) || 0
  const tcCharge = Number(quotation.tc_charge) || 0
  const grandTotal = valueOfSupply + courierCharge + tcCharge

  const formatDate = (dateStr: string) => dateStr ? new Date(dateStr).toLocaleDateString('en-GB') : '—'

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 print:max-w-none print:m-0 print:p-0 print:space-y-0 text-black">
      
      {/* Action Buttons (Hidden on Print) */}
      <div className="flex items-center justify-between mb-4 print:hidden">
        <button
          onClick={() => router.push('/sales')}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Sales
        </button>
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className="text-gray-500">Status: </span>
            <span className={`font-semibold ${isPending ? 'text-amber-600' : quotation.md_approval_status === 'Approved' ? 'text-green-600' : 'text-red-600'}`}>
              {quotation.md_approval_status}
            </span>
          </div>
          <div className="flex gap-2">
            {isPending && canApprove && (
              <>
                <button
                  onClick={() => handleQuotationApproval('Approved')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  <CheckCircle className="w-4 h-4" /> Approve
                </button>
                <button
                  onClick={() => handleQuotationApproval('Rejected')}
                  className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm font-semibold transition-colors"
                >
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </>
            )}
            {isApproved && notConverted && (
              <button
                onClick={handleConvertToSO}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                + Convert to SO
              </button>
            )}
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>
        </div>
      </div>

      {/* A4 Document Container */}
      <div className="bg-white border border-gray-200 rounded shadow-sm p-10 print:border-none print:shadow-none print:p-0">
        
        {/* Document Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="w-24 h-24 bg-gray-100 flex items-center justify-center rounded border border-gray-300 text-xs text-gray-400">
            [Logo]
          </div>
          <div className="flex-1 text-center">
            <h1 className="text-2xl font-bold text-black tracking-tight">S L NATURAL SPICE & HERBAL PRODUCTS</h1>
            <p className="text-sm font-medium mt-1">
              Arangala, Naula, Matale, Sri Lanka | Register No - MPS/NDS/E 410C/812
            </p>
            <p className="text-sm font-medium">
              Tel/Fax: 066-2246758 | slnaturalspice.herbalproducts@gmail.com
            </p>
          </div>
          <div className="w-24"></div> {/* Spacer for centering */}
        </div>

        {/* Title */}
        <div className="flex justify-center mb-6">
          <div className="border-2 border-black px-6 py-2">
            <h2 className="text-xl font-bold uppercase tracking-widest">Quotation</h2>
          </div>
        </div>

        {/* Details Grid (Supplier & Purchaser) */}
        <div className="grid grid-cols-2 gap-4 border border-black mb-6">
          {/* Left Column - Supplier */}
          <div className="p-3 border-r border-black">
            <p className="text-sm"><span className="font-bold">Supplier's Name:</span> S L NATURAL SPICE & HERBAL PRODUCTS</p>
            <p className="text-sm mt-1 whitespace-pre-wrap">Arangala, Naula, Matale, Sri Lanka.</p>
          </div>
          
          {/* Right Column - Purchaser */}
          <div className="p-3">
            <p className="text-sm"><span className="font-bold">Purchaser's Name:</span> {quotation.customers?.name}</p>
            <p className="text-sm mt-1 whitespace-pre-wrap"><span className="font-bold">Purchaser's Address:</span> {quotation.customers?.address || '—'}</p>
          </div>
        </div>

        {/* Meta Details Grid */}
        <div className="grid grid-cols-5 gap-0 border border-black mb-6 text-sm">
          <div className="p-2 border-r border-black font-semibold text-center bg-gray-50/50 print:bg-transparent">Document No</div>
          <div className="p-2 border-r border-black font-semibold text-center bg-gray-50/50 print:bg-transparent">Date</div>
          <div className="p-2 border-r border-black font-semibold text-center bg-gray-50/50 print:bg-transparent">Dispatch No</div>
          <div className="p-2 border-r border-black font-semibold text-center bg-gray-50/50 print:bg-transparent">Place of Supply</div>
          <div className="p-2 font-semibold text-center bg-gray-50/50 print:bg-transparent">Valid Until</div>
          
          <div className="p-2 border-t border-r border-black text-center">{quotation.quotation_number}</div>
          <div className="p-2 border-t border-r border-black text-center">{formatDate(quotation.created_at)}</div>
          <div className="p-2 border-t border-r border-black text-center">{quotation.dispatch_no || '—'}</div>
          <div className="p-2 border-t border-r border-black text-center">{quotation.place_of_supply || '—'}</div>
          <div className="p-2 border-t border-black text-center">{formatDate(quotation.valid_until)}</div>
        </div>

        <div className="mb-4 text-sm font-semibold">
          Category: <span className="font-normal">{quotation.category_type}</span>
        </div>

        {/* Line Items Table */}
        <div className="mb-6">
          <table className="w-full text-left border-collapse border border-black text-sm">
            <thead className="bg-gray-100 print:bg-transparent">
              <tr>
                <th className="p-2 border border-black font-semibold text-center">Ref (PO No)</th>
                <th className="p-2 border border-black font-semibold text-center">Description of Goods</th>
                <th className="p-2 border border-black font-semibold text-center">Cut Size</th>
                <th className="p-2 border border-black font-semibold text-center">Qty</th>
                <th className="p-2 border border-black font-semibold text-center">Unit Price ({quotation.customers?.currency})</th>
                <th className="p-2 border border-black font-semibold text-center">Amount ({quotation.customers?.currency})</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="p-2 border border-black text-center">{item.reference_po || '-'}</td>
                  <td className="p-2 border border-black">{item.raw_materials?.name || 'Unknown Item'}</td>
                  <td className="p-2 border border-black text-center">{item.cut_size || '-'}</td>
                  <td className="p-2 border border-black text-right">{item.quantity}</td>
                  <td className="p-2 border border-black text-right">{Number(item.unit_price).toLocaleString('en-US', {minimumFractionDigits:2})}</td>
                  <td className="p-2 border border-black text-right">
                    {Number(item.total_price).toLocaleString('en-US', {minimumFractionDigits:2})}
                  </td>
                </tr>
              ))}
              {/* Empty Rows to pad table slightly if needed for visual match, skipped for brevity */}
            </tbody>
            
            {/* Table Footer Totals */}
            <tfoot>
              <tr>
                <td colSpan={5} className="p-2 border border-black text-right font-semibold">Value of Supply</td>
                <td className="p-2 border border-black text-right">{valueOfSupply.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
              </tr>
              <tr>
                <td colSpan={5} className="p-2 border border-black text-right font-semibold">Courier Charge</td>
                <td className="p-2 border border-black text-right">{courierCharge.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
              </tr>
              <tr>
                <td colSpan={5} className="p-2 border border-black text-right font-semibold">TC Charge</td>
                <td className="p-2 border border-black text-right">{tcCharge.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
              </tr>
              <tr>
                <td colSpan={5} className="p-2 border border-black text-right font-bold text-base">Grand Total</td>
                <td className="p-2 border border-black text-right font-bold text-base">{grandTotal.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Amount in Words & Payment Mode */}
        <div className="mb-12">
          <p className="text-sm mb-2"><span className="font-bold">Total Amount in Words:</span> {numberToWords(grandTotal)}</p>
          <p className="text-sm"><span className="font-bold">Mode of Payment:</span> {quotation.mode_of_payment || '—'}</p>
        </div>

        {/* Signatures */}
        <div className="flex justify-between items-end mb-8 mt-16 px-10">
          <div className="text-center w-48">
            <div className="border-t border-black pt-2 text-sm font-semibold">Accountant Signature</div>
          </div>
          <div className="text-center w-48">
            <div className="border-t border-black pt-2 text-sm font-semibold">Customer Signature</div>
          </div>
        </div>

        {/* Footer Details */}
        <div className="border-t border-black pt-4 mt-8">
          <p className="text-sm font-bold text-center mb-6">
            All payments must be made within 30 days from the date of invoice.
          </p>
          
          <div className="text-sm">
            <p className="font-bold mb-1">Bank Details:</p>
            <p><span className="font-semibold w-32 inline-block">Bank Name:</span> DFCC Bank</p>
            <p><span className="font-semibold w-32 inline-block">Account Name:</span> S L Natural Spice & Herbal Products</p>
            <p><span className="font-semibold w-32 inline-block">Account Number:</span> 101001386795</p>
            <p><span className="font-semibold w-32 inline-block">Branch:</span> Naula Branch</p>
          </div>
        </div>

      </div>
    </div>
  )
}

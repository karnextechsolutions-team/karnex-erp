'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  DollarSign, TrendingUp, TrendingDown, AlertCircle,
  Plus, Search, X, ChevronDown, Receipt, Package,
  BarChart3, Clock, CheckCircle, AlertTriangle, Trash2, Eye
} from 'lucide-react'

type FinanceTab = 'overview' | 'receivable' | 'payable' | 'aging' | 'expenses' | 'cogs'

const tabs: { key: FinanceTab, label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'receivable', label: 'Receivable' },
  { key: 'payable', label: 'Payable' },
  { key: 'aging', label: 'Aging Report' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'cogs', label: 'Cost Analysis' }
]

export default function FinancePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<FinanceTab>('overview')

  const [invoices, setInvoices] = useState<any[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [workOrders, setWorkOrders] = useState<any[]>([])
  const [salesOrders, setSalesOrders] = useState<any[]>([])
  const [userId, setUserId] = useState<string|null>(null)
  const [loading, setLoading] = useState(true)

  // AR state
  const [arSearch, setArSearch] = useState('')
  const [arStatusFilter, setArStatusFilter] = useState('all')
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer')
  const [paymentRef, setPaymentRef] = useState('')
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0])

  // AP state
  const [apSearch, setApSearch] = useState('')
  const [apStatusFilter, setApStatusFilter] = useState('all')

  // Expenses state
  const [expSearch, setExpSearch] = useState('')
  const [expCategoryFilter, setExpCategoryFilter] = useState('all')
  const [showAddExp, setShowAddExp] = useState(false)
  const [expForm, setExpForm] = useState({
    category: '', description: '', amount: 0,
    expense_date: new Date().toISOString().split('T')[0], notes: ''
  })
  const [dateRange, setDateRange] = useState<'month'|'lastMonth'|'year'|'all'>('month')

  // COGS state
  const [cogsSearch, setCogsSearch] = useState('')

  const categories = [
    'Utilities', 'Wages & Salaries', 'Transport & Logistics',
    'Maintenance & Repairs', 'Office & Admin', 'Marketing',
    'Raw Material (Other)', 'Equipment', 'Rent', 'Other'
  ]

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const supabase = createClient()
    const [
      { data: invData },
      { data: poData },
      { data: expData },
      { data: woData },
      { data: soData },
      { data: { user } }
    ] = await Promise.all([
      supabase.from('invoices')
        .select('*, sales_orders(so_number, order_date, customers(name, type, country))')
        .order('created_at', { ascending: false }),
      supabase.from('purchase_orders')
        .select('*, suppliers(name)')
        .in('status', ['sent','partial','received'])
        .order('created_at', { ascending: false }),
      supabase.from('expenses')
        .select('*, profiles!paid_by(full_name)')
        .order('expense_date', { ascending: false }),
      supabase.from('work_orders')
        .select('*, products(name, sku, unit, selling_price, cost_price)')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false }),
      supabase.from('sales_orders')
        .select('*, customers(name, type, country, currency)')
        .in('status', ['confirmed','dispatched','delivered'])
        .order('created_at', { ascending: false }),
      supabase.auth.getUser()
    ])
    setInvoices(invData ?? [])
    setPurchaseOrders(poData ?? [])
    setExpenses(expData ?? [])
    setWorkOrders(woData ?? [])
    setSalesOrders(soData ?? [])
    setUserId(user?.id ?? null)
    setLoading(false)
  }

  // Formatting helpers
  const fmtLKR = (n: number) => 'LKR ' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
  const daysDiff = (dateStr: string) => Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
  const daysUntil = (dateStr: string) => Math.floor((new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

  const catColor = (cat: string) => {
    const colors = ['bg-blue-100 text-blue-700','bg-green-100 text-green-700','bg-amber-100 text-amber-700','bg-purple-100 text-purple-700','bg-red-100 text-red-700','bg-teal-100 text-teal-700']
    const idx = (cat || '').charCodeAt(0) % colors.length
    return colors[idx]
  }

  // Derived Totals
  const totalReceivable = invoices
    .filter(i => ['unpaid','partial','overdue'].includes(i.status))
    .reduce((sum, i) => sum + ((i.total_amount || 0) - (i.amount_paid || 0)), 0)

  const totalPayable = purchaseOrders
    .filter(po => po.status !== 'cancelled')
    .reduce((sum, po) => sum + (po.total_amount ?? 0), 0)

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0)

  const overdueInvoices = invoices.filter(i => {
    if (!i.due_date) return false
    return i.status !== 'paid' && i.status !== 'cancelled' && new Date(i.due_date) < new Date()
  })

  const thisMonthExpenses = expenses.filter(e => {
    const d = new Date(e.expense_date)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).reduce((sum, e) => sum + e.amount, 0)

  // 1. OVERVIEW RENDERING
  const renderOverview = () => {
    const expByCategory = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount
      return acc
    }, {} as Record<string, number>)
    const categoryBreakdown = (Object.entries(expByCategory) as [string, number][]).map(([cat, total]) => ({
      category: cat, total, pct: ((total / (totalExpenses || 1)) * 100).toFixed(1)
    })).sort((a, b) => b.total - a.total)
    
    const palette = ['#2D6A4F','#40916C','#52B788','#74C69D','#95D5B2','#B7E4C7']

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <TrendingUp className="w-5 h-5" />
              <span className="text-xs uppercase tracking-wide font-medium text-gray-500">Total Receivable</span>
            </div>
            <p className="text-xl font-bold text-gray-900 truncate" title={fmtLKR(totalReceivable)}>{fmtLKR(totalReceivable)}</p>
            <p className="text-xs text-gray-400 mt-1">{invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').length} unpaid invoices</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <TrendingDown className="w-5 h-5" />
              <span className="text-xs uppercase tracking-wide font-medium text-gray-500">Total Payable</span>
            </div>
            <p className="text-xl font-bold text-gray-900 truncate" title={fmtLKR(totalPayable)}>{fmtLKR(totalPayable)}</p>
            <p className="text-xs text-gray-400 mt-1">{purchaseOrders.length} purchase orders</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <AlertCircle className="w-5 h-5" />
              <span className="text-xs uppercase tracking-wide font-medium text-gray-500">Overdue Invoices</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{overdueInvoices.length}</p>
            <p className="text-xs text-gray-400 mt-1">
              {fmtLKR(overdueInvoices.reduce((s,i) => s + ((i.total_amount||0)-(i.amount_paid||0)), 0))} outstanding
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-purple-600 mb-2">
              <Receipt className="w-5 h-5" />
              <span className="text-xs uppercase tracking-wide font-medium text-gray-500">This Month Expenses</span>
            </div>
            <p className="text-xl font-bold text-gray-900 truncate" title={fmtLKR(thisMonthExpenses)}>{fmtLKR(thisMonthExpenses)}</p>
            <p className="text-xs text-gray-400 mt-1">
              {expenses.filter(e => new Date(e.expense_date).getMonth() === new Date().getMonth()).length} entries
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Invoices</h3>
            <div className="space-y-3">
              {invoices.slice(0,5).map(inv => (
                <div key={inv.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{inv.invoice_number}</p>
                    <p className="text-xs text-gray-500">{inv.sales_orders?.customers?.name || '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{fmtLKR(inv.total_amount)}</p>
                    <p className={`text-xs mt-0.5 ${inv.status === 'paid' ? 'text-green-600' : inv.status === 'overdue' ? 'text-red-600 font-bold' : inv.status === 'partial' ? 'text-amber-600' : 'text-gray-500'}`}>
                      {inv.status.toUpperCase()}
                    </p>
                  </div>
                </div>
              ))}
              {invoices.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No invoices yet.</p>}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Expenses by Category</h3>
            <div className="space-y-1">
              {categoryBreakdown.map((item, idx) => (
                <div key={item.category} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{background: palette[idx % palette.length]}}/>
                    <span className="text-sm text-gray-700">{item.category}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{fmtLKR(item.total)}</p>
                    <p className="text-xs text-gray-400">{item.pct}% of total</p>
                  </div>
                </div>
              ))}
              {categoryBreakdown.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No expenses recorded.</p>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 2. RECEIVABLE (AR)
  const renderReceivable = () => {
    const pendingSalesOrders = salesOrders.filter(so => !invoices.find(inv => inv.so_id === so.id))

    const filtered = invoices.filter(i => {
      const matchSearch =
        (i.invoice_number ?? '').toLowerCase().includes(arSearch.toLowerCase()) ||
        (i.sales_orders?.customers?.name ?? '').toLowerCase().includes(arSearch.toLowerCase())
      const matchStatus = arStatusFilter === 'all' || i.status === arStatusFilter
      return matchSearch && matchStatus
    })

    const handleCreateInvoice = async (order: any) => {
      const supabase = createClient()
      const invNumber = 'INV-' + new Date().getFullYear().toString().slice(-2) + '-' + Math.floor(1000 + Math.random() * 9000)
      const due = new Date()
      due.setDate(due.getDate() + 30)

      const { error } = await supabase.from('invoices').insert({
        invoice_number: invNumber,
        so_id: order.id,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: due.toISOString().split('T')[0],
        total_amount: order.total_amount,
        amount_paid: 0,
        status: 'unpaid'
      })
      if (error) toast.error(error.message)
      else { toast.success('Invoice created!'); fetchAll() }
    }

    const handleRecordPayment = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!selectedInvoice) return
      
      const supabase = createClient()
      
      const { error: payError } = await supabase.from('payments').insert({
        invoice_id: selectedInvoice.id,
        payment_date: paymentDate,
        amount: paymentAmount,
        method: paymentMethod,
        reference: paymentRef || null,
        created_by: userId
      })

      if (payError) { toast.error(payError.message); return }

      const newPaid = (selectedInvoice.amount_paid ?? 0) + paymentAmount
      const newStatus = newPaid >= selectedInvoice.total_amount ? 'paid' : 'partial'
      
      const { error: invError } = await supabase.from('invoices').update({
        amount_paid: newPaid,
        status: newStatus
      }).eq('id', selectedInvoice.id)

      if (invError) { toast.error(invError.message); return }
      
      toast.success('Payment recorded!')
      setShowPaymentDialog(false)
      fetchAll()
    }

    const balanceSum = filtered.filter(i => i.status !== 'paid' && i.status !== 'cancelled').reduce((sum, i) => sum + ((i.total_amount||0)-(i.amount_paid||0)), 0)

    return (
      <div className="space-y-6">
        {pendingSalesOrders.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
            <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4"/> Pending Invoices ({pendingSalesOrders.length})
            </h3>
            <div className="space-y-2">
              {pendingSalesOrders.map(so => (
                <div key={so.id} className="flex justify-between items-center bg-white border border-blue-100 rounded-lg p-3 shadow-sm">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{so.so_number} - {so.customers?.name}</p>
                    <p className="text-xs text-gray-500">Delivered/Confirmed on {fmtDate(so.order_date)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">{fmtLKR(so.total_amount)}</span>
                    <button onClick={() => handleCreateInvoice(so)} className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md transition-colors">
                      Generate Invoice
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Search invoices..." value={arSearch} onChange={e => setArSearch(e.target.value)} />
          </div>
          <select value={arStatusFilter} onChange={e => setArStatusFilter(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="all">All Status</option>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice #</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">SO Number</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Due Date</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Balance</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(i => {
                    const balance = (i.total_amount || 0) - (i.amount_paid || 0)
                    const isOverdue = new Date(i.due_date) < new Date() && i.status !== 'paid'
                    const daysToDue = daysUntil(i.due_date)
                    
                    return (
                      <tr key={i.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{i.invoice_number}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{i.sales_orders?.customers?.name || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{i.sales_orders?.so_number || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{fmtDate(i.invoice_date)}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className={isOverdue ? 'text-red-600 font-medium' : daysToDue <= 7 ? 'text-amber-600 font-medium' : 'text-gray-700'}>
                            {fmtDate(i.due_date)}
                          </div>
                          {!['paid','cancelled'].includes(i.status) && (
                            <div className={`text-[10px] mt-0.5 ${isOverdue ? 'text-red-500' : daysToDue <= 7 ? 'text-amber-500' : 'text-gray-400'}`}>
                              {isOverdue ? `${daysDiff(i.due_date)} days overdue` : `Due in ${daysToDue} days`}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium text-right">{fmtLKR(i.total_amount)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-bold text-right">{fmtLKR(balance)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium uppercase tracking-wider
                            ${i.status === 'paid' ? 'bg-green-100 text-green-700' : i.status === 'unpaid' ? 'bg-red-100 text-red-700' : i.status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'}`}>
                            {isOverdue && i.status !== 'paid' ? 'overdue' : i.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {['unpaid','partial','overdue'].includes(i.status) && (
                            <button onClick={() => {
                              setSelectedInvoice(i)
                              setPaymentAmount(balance)
                              setShowPaymentDialog(true)
                            }} className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md transition-colors font-medium">
                              Record Payment
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500">No invoices found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="md:hidden space-y-3 p-4 bg-gray-50">
              {filtered.map(i => {
                const balance = (i.total_amount || 0) - (i.amount_paid || 0)
                const isOverdue = new Date(i.due_date) < new Date() && i.status !== 'paid'
                const daysToDue = daysUntil(i.due_date)
                
                return (
                  <div key={i.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{i.invoice_number}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{i.sales_orders?.customers?.name || '—'}</p>
                      </div>
                      <span className={`inline-flex px-2 py-0.5 text-[10px] rounded-full font-medium uppercase tracking-wider ${i.status === 'paid' ? 'bg-green-100 text-green-700' : i.status === 'unpaid' ? 'bg-red-100 text-red-700' : i.status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'}`}>
                        {isOverdue && i.status !== 'paid' ? 'overdue' : i.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
                      <div><span className="text-gray-400">Total: </span><span className="font-medium text-gray-900">{fmtLKR(i.total_amount)}</span></div>
                      <div><span className="text-gray-400">Due Date: </span><span className={isOverdue ? 'text-red-600 font-medium' : daysToDue <= 7 ? 'text-amber-600 font-medium' : 'text-gray-700'}>{fmtDate(i.due_date)}</span></div>
                      <div className="col-span-2"><span className="text-gray-400">Balance: </span><span className="font-bold text-gray-900">{fmtLKR(balance)}</span></div>
                    </div>
                    {['unpaid','partial','overdue'].includes(i.status) && (
                      <div className="flex pt-3 border-t border-gray-100">
                        <button onClick={() => { setSelectedInvoice(i); setPaymentAmount(balance); setShowPaymentDialog(true) }}
                          className="flex-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-medium transition-colors">
                          Record Payment
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
          <div className="flex justify-between items-center p-4 bg-gray-50 border-t border-gray-200">
            <span className="text-sm font-medium text-gray-700">Filtered Outstanding Balance</span>
            <span className="text-lg font-bold text-gray-900">{fmtLKR(balanceSum)}</span>
          </div>
        </div>

        {showPaymentDialog && selectedInvoice && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-lg p-6">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-semibold text-gray-900">Record Payment</h2>
                <button onClick={() => setShowPaymentDialog(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 mb-5 border border-gray-100 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-gray-500">Invoice:</span><span className="font-medium text-gray-900">{selectedInvoice.invoice_number}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Customer:</span><span className="font-medium text-gray-900">{selectedInvoice.sales_orders?.customers?.name}</span></div>
                <div className="flex justify-between text-sm border-t border-gray-200 pt-2"><span className="text-gray-500">Balance Due:</span><span className="font-bold text-gray-900">{fmtLKR((selectedInvoice.total_amount||0) - (selectedInvoice.amount_paid||0))}</span></div>
              </div>
              <form onSubmit={handleRecordPayment} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Date *</label>
                    <input type="date" required value={paymentDate} onChange={e => setPaymentDate(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount *</label>
                    <input type="number" step="0.01" max={(selectedInvoice.total_amount||0) - (selectedInvoice.amount_paid||0)} required value={paymentAmount} onChange={e => setPaymentAmount(parseFloat(e.target.value))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Method</label>
                    <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cash">Cash</option>
                      <option value="cheque">Cheque</option>
                      <option value="online">Online</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Reference No.</label>
                    <input type="text" value={paymentRef} onChange={e => setPaymentRef(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                </div>
                <div className="flex gap-3 pt-4 mt-2">
                  <button type="button" onClick={() => setShowPaymentDialog(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="flex-1 bg-green-700 hover:bg-green-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">Save Payment</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  // 3. PAYABLE (AP)
  const renderPayable = () => {
    const filtered = purchaseOrders.filter(po => {
      const matchSearch =
        (po.po_number ?? '').toLowerCase().includes(apSearch.toLowerCase()) ||
        (po.suppliers?.name ?? '').toLowerCase().includes(apSearch.toLowerCase())
      const matchStatus = apStatusFilter === 'all' || po.status === apStatusFilter
      return matchSearch && matchStatus
    })

    const getStatusBadge = (status: string) => {
      const map: Record<string, string> = {
        draft: 'bg-slate-100 text-slate-600', sent: 'bg-blue-100 text-blue-700',
        partial: 'bg-amber-100 text-amber-700', received: 'bg-green-100 text-green-700',
        cancelled: 'bg-red-100 text-red-600'
      }
      return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${map[status] || map.draft}`}>{status}</span>
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Search purchase orders..." value={apSearch} onChange={e => setApSearch(e.target.value)} />
          </div>
          <select value={apStatusFilter} onChange={e => setApStatusFilter(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="all">All Status</option>
            <option value="sent">Sent</option>
            <option value="partial">Partial</option>
            <option value="received">Received</option>
          </select>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">PO Number</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Supplier</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Order Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Expected</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Amount</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment Terms</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(po => {
                    const needsAdvance = po.status === 'sent' && po.payment_terms?.includes('Advance')
                    return (
                      <tr key={po.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{po.po_number}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{po.suppliers?.name || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{fmtDate(po.order_date)}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{fmtDate(po.expected_date)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{fmtLKR(po.total_amount)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-center">
                          {po.payment_terms || '—'}
                          {needsAdvance && <div className="text-[10px] text-amber-600 font-medium mt-0.5">Advance Due</div>}
                        </td>
                        <td className="px-4 py-3 text-center">{getStatusBadge(po.status)}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => router.push('/procurement/' + po.id)}
                            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md transition-colors font-medium">
                            View PO
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">No purchase orders found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="md:hidden space-y-3 p-4 bg-gray-50">
              {filtered.map(po => {
                const needsAdvance = po.status === 'sent' && po.payment_terms?.includes('Advance')
                return (
                  <div key={po.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{po.po_number}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{po.suppliers?.name || '—'}</p>
                      </div>
                      {getStatusBadge(po.status)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
                      <div><span className="text-gray-400">Expected: </span>{fmtDate(po.expected_date)}</div>
                      <div><span className="text-gray-400">Terms: </span>{po.payment_terms || '—'} {needsAdvance && <span className="text-[10px] text-amber-600 font-medium">(Adv. Due)</span>}</div>
                      <div className="col-span-2"><span className="text-gray-400">Total: </span><span className="font-semibold text-gray-900">{fmtLKR(po.total_amount)}</span></div>
                    </div>
                    <div className="flex pt-3 border-t border-gray-100">
                      <button onClick={() => router.push('/procurement/' + po.id)}
                        className="flex-1 text-xs border border-gray-200 text-gray-600 py-1.5 rounded-lg flex items-center justify-center gap-1 hover:bg-gray-50">
                        <Eye className="w-3.5 h-3.5" /> View PO
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
          <div className="flex justify-between items-center p-4 bg-gray-50 border-t border-gray-200">
            <span className="text-sm font-medium text-gray-700">Total Outstanding Payable</span>
            <span className="text-lg font-bold text-red-600">{fmtLKR(totalPayable)}</span>
          </div>
        </div>
      </div>
    )
  }

  // 4. AGING REPORT
  const renderAging = () => {
    const buckets = [
      { label: 'Current', min: -Infinity, max: 0, color: 'text-green-600' },
      { label: '1-30 days', min: 1, max: 30, color: 'text-blue-600' },
      { label: '31-60 days', min: 31, max: 60, color: 'text-amber-600' },
      { label: '61-90 days', min: 61, max: 90, color: 'text-orange-600' },
      { label: '90+ days', min: 91, max: Infinity, color: 'text-red-600' }
    ]

    const custAging: Record<string, { name: string, total: number, b: number[] }> = {}
    
    invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').forEach(inv => {
      const cName = inv.sales_orders?.customers?.name || 'Unknown'
      if (!custAging[cName]) custAging[cName] = { name: cName, total: 0, b: [0,0,0,0,0] }
      
      const bal = (inv.total_amount||0) - (inv.amount_paid||0)
      if (bal <= 0) return

      const dOverdue = inv.due_date ? daysDiff(inv.due_date) : 0
      
      let bIdx = 0
      if (dOverdue > 90) bIdx = 4
      else if (dOverdue > 60) bIdx = 3
      else if (dOverdue > 30) bIdx = 2
      else if (dOverdue > 0) bIdx = 1

      custAging[cName].b[bIdx] += bal
      custAging[cName].total += bal
    })

    const rows = Object.values(custAging).sort((a,b) => b.total - a.total)
    const totals = [0,0,0,0,0]
    let gTotal = 0
    rows.forEach(r => {
      gTotal += r.total
      r.b.forEach((val, i) => totals[i] += val)
    })

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {buckets.map((bk, i) => (
            <div key={bk.label} className="bg-white border border-gray-200 rounded-xl p-3 text-center shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{bk.label}</p>
              <p className={`text-lg font-bold mt-1 ${bk.color}`}>{fmtLKR(totals[i])}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3 text-right">Current</th>
                  <th className="px-4 py-3 text-right">1-30 days</th>
                  <th className="px-4 py-3 text-right">31-60 days</th>
                  <th className="px-4 py-3 text-right">61-90 days</th>
                  <th className="px-4 py-3 text-right">90+ days</th>
                  <th className="px-4 py-3 text-right bg-gray-50">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(r => (
                  <tr key={r.name} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{r.b[0] > 0 ? fmtLKR(r.b[0]) : '-'}</td>
                    <td className={`px-4 py-3 text-right ${r.b[1] > 0 ? 'text-blue-700 font-medium bg-blue-50/30' : 'text-gray-400'}`}>{r.b[1] > 0 ? fmtLKR(r.b[1]) : '-'}</td>
                    <td className={`px-4 py-3 text-right ${r.b[2] > 0 ? 'text-amber-700 font-medium bg-amber-50/30' : 'text-gray-400'}`}>{r.b[2] > 0 ? fmtLKR(r.b[2]) : '-'}</td>
                    <td className={`px-4 py-3 text-right ${r.b[3] > 0 ? 'text-orange-700 font-medium bg-orange-50/30' : 'text-gray-400'}`}>{r.b[3] > 0 ? fmtLKR(r.b[3]) : '-'}</td>
                    <td className={`px-4 py-3 text-right ${r.b[4] > 0 ? 'text-red-700 font-bold bg-red-50/50' : 'text-gray-400'}`}>{r.b[4] > 0 ? fmtLKR(r.b[4]) : '-'}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900 bg-gray-50/50">{fmtLKR(r.total)}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No outstanding AR.</td></tr>}
              </tbody>
              {rows.length > 0 && (
                <tfoot className="bg-gray-100 border-t-2 border-gray-200">
                  <tr>
                    <td className="px-4 py-4 font-bold text-gray-900">GRAND TOTAL</td>
                    {totals.map((t, i) => (
                      <td key={i} className="px-4 py-4 text-right font-bold text-gray-900">{fmtLKR(t)}</td>
                    ))}
                    <td className="px-4 py-4 text-right font-bold text-gray-900">{fmtLKR(gTotal)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2 ml-1">
          * Aging calculated from invoice due dates. "Current" means not yet due.
        </p>
      </div>
    )
  }

  // 5. EXPENSES
  const renderExpenses = () => {
    const filteredExp = expenses.filter(e => {
      const matchSearch = (e.description||'').toLowerCase().includes(expSearch.toLowerCase())
      const matchCat = expCategoryFilter === 'all' || e.category === expCategoryFilter
      let matchDate = true
      const d = new Date(e.expense_date)
      const now = new Date()
      if (dateRange === 'month') matchDate = d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear()
      if (dateRange === 'lastMonth') {
        const last = new Date(now.getFullYear(), now.getMonth()-1, 1)
        matchDate = d.getMonth()===last.getMonth() && d.getFullYear()===last.getFullYear()
      }
      if (dateRange === 'year') matchDate = d.getFullYear()===now.getFullYear()
      return matchSearch && matchCat && matchDate
    })

    const expSum = filteredExp.reduce((sum, e) => sum + e.amount, 0)

    const handleSaveExp = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!expForm.category || !expForm.description || expForm.amount <= 0) return

      const supabase = createClient()
      const { error } = await supabase.from('expenses').insert({
        category: expForm.category,
        description: expForm.description,
        amount: expForm.amount,
        expense_date: expForm.expense_date,
        notes: expForm.notes || null,
        paid_by: userId
      })

      if (error) toast.error(error.message)
      else { toast.success('Expense recorded!'); setShowAddExp(false); fetchAll() }
    }

    const handleDeleteExp = async (id: string) => {
      if (!confirm('Are you sure you want to delete this expense?')) return
      const supabase = createClient()
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) toast.error(error.message)
      else { toast.success('Expense deleted'); fetchAll() }
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between gap-3 md:gap-4">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-full md:w-fit overflow-x-auto scrollbar-hide shrink-0">
            {['month','lastMonth','year','all'].map(t => (
              <button key={t} onClick={() => setDateRange(t as any)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${dateRange === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                {t === 'month' ? 'This Month' : t === 'lastMonth' ? 'Last Month' : t === 'year' ? 'This Year' : 'All Time'}
              </button>
            ))}
          </div>
          <div className="flex flex-1 gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Search descriptions..." value={expSearch} onChange={e => setExpSearch(e.target.value)} />
            </div>
            <select value={expCategoryFilter} onChange={e => setExpCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-48 shrink-0">
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 w-1/3">Description</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Paid By</th>
                    <th className="px-4 py-3">Notes</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredExp.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600">{fmtDate(e.expense_date)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium ${catColor(e.category)}`}>{e.category}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{e.description}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmtLKR(e.amount)}</td>
                      <td className="px-4 py-3 text-gray-500">{e.profiles?.full_name || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-xs" title={e.notes}>{e.notes || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleDeleteExp(e.id)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredExp.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No expenses found for this filter.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="md:hidden space-y-3 p-4 bg-gray-50">
              {filteredExp.map(e => (
                <div key={e.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div className="pr-4">
                      <p className="text-sm font-semibold text-gray-900 leading-tight">{e.description}</p>
                      <p className="text-xs text-gray-500 mt-1">{fmtDate(e.expense_date)}</p>
                    </div>
                    <span className={`shrink-0 inline-flex px-2 py-0.5 text-[10px] rounded-full font-medium ${catColor(e.category)}`}>{e.category}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <div className="text-xs text-gray-500">By: {e.profiles?.full_name || '—'}</div>
                    <div className="text-sm font-bold text-gray-900">{fmtLKR(e.amount)}</div>
                  </div>
                  <div className="flex mt-3 gap-2">
                    <button onClick={() => handleDeleteExp(e.id)} className="flex-1 py-1.5 border border-red-100 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-xs font-medium flex items-center justify-center gap-1">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
          <div className="p-4 bg-gray-50 border-t border-gray-200 text-right">
            <p className="text-sm text-gray-600">Showing {filteredExp.length} expenses — <span className="font-bold text-gray-900 ml-2">Total: {fmtLKR(expSum)}</span></p>
          </div>
        </div>

        {showAddExp && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-md p-6">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-semibold text-gray-900">Record Expense</h2>
                <button onClick={() => setShowAddExp(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSaveExp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Category *</label>
                  <select required value={expForm.category} onChange={e => setExpForm({...expForm, category: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">Select a category</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Description *</label>
                  <input required type="text" value={expForm.description} onChange={e => setExpForm({...expForm, description: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="e.g. Office electricity bill" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount *</label>
                    <input required type="number" step="0.01" min="0" value={expForm.amount||''} onChange={e => setExpForm({...expForm, amount: parseFloat(e.target.value)})}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Date *</label>
                    <input required type="date" value={expForm.expense_date} onChange={e => setExpForm({...expForm, expense_date: e.target.value})}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                  <textarea value={expForm.notes} onChange={e => setExpForm({...expForm, notes: e.target.value})} rows={2}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
                </div>
                <div className="flex gap-3 pt-4 mt-2">
                  <button type="button" onClick={() => setShowAddExp(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="flex-1 bg-green-700 hover:bg-green-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">Save</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  // 6. COST ANALYSIS (COGS)
  const renderCogs = () => {
    const batchCOGS = workOrders.map(wo => {
      const costPerUnit = wo.products?.cost_price ?? 0
      const sellingPrice = wo.products?.selling_price ?? 0
      const qty = wo.actual_qty ?? 0
      const totalCost = qty * costPerUnit
      const revenuePotential = qty * sellingPrice
      const grossProfit = revenuePotential - totalCost
      const marginPct = revenuePotential > 0 ? (grossProfit / revenuePotential * 100) : 0
      return {
        wo_number: wo.wo_number,
        product_id: wo.products?.id,
        product_name: wo.products?.name ?? '—',
        sku: wo.products?.sku ?? '—',
        completed_date: wo.completed_at,
        actual_qty: qty,
        unit: wo.products?.unit ?? '',
        cost_per_unit: costPerUnit,
        total_cost: totalCost,
        selling_price: sellingPrice,
        revenue_potential: revenuePotential,
        gross_profit: grossProfit,
        margin_pct: marginPct
      }
    })

    const totCost = batchCOGS.reduce((sum, b) => sum + b.total_cost, 0)
    const totRev = batchCOGS.reduce((sum, b) => sum + b.revenue_potential, 0)
    const totProfit = batchCOGS.reduce((sum, b) => sum + b.gross_profit, 0)
    const avgMargin = totRev > 0 ? (totProfit / totRev * 100) : 0

    // Group for product margins
    const prodMap: Record<string, any> = {}
    batchCOGS.forEach(b => {
      if (!b.product_id) return
      if (!prodMap[b.product_id]) {
        prodMap[b.product_id] = { product_id: b.product_id, name: b.product_name, sku: b.sku, batches: 0, qty: 0, cost: b.cost_per_unit, sell: b.selling_price }
      }
      prodMap[b.product_id].batches += 1
      prodMap[b.product_id].qty += b.actual_qty
    })

    const prodMargins = Object.values(prodMap).map(p => {
      const marginPerUnit = p.sell - p.cost
      const marginPct = p.sell > 0 ? (marginPerUnit / p.sell * 100) : 0
      return { ...p, marginPerUnit, marginPct }
    }).sort((a,b) => b.marginPct - a.marginPct)

    return (
      <div className="space-y-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
          <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0"/>
          <p className="text-xs text-blue-700">
            Cost and selling prices are set in Settings → Products. Update them there to see accurate margin calculations here based on actual produced quantities.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Product Profit Margins</h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3 text-right">Total Batches</th>
                    <th className="px-4 py-3 text-right">Total Produced</th>
                    <th className="px-4 py-3 text-right">Cost Price</th>
                    <th className="px-4 py-3 text-right">Selling Price</th>
                    <th className="px-4 py-3 text-right">Margin/Unit</th>
                    <th className="px-4 py-3 w-48">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {prodMargins.map(p => {
                    const mColor = p.marginPct >= 40 ? 'text-green-600' : p.marginPct >= 20 ? 'text-amber-600' : 'text-red-600'
                    return (
                      <tr key={p.product_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.sku}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{p.batches}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">{p.qty}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{fmtLKR(p.cost)}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{fmtLKR(p.sell)}</td>
                        <td className={`px-4 py-3 text-right font-medium ${p.marginPerUnit < 0 ? 'text-red-600' : 'text-gray-900'}`}>{fmtLKR(p.marginPerUnit)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div className={`h-full ${p.marginPct < 0 ? 'bg-red-500' : p.marginPct >= 40 ? 'bg-green-500' : 'bg-amber-500'}`} style={{width: `${Math.min(100, Math.max(0, p.marginPct))}%`}}/>
                            </div>
                            <span className={`text-xs font-medium w-12 text-right ${mColor}`}>{p.marginPct.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {prodMargins.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No completed products found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Production Batch Cost Analysis</h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3">WO #</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Cost/Unit</th>
                    <th className="px-4 py-3 text-right">Total Cost</th>
                    <th className="px-4 py-3 text-right">Revenue Pot.</th>
                    <th className="px-4 py-3 text-right">Gross Profit</th>
                    <th className="px-4 py-3 text-right">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {batchCOGS.map(b => {
                    let mClass = ''
                    if (b.margin_pct < 0) mClass = 'text-red-700 font-bold bg-red-50/50'
                    else if (b.margin_pct < 20) mClass = 'text-red-600 bg-red-50/30'
                    else if (b.margin_pct < 40) mClass = 'text-amber-600 bg-amber-50/30'
                    else mClass = 'text-green-600 bg-green-50/30'

                    return (
                      <tr key={b.wo_number} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-gray-500">{b.wo_number}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{b.product_name}</td>
                        <td className="px-4 py-3 text-gray-600">{fmtDate(b.completed_date)}</td>
                        <td className="px-4 py-3 text-right font-medium">{b.actual_qty} <span className="text-xs text-gray-400 font-normal ml-0.5">{b.unit}</span></td>
                        <td className="px-4 py-3 text-right text-gray-500">{fmtLKR(b.cost_per_unit)}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">{fmtLKR(b.total_cost)}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">{fmtLKR(b.revenue_potential)}</td>
                        <td className={`px-4 py-3 text-right font-medium ${b.gross_profit < 0 ? 'text-red-600' : 'text-green-600'}`}>{fmtLKR(b.gross_profit)}</td>
                        <td className={`px-4 py-3 text-right font-medium ${mClass}`}>
                          {b.margin_pct < 0 ? 'LOSS' : `${b.margin_pct.toFixed(1)}%`}
                        </td>
                      </tr>
                    )
                  })}
                  {batchCOGS.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">No completed batches found.</td></tr>}
                </tbody>
                {batchCOGS.length > 0 && (
                  <tfoot className="bg-gray-100 border-t-2 border-gray-200">
                    <tr>
                      <td colSpan={5} className="px-4 py-4 font-bold text-gray-900 text-right">TOTALS</td>
                      <td className="px-4 py-4 text-right font-bold text-gray-900">{fmtLKR(totCost)}</td>
                      <td className="px-4 py-4 text-right font-bold text-gray-900">{fmtLKR(totRev)}</td>
                      <td className={`px-4 py-4 text-right font-bold ${totProfit < 0 ? 'text-red-600' : 'text-green-600'}`}>{fmtLKR(totProfit)}</td>
                      <td className={`px-4 py-4 text-right font-bold ${avgMargin >= 40 ? 'text-green-600' : avgMargin >= 20 ? 'text-amber-600' : 'text-red-600'}`}>
                        {avgMargin.toFixed(1)}%
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <p className="text-sm text-gray-400">Loading financial data...</p>
    </div>
  )

  return (
    <div className="pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Finance</h1>
          <p className="text-sm text-gray-500 mt-0.5">Receivables, payables, expenses and cost analysis</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'expenses' && (
            <button onClick={() => setShowAddExp(true)} className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
              <Plus className="w-4 h-4"/> Add Expense
            </button>
          )}
          {activeTab === 'receivable' && (
            <button onClick={() => router.push('/sales/new')} className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
              <Plus className="w-4 h-4"/> New Sales Order
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto mb-6 scrollbar-hide">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'receivable' && renderReceivable()}
      {activeTab === 'payable' && renderPayable()}
      {activeTab === 'aging' && renderAging()}
      {activeTab === 'expenses' && renderExpenses()}
      {activeTab === 'cogs' && renderCogs()}
    </div>
  )
}

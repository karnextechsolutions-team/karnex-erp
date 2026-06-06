'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Customer, SalesOrder, Invoice, Payment } from '@/types/database'
import PageHeader from '@/components/shared/PageHeader'
import StatsCard from '@/components/shared/StatsCard'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  ArrowLeft,
  Pencil,
  Loader2,
  ShoppingCart,
  FileText,
  CreditCard,
  DollarSign,
  AlertCircle,
  Eye,
  User2,
  Globe,
  Building2,
  Phone,
  Mail,
  MapPin,
  Banknote,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Sub-types
// ---------------------------------------------------------------------------
type SOStatus     = SalesOrder['status']
type InvStatus    = Invoice['status']
type CustomerType = Customer['type']

// ---------------------------------------------------------------------------
// Inline helpers
// ---------------------------------------------------------------------------
const soStatusStyles: Record<SOStatus, string> = {
  draft:      'bg-slate-100 text-slate-600',
  confirmed:  'bg-blue-100 text-blue-700',
  dispatched: 'bg-amber-100 text-amber-700',
  delivered:  'bg-emerald-100 text-emerald-700',
  cancelled:  'bg-red-100 text-red-600',
}

const invStatusStyles: Record<InvStatus, string> = {
  unpaid:    'bg-red-100 text-red-600',
  partial:   'bg-amber-100 text-amber-700',
  paid:      'bg-emerald-100 text-emerald-700',
  overdue:   'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-500',
}

function SOBadge({ status }: { status: SOStatus }) {
  const labels: Record<SOStatus, string> = {
    draft: 'Draft', confirmed: 'Confirmed', dispatched: 'Dispatched',
    delivered: 'Delivered', cancelled: 'Cancelled',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${soStatusStyles[status]}`}>
      {labels[status]}
    </span>
  )
}

function InvBadge({ status }: { status: InvStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${invStatusStyles[status]}`}>
      {status}
    </span>
  )
}

function TypeBadge({ type }: { type: CustomerType }) {
  return type === 'local' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
      <Building2 className="w-3 h-3" />Local
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
      <Globe className="w-3 h-3" />Export
    </span>
  )
}

// ---------------------------------------------------------------------------
// Info row
// ---------------------------------------------------------------------------
function InfoRow({ label, value, icon: Icon }: { label: string; value?: React.ReactNode; icon?: React.ElementType }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2.5">
      {Icon && <Icon className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />}
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">{label}</p>
        <p className="text-sm text-slate-800 mt-0.5">{value}</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Edit Customer Dialog (inline on detail page)
// ---------------------------------------------------------------------------
const CURRENCIES         = ['LKR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'INR', 'JPY']
const PAYMENT_TERMS_OPTS = ['Net 7', 'Net 14', 'Net 30', 'Net 60', 'Net 90', 'COD', 'Advance']

interface EditDialogProps {
  customer: Customer
  open: boolean
  onClose: () => void
  onUpdated: (c: Customer) => void
}

function EditDialog({ customer, open, onClose, onUpdated }: EditDialogProps) {
  const [form, setForm]     = useState<Customer>({ ...customer })
  const [saving, setSaving] = useState(false)

  useEffect(() => setForm({ ...customer }), [customer])

  function set<K extends keyof Customer>(k: K, v: Customer[K]) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await (supabase as any)
      .from('customers')
      .update({
        name: form.name, type: form.type,
        contact_person: form.contact_person || null,
        phone: form.phone || null, email: form.email || null,
        address: form.address || null, country: form.country,
        currency: form.currency, credit_limit: form.credit_limit,
        payment_terms: form.payment_terms,
      })
      .eq('id', customer.id)
      .select()
      .single()
    setSaving(false)
    if (error) { toast.error('Failed to update', { description: error.message }); return }
    toast.success('Customer updated')
    onUpdated(data as Customer)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit — {customer.name}</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-1">
          <div>
            <Label htmlFor="ed-name" className="text-xs font-medium text-slate-700">Name *</Label>
            <Input id="ed-name" value={form.name} onChange={(e) => set('name', e.target.value)} className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-700">Type</Label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(['local', 'export'] as CustomerType[]).map((t) => (
                <button key={t} type="button" onClick={() => set('type', t)}
                  className={`py-2 rounded-lg border text-sm font-medium capitalize transition-all ${
                    form.type === t ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600'
                  }`}>{t}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ed-contact" className="text-xs font-medium text-slate-700">Contact Person</Label>
              <Input id="ed-contact" value={form.contact_person ?? ''} onChange={(e) => set('contact_person', e.target.value)} className="mt-1 h-8" />
            </div>
            <div>
              <Label htmlFor="ed-phone" className="text-xs font-medium text-slate-700">Phone</Label>
              <Input id="ed-phone" value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} className="mt-1 h-8" />
            </div>
          </div>
          <div>
            <Label htmlFor="ed-email" className="text-xs font-medium text-slate-700">Email</Label>
            <Input id="ed-email" type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} className="mt-1 h-8" />
          </div>
          <div>
            <Label htmlFor="ed-address" className="text-xs font-medium text-slate-700">Address</Label>
            <Textarea id="ed-address" value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} rows={2} className="mt-1 text-sm resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ed-country" className="text-xs font-medium text-slate-700">Country *</Label>
              <Input id="ed-country" value={form.country} onChange={(e) => set('country', e.target.value)} className="mt-1 h-8" />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-700">Currency</Label>
              <Select value={form.currency} onValueChange={(v) => v && set('currency', v)}>
                <SelectTrigger className="mt-1 h-8 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ed-credit" className="text-xs font-medium text-slate-700">Credit Limit</Label>
              <Input id="ed-credit" type="number" min={0} value={form.credit_limit} onChange={(e) => set('credit_limit', parseFloat(e.target.value) || 0)} className="mt-1 h-8" />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-700">Payment Terms</Label>
              <Select value={form.payment_terms} onValueChange={(v) => v && set('payment_terms', v)}>
                <SelectTrigger className="mt-1 h-8 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_TERMS_OPTS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</> : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function CustomerDetailPage() {
  const params = useParams()
  const id     = params.id as string

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [orders,   setOrders]   = useState<SalesOrder[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState(false)

  const load = useCallback(async () => {
    const supabase = createClient() as any

    const [{ data: cust }, { data: sos }, { data: invs }] = await Promise.all([
      supabase.from('customers').select('*').eq('id', id).single(),
      supabase.from('sales_orders').select('*').eq('customer_id', id).order('order_date', { ascending: false }),
      supabase
        .from('invoices')
        .select('*')
        .in(
          'so_id',
          // We'll re-fetch after getting SO ids — handled below
          ['__placeholder__']
        ),
    ])

    setCustomer(cust as Customer)
    const soList = (sos as SalesOrder[]) ?? []
    setOrders(soList)

    // Fetch invoices for those SOs
    if (soList.length > 0) {
      const soIds = soList.map((s) => s.id)
      const { data: invData } = await supabase
        .from('invoices')
        .select('*')
        .in('so_id', soIds)
        .order('invoice_date', { ascending: false })

      const invList = (invData as Invoice[]) ?? []
      setInvoices(invList)

      // Fetch payments for those invoices
      if (invList.length > 0) {
        const invIds = invList.map((i) => i.id)
        const { data: payData } = await supabase
          .from('payments')
          .select('*')
          .in('invoice_id', invIds)
          .order('payment_date', { ascending: false })
        setPayments((payData as Payment[]) ?? [])
      }
    }

    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  // ── Computed stats ────────────────────────────────────────────────────────
  const totalRevenue      = orders.reduce((s, o) => s + Number(o.total_amount), 0)
  const outstandingBalance = invoices
    .filter((i) => i.status !== 'paid' && i.status !== 'cancelled')
    .reduce((s, i) => s + Number(i.balance), 0)

  // ── Loading / not found ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />Loading customer…
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="py-24 text-center">
        <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">Customer not found</p>
        <Link href="/customers">
          <Button variant="outline" size="sm" className="mt-4">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />Back
          </Button>
        </Link>
      </div>
    )
  }

  const cur = customer.currency

  return (
    <div>
      <PageHeader
        title={customer.name}
        description={`${customer.type === 'local' ? 'Local' : 'Export'} customer · ${customer.country}`}
        action={
          <div className="flex items-center gap-2">
            <Link href="/customers">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />Back
              </Button>
            </Link>
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="w-3.5 h-3.5 mr-1.5" />Edit
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard title="Total Orders"      value={orders.length}                  icon={ShoppingCart} iconColor="text-slate-600" />
        <StatsCard title="Total Invoices"    value={invoices.length}                icon={FileText}     iconColor="text-blue-600" />
        <StatsCard
          title="Total Revenue"
          value={`${cur} ${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          icon={DollarSign}
          iconColor="text-emerald-600"
        />
        <StatsCard
          title="Outstanding Balance"
          value={`${cur} ${outstandingBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          icon={Banknote}
          iconColor={outstandingBalance > 0 ? 'text-red-500' : 'text-slate-400'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Customer info card ────────────────────────────────────── */}
        <div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Customer Info</h2>
              <TypeBadge type={customer.type} />
            </div>
            <div className="p-5 space-y-3.5">
              <InfoRow label="Name"          value={customer.name}                  icon={User2}   />
              <InfoRow label="Contact"       value={customer.contact_person}        icon={User2}   />
              <InfoRow label="Phone"         value={customer.phone}                 icon={Phone}   />
              <InfoRow label="Email"         value={customer.email}                 icon={Mail}    />
              <InfoRow label="Country"       value={customer.country}               icon={Globe}   />
              <InfoRow label="Address"       value={customer.address}               icon={MapPin}  />
              <InfoRow label="Currency"      value={customer.currency}              icon={Banknote} />
              <InfoRow
                label="Credit Limit"
                value={`${customer.currency} ${Number(customer.credit_limit).toLocaleString()}`}
                icon={CreditCard}
              />
              <InfoRow label="Payment Terms" value={customer.payment_terms}         />
              <InfoRow
                label="Member Since"
                value={format(new Date(customer.created_at), 'dd MMM yyyy')}
              />
              <div className="pt-1">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  customer.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                }`}>
                  {customer.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="orders">
            <TabsList className="mb-4">
              <TabsTrigger value="orders">
                Sales Orders <span className="ml-1.5 text-xs text-slate-400">({orders.length})</span>
              </TabsTrigger>
              <TabsTrigger value="invoices">
                Invoices <span className="ml-1.5 text-xs text-slate-400">({invoices.length})</span>
              </TabsTrigger>
              <TabsTrigger value="payments">
                Payments <span className="ml-1.5 text-xs text-slate-400">({payments.length})</span>
              </TabsTrigger>
            </TabsList>

            {/* Sales Orders */}
            <TabsContent value="orders">
              {orders.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                  <ShoppingCart className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No sales orders yet</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        {['SO Number', 'Order Date', 'Delivery Date', 'Amount', 'Status', ''].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orders.map((so) => (
                        <tr key={so.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">{so.so_number}</td>
                          <td className="px-4 py-3 text-slate-500">{format(new Date(so.order_date), 'dd MMM yyyy')}</td>
                          <td className="px-4 py-3 text-slate-500">
                            {so.delivery_date ? format(new Date(so.delivery_date), 'dd MMM yyyy') : '—'}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-700">
                            {so.currency} {Number(so.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3"><SOBadge status={so.status} /></td>
                          <td className="px-4 py-3">
                            <Link href={`/sales/${so.id}`}>
                              <Button variant="ghost" size="xs">
                                <Eye className="w-3 h-3 mr-1" />View
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* Invoices */}
            <TabsContent value="invoices">
              {invoices.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                  <FileText className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No invoices yet</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        {['Invoice No.', 'Date', 'Due Date', 'Total', 'Paid', 'Balance', 'Status'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoices.map((inv) => {
                        const isOverdue = inv.status === 'overdue' || inv.status === 'unpaid'
                        return (
                          <tr key={inv.id} className={`transition-colors ${isOverdue && Number(inv.balance) > 0 ? 'bg-red-50/30' : 'hover:bg-slate-50/60'}`}>
                            <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">{inv.invoice_number}</td>
                            <td className="px-4 py-3 text-slate-500">{format(new Date(inv.invoice_date), 'dd MMM yyyy')}</td>
                            <td className="px-4 py-3 text-slate-500">
                              {inv.due_date ? format(new Date(inv.due_date), 'dd MMM yyyy') : '—'}
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-700">
                              {cur} {Number(inv.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-emerald-700">
                              {cur} {Number(inv.amount_paid).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className={`px-4 py-3 font-medium ${Number(inv.balance) > 0 ? 'text-red-600' : 'text-slate-500'}`}>
                              {cur} {Number(inv.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3"><InvBadge status={inv.status} /></td>
                          </tr>
                        )
                      })}
                    </tbody>
                    {/* Invoice totals */}
                    <tfoot className="border-t border-slate-200 bg-slate-50">
                      <tr>
                        <td colSpan={3} className="px-4 py-2.5 text-xs text-slate-500 font-medium">Totals</td>
                        <td className="px-4 py-2.5 text-sm font-semibold text-slate-800">
                          {cur} {invoices.reduce((s, i) => s + Number(i.total_amount), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2.5 text-sm font-semibold text-emerald-700">
                          {cur} {invoices.reduce((s, i) => s + Number(i.amount_paid), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2.5 text-sm font-semibold text-red-600">
                          {cur} {invoices.reduce((s, i) => s + Number(i.balance), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* Payment History */}
            <TabsContent value="payments">
              {payments.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                  <CreditCard className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No payments recorded yet</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        {['Date', 'Amount', 'Method', 'Reference', 'Notes'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 text-slate-600">{format(new Date(p.payment_date), 'dd MMM yyyy')}</td>
                          <td className="px-4 py-3 font-semibold text-emerald-700">
                            {cur} {Number(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3">
                            {p.payment_method ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 capitalize">
                                {p.payment_method}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.reference ?? '—'}</td>
                          <td className="px-4 py-3 text-slate-500">{p.notes ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-slate-200 bg-slate-50">
                      <tr>
                        <td className="px-4 py-2.5 text-xs text-slate-500 font-medium">Total Received</td>
                        <td className="px-4 py-2.5 text-sm font-semibold text-emerald-700">
                          {cur} {payments.reduce((s, p) => s + Number(p.amount), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit dialog */}
      {customer && (
        <EditDialog
          customer={customer}
          open={editing}
          onClose={() => setEditing(false)}
          onUpdated={(c) => { setCustomer(c); setEditing(false) }}
        />
      )}
    </div>
  )
}

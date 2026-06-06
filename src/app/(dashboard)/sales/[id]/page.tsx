'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { SalesOrder, SOItem, Customer, Product, Invoice } from '@/types/database'
import PageHeader from '@/components/shared/PageHeader'
import InvoiceDialog, { type InvoiceDialogData } from '@/components/sales/InvoiceDialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  ArrowLeft,
  CheckCircle2,
  Truck,
  PackageCheck,
  FileText,
  Loader2,
  User2,
  MapPin,
  Calendar,
  Hash,
  Banknote,
  AlertCircle,
  Download,
} from 'lucide-react'
import { generateAndDownloadPDF } from '@/lib/pdf/generatePDF'
import InvoiceDocument from '@/components/documents/InvoiceDocument'
import QuotationDocument from '@/components/documents/QuotationDocument'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type SOStatus = SalesOrder['status']
type FullOrder = SalesOrder & { customers?: Customer | null }
type FullSOItem = SOItem & { products?: Product | null }

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------
const statusStyles: Record<SOStatus, string> = {
  draft:      'bg-slate-100 text-slate-600',
  confirmed:  'bg-blue-100 text-blue-700',
  dispatched: 'bg-amber-100 text-amber-700',
  delivered:  'bg-emerald-100 text-emerald-700',
  cancelled:  'bg-red-100 text-red-600',
}

function StatusBadge({ status }: { status: SOStatus }) {
  const labels: Record<SOStatus, string> = {
    draft: 'Draft', confirmed: 'Confirmed',
    dispatched: 'Dispatched', delivered: 'Delivered', cancelled: 'Cancelled',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyles[status]}`}>
      {labels[status]}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Info row helper
// ---------------------------------------------------------------------------
function InfoRow({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ElementType }) {
  return (
    <div className="flex items-start gap-3">
      {Icon && <Icon className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />}
      <div className="min-w-0">
        <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">{label}</p>
        <p className="text-sm text-slate-800 mt-0.5">{value || '—'}</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Status progression
// ---------------------------------------------------------------------------
const STATUS_FLOW: SOStatus[] = ['draft', 'confirmed', 'dispatched', 'delivered']

const nextStatusConfig: Partial<Record<SOStatus, { label: string; next: SOStatus; icon: React.ElementType; variant: 'default' | 'outline' }>> = {
  draft:      { label: 'Confirm Order',   next: 'confirmed',  icon: CheckCircle2, variant: 'default'  },
  confirmed:  { label: 'Mark Dispatched', next: 'dispatched', icon: Truck,        variant: 'default'  },
  dispatched: { label: 'Mark Delivered',  next: 'delivered',  icon: PackageCheck, variant: 'default'  },
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function SalesOrderDetailPage() {
  const params       = useParams()
  const searchParams = useSearchParams()
  const router       = useRouter()
  const id           = params.id as string

  const [order, setOrder]           = useState<FullOrder | null>(null)
  const [items, setItems]           = useState<FullSOItem[]>([])
  const [invoice, setInvoice]       = useState<Invoice | null>(null)
  const [loading, setLoading]       = useState(true)
  const [transitioning, setTransitioning] = useState(false)
  const [generatingInvoice, setGeneratingInvoice] = useState(false)
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false)
  const [downloadingInvoice, setDownloadingInvoice] = useState(false)
  const [downloadingQuotation, setDownloadingQuotation] = useState(false)

  // ── Load order ─────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    const supabase = createClient() as any

    const [{ data: so }, { data: soItems }, { data: existingInvoice }] = await Promise.all([
      supabase
        .from('sales_orders')
        .select('*, customers(*)')
        .eq('id', id)
        .single(),
      supabase
        .from('so_items')
        .select('*, products(*)')
        .eq('so_id', id)
        .order('created_at'),
      supabase
        .from('invoices')
        .select('*')
        .eq('so_id', id)
        .maybeSingle(),
    ])

    setOrder(so as FullOrder)
    setItems((soItems as FullSOItem[]) ?? [])
    setInvoice(existingInvoice as Invoice | null)
    setLoading(false)

    // Open invoice dialog if navigated from list with ?invoice=1
    if (searchParams.get('invoice') === '1' && existingInvoice) {
      setInvoiceDialogOpen(true)
    }
  }, [id, searchParams])

  useEffect(() => { load() }, [load])

  // ── Status transition ──────────────────────────────────────────────────────
  async function handleTransition(nextStatus: SOStatus) {
    if (!order) return
    setTransitioning(true)
    const supabase = createClient() as any
    const { error } = await supabase
      .from('sales_orders')
      .update({ status: nextStatus })
      .eq('id', id)

    if (error) {
      toast.error('Failed to update status', { description: error.message })
    } else {
      toast.success(`Order ${order.so_number} marked as ${nextStatus}`)
      setOrder((prev) => prev ? { ...prev, status: nextStatus } : prev)
    }
    setTransitioning(false)
  }

  // ── Generate / view invoice ─────────────────────────────────────────────────
  async function handleInvoice() {
    if (invoice) {
      setInvoiceDialogOpen(true)
      return
    }
    if (!order) return

    setGeneratingInvoice(true)
    const supabase = createClient() as any

    try {
      const { data: invNumber, error: rpcErr } = await supabase.rpc('generate_invoice_number')
      if (rpcErr) throw new Error(rpcErr.message)

      const { data: newInvoice, error: invErr } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invNumber as string,
          so_id:          order.id,
          invoice_date:   new Date().toISOString().split('T')[0],
          due_date:       null,
          status:         'unpaid',
          total_amount:   order.total_amount,
          amount_paid:    0,
          balance:        order.total_amount,
          notes:          null,
        })
        .select()
        .single()

      if (invErr) throw new Error(invErr.message)

      setInvoice(newInvoice as Invoice)
      setInvoiceDialogOpen(true)
      toast.success(`Invoice ${invNumber} generated`)
    } catch (err: unknown) {
      toast.error('Failed to generate invoice', { description: err instanceof Error ? err.message : 'Unknown error' })
    } finally {
      setGeneratingInvoice(false)
    }
  }

  async function handleDownloadInvoice() {
    if (!invoice || !order) return
    setDownloadingInvoice(true)
    try {
      const fileName = `Invoice_${invoice.invoice_number}.pdf`
      await generateAndDownloadPDF(<InvoiceDocument invoice={invoice} order={order} items={items} />, fileName)
      toast.success('Invoice PDF downloaded successfully')
    } catch (err) {
      toast.error('Failed to generate invoice PDF')
    } finally {
      setDownloadingInvoice(false)
    }
  }

  async function handleDownloadQuotation() {
    if (!order) return
    setDownloadingQuotation(true)
    try {
      const fileName = `Quotation_QT-${order.so_number.replace('SO-', '')}.pdf`
      await generateAndDownloadPDF(<QuotationDocument order={order} items={items} />, fileName)
      toast.success('Quotation PDF downloaded successfully')
    } catch (err) {
      toast.error('Failed to generate quotation PDF')
    } finally {
      setDownloadingQuotation(false)
    }
  }

  // ── Dialog data ─────────────────────────────────────────────────────────────
  const invoiceDialogData: InvoiceDialogData | null =
    invoice && order
      ? { invoice, order, items }
      : null

  // ── Loading / not found ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading order…
      </div>
    )
  }

  if (!order) {
    return (
      <div className="py-24 text-center">
        <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">Order not found</p>
        <Link href="/sales"><Button variant="outline" size="sm" className="mt-4"><ArrowLeft className="w-3.5 h-3.5 mr-1.5" />Back to Sales</Button></Link>
      </div>
    )
  }

  const customer       = order.customers
  const currency       = order.currency
  const nextCfg        = nextStatusConfig[order.status]
  const stepIndex      = STATUS_FLOW.indexOf(order.status)

  return (
    <div>
      <PageHeader
        title={order.so_number}
        description={`Sales order · ${format(new Date(order.order_date), 'dd MMM yyyy')}`}
        action={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Link href="/sales">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                Back
              </Button>
            </Link>

            {/* Generate / View Invoice */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleInvoice}
              disabled={generatingInvoice}
            >
              {generatingInvoice ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <FileText className="w-3.5 h-3.5 mr-1.5" />
              )}
              {invoice ? 'View Invoice' : 'Generate Invoice'}
            </Button>

            {/* Download Invoice PDF */}
            {invoice && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadInvoice}
                disabled={downloadingInvoice}
              >
                {downloadingInvoice ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                )}
                Download Invoice
              </Button>
            )}

            {/* Download Quotation PDF */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadQuotation}
              disabled={downloadingQuotation}
            >
              {downloadingQuotation ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 mr-1.5" />
              )}
              Download Quotation
            </Button>

            {/* Status transition */}
            {nextCfg && (
              <Button
                size="sm"
                variant={nextCfg.variant}
                onClick={() => handleTransition(nextCfg.next)}
                disabled={transitioning}
              >
                {transitioning ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <nextCfg.icon className="w-3.5 h-3.5 mr-1.5" />
                )}
                {nextCfg.label}
              </Button>
            )}
          </div>
        }
      />

      {/* Progress tracker */}
      <div className="bg-white rounded-xl border border-slate-200 px-6 py-4 mb-6">
        <div className="flex items-center gap-0">
          {STATUS_FLOW.map((s, idx) => {
            const done    = idx < stepIndex
            const current = idx === stepIndex
            const isCancelled = order.status === 'cancelled'
            return (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    isCancelled ? 'bg-slate-100 text-slate-400' :
                    done    ? 'bg-emerald-500 text-white' :
                    current ? 'bg-slate-900 text-white' :
                              'bg-slate-100 text-slate-400'
                  }`}>
                    {done && !isCancelled ? '✓' : idx + 1}
                  </div>
                  <p className={`text-xs mt-1 font-medium capitalize ${current && !isCancelled ? 'text-slate-900' : 'text-slate-400'}`}>
                    {s.replace('_', ' ')}
                  </p>
                </div>
                {idx < STATUS_FLOW.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 mb-4 transition-colors ${
                    !isCancelled && idx < stepIndex ? 'bg-emerald-400' : 'bg-slate-100'
                  }`} />
                )}
              </div>
            )
          })}
          {order.status === 'cancelled' && (
            <div className="ml-4 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">
              Cancelled
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: line items ────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Line items table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Line Items</h2>
              <StatusBadge status={order.status} />
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Product</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Unit Price</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">No line items</td>
                  </tr>
                ) : (
                  items.map((item, i) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{item.products?.name ?? '—'}</p>
                        {item.products?.sku && <p className="text-xs text-slate-400">{item.products.sku}</p>}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {item.quantity.toLocaleString()}
                        {item.products?.unit && <span className="text-slate-400 text-xs ml-1">{item.products.unit}</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {currency} {Number(item.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800">
                        {currency} {Number(item.total_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {/* Totals footer */}
              <tfoot className="border-t border-slate-200 bg-slate-50">
                <tr>
                  <td colSpan={4} className="px-4 py-2.5 text-right text-xs text-slate-500 font-medium">Subtotal</td>
                  <td className="px-4 py-2.5 text-right text-sm font-medium text-slate-700">
                    {currency} {Number(order.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                {Number(order.discount) > 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-2.5 text-right text-xs text-slate-500 font-medium">Discount</td>
                    <td className="px-4 py-2.5 text-right text-sm font-medium text-red-500">
                      − {currency} {Number(order.discount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}
                <tr className="border-t border-slate-200">
                  <td colSpan={4} className="px-4 py-3 text-right text-sm font-semibold text-slate-900">Total</td>
                  <td className="px-4 py-3 text-right text-base font-bold text-slate-900">
                    {currency} {Number(order.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Invoice summary */}
          {invoice && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">Invoice</h2>
                <Button size="xs" variant="outline" onClick={() => setInvoiceDialogOpen(true)}>
                  <FileText className="w-3 h-3 mr-1" />View
                </Button>
              </div>
              <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <InfoRow label="Invoice No." value={invoice.invoice_number} icon={Hash} />
                <InfoRow label="Invoice Date" value={format(new Date(invoice.invoice_date), 'dd MMM yyyy')} icon={Calendar} />
                <InfoRow label="Due Date" value={invoice.due_date ? format(new Date(invoice.due_date), 'dd MMM yyyy') : '—'} icon={Calendar} />
                <InfoRow
                  label="Status"
                  value={
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                      invoice.status === 'paid'    ? 'bg-emerald-50 text-emerald-700' :
                      invoice.status === 'overdue' ? 'bg-red-100 text-red-600' :
                      invoice.status === 'partial' ? 'bg-blue-100 text-blue-700' :
                                                     'bg-amber-100 text-amber-700'
                    }`}>{invoice.status}</span>
                  }
                />
              </div>
              <div className="px-5 pb-4 border-t border-slate-100 grid grid-cols-3 gap-4 pt-4">
                <InfoRow label="Total" value={`${currency} ${Number(invoice.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} icon={Banknote} />
                <InfoRow label="Paid"    value={`${currency} ${Number(invoice.amount_paid).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
                <InfoRow label="Balance" value={`${currency} ${Number(invoice.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
              </div>
            </div>
          )}
        </div>

        {/* ── Right: order & customer info ─────────────────────────────── */}
        <div className="space-y-4">

          {/* Customer */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Customer</h2>
            </div>
            <div className="p-5 space-y-3">
              <InfoRow label="Name"           value={customer?.name}                       icon={User2} />
              <InfoRow label="Contact"        value={customer?.contact_person}              icon={User2} />
              <InfoRow label="Email"          value={customer?.email}                       />
              <InfoRow label="Phone"          value={customer?.phone}                       />
              <InfoRow label="Type"           value={customer?.type}                        />
              <InfoRow label="Payment Terms"  value={customer?.payment_terms}               />
              {customer?.address && (
                <InfoRow label="Address" value={customer.address} icon={MapPin} />
              )}
            </div>
          </div>

          {/* Order info */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Order Info</h2>
            </div>
            <div className="p-5 space-y-3">
              <InfoRow label="SO Number"     value={order.so_number}                        icon={Hash} />
              <InfoRow label="Order Date"    value={format(new Date(order.order_date), 'dd MMM yyyy')} icon={Calendar} />
              <InfoRow label="Delivery Date" value={order.delivery_date ? format(new Date(order.delivery_date), 'dd MMM yyyy') : null} icon={Calendar} />
              <InfoRow label="Currency"      value={`${order.currency} (rate: ${order.exchange_rate})`} icon={Banknote} />
              {order.shipping_address && (
                <InfoRow label="Ship To" value={order.shipping_address} icon={MapPin} />
              )}
              {order.notes && (
                <InfoRow label="Notes" value={order.notes} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Dialog */}
      <InvoiceDialog
        data={invoiceDialogData}
        open={invoiceDialogOpen}
        onClose={() => setInvoiceDialogOpen(false)}
        onDueDateSaved={(updated) => setInvoice(updated)}
      />
    </div>
  )
}

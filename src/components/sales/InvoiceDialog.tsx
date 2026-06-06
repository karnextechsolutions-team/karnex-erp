'use client'

import { useRef, useState } from 'react'
import type { Invoice, SalesOrder, Customer, SOItem, Product } from '@/types/database'
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
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format, addDays } from 'date-fns'
import { Printer, Loader2, FileText } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface InvoiceDialogData {
  invoice: Invoice
  order: SalesOrder & { customers?: Customer | null }
  items: (SOItem & { products?: Product | null })[]
}

interface InvoiceDialogProps {
  data: InvoiceDialogData | null
  open: boolean
  onClose: () => void
  onDueDateSaved?: (invoice: Invoice) => void
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------
const invoiceStatusStyles: Record<Invoice['status'], string> = {
  unpaid:    'bg-amber-100 text-amber-700',
  partial:   'bg-blue-100 text-blue-700',
  paid:      'bg-emerald-100 text-emerald-700',
  overdue:   'bg-red-100 text-red-600',
  cancelled: 'bg-slate-100 text-slate-500',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function InvoiceDialog({ data, open, onClose, onDueDateSaved }: InvoiceDialogProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const [dueDate, setDueDate] = useState(() =>
    data?.invoice.due_date ?? format(addDays(new Date(), 30), 'yyyy-MM-dd')
  )
  const [saving, setSaving] = useState(false)

  if (!data) return null

  const { invoice, order, items } = data
  const customer = order.customers
  const currency = order.currency

  async function saveDueDate() {
    setSaving(true)
    const supabase = createClient()
    const { data: updated, error } = await supabase
      .from('invoices')
      .update({ due_date: dueDate })
      .eq('id', invoice.id)
      .select()
      .single()

    setSaving(false)
    if (error) {
      toast.error('Failed to save due date', { description: error.message })
    } else {
      toast.success('Due date saved')
      onDueDateSaved?.(updated as Invoice)
    }
  }

  function handlePrint() {
    if (!printRef.current) return
    const content = printRef.current.innerHTML
    const win = window.open('', '_blank', 'width=800,height=900')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.invoice_number}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #1e293b; padding: 40px; }
            h1 { font-size: 24px; font-weight: 700; }
            h2 { font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #475569; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th { background: #f8fafc; text-align: left; padding: 8px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 1px solid #e2e8f0; }
            td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
            .text-right { text-align: right; }
            .total-row td { font-weight: 600; background: #f8fafc; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; background: #fef3c7; color: #92400e; }
            .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 24px 0; }
            .label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
            .value { font-size: 13px; color: #1e293b; margin-top: 2px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #e2e8f0; }
            .totals { margin-top: 16px; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
            .total-line { display: flex; gap: 64px; justify-content: flex-end; font-size: 13px; }
            .grand-total { font-size: 16px; font-weight: 700; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 4px; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 300)
  }

  const printContent = (
    <div ref={printRef}>
      {/* Header */}
      <div className="header">
        <div>
          <h1>INVOICE</h1>
          <p style={{ color: '#64748b', marginTop: 4 }}>#{invoice.invoice_number}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p className="label">Status</p>
          <span className={`badge ${invoiceStatusStyles[invoice.status]}`}>
            {invoice.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Bill to / Order info */}
      <div className="grid2">
        <div>
          <h2>Bill To</h2>
          <p className="value" style={{ fontWeight: 600 }}>{customer?.name ?? '—'}</p>
          {customer?.contact_person && <p className="value">{customer.contact_person}</p>}
          {customer?.email        && <p className="value" style={{ color: '#64748b' }}>{customer.email}</p>}
          {customer?.phone        && <p className="value" style={{ color: '#64748b' }}>{customer.phone}</p>}
          {customer?.address      && <p className="value" style={{ color: '#64748b', marginTop: 4 }}>{customer.address}</p>}
        </div>
        <div>
          <h2>Invoice Details</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 16px' }}>
            <span className="label">Invoice No.</span><span className="value">{invoice.invoice_number}</span>
            <span className="label">SO Number</span><span className="value">{order.so_number}</span>
            <span className="label">Invoice Date</span><span className="value">{format(new Date(invoice.invoice_date), 'dd MMM yyyy')}</span>
            <span className="label">Due Date</span>
            <span className="value">{dueDate ? format(new Date(dueDate), 'dd MMM yyyy') : '—'}</span>
            <span className="label">Currency</span><span className="value">{currency}</span>
          </div>
        </div>
      </div>

      {/* Line items */}
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Product</th>
            <th style={{ textAlign: 'right' }}>Qty</th>
            <th style={{ textAlign: 'right' }}>Unit Price</th>
            <th style={{ textAlign: 'right' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.id}>
              <td>{i + 1}</td>
              <td>
                <div style={{ fontWeight: 500 }}>{item.products?.name ?? '—'}</div>
                {item.products?.sku && <div style={{ fontSize: 11, color: '#94a3b8' }}>{item.products.sku}</div>}
              </td>
              <td style={{ textAlign: 'right' }}>{item.quantity.toLocaleString()}</td>
              <td style={{ textAlign: 'right' }}>{currency} {Number(item.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td style={{ textAlign: 'right' }}>{currency} {Number(item.total_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="totals">
        <div className="total-line">
          <span style={{ color: '#64748b' }}>Subtotal</span>
          <span>{currency} {Number(order.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        {Number(order.discount) > 0 && (
          <div className="total-line">
            <span style={{ color: '#64748b' }}>Discount</span>
            <span style={{ color: '#ef4444' }}>− {currency} {Number(order.discount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        <div className="total-line grand-total">
          <span>Total Due</span>
          <span>{currency} {Number(invoice.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        {Number(invoice.amount_paid) > 0 && (
          <div className="total-line">
            <span style={{ color: '#64748b' }}>Amount Paid</span>
            <span style={{ color: '#10b981' }}>{currency} {Number(invoice.amount_paid).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        {Number(invoice.balance) > 0 && (
          <div className="total-line" style={{ fontWeight: 700, color: '#ef4444' }}>
            <span>Balance Due</span>
            <span>{currency} {Number(invoice.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        )}
      </div>

      {/* Footer note */}
      {customer?.payment_terms && (
        <p style={{ marginTop: 32, fontSize: 12, color: '#94a3b8' }}>
          Payment terms: {customer.payment_terms}
        </p>
      )}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            Invoice {invoice.invoice_number}
          </DialogTitle>
        </DialogHeader>

        {/* Due date picker */}
        <div className="flex items-center gap-3 px-1 py-2 bg-slate-50 rounded-lg border border-slate-200">
          <Label htmlFor="due-date" className="text-xs font-medium text-slate-600 whitespace-nowrap shrink-0">
            Due Date
          </Label>
          <Input
            id="due-date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="h-7 text-sm flex-1 max-w-[180px]"
          />
          <Button size="xs" variant="outline" onClick={saveDueDate} disabled={saving}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
          </Button>
          <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${invoiceStatusStyles[invoice.status]}`}>
            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
          </span>
        </div>

        {/* Invoice preview */}
        <div className="border border-slate-200 rounded-xl p-6 bg-white text-sm">
          {printContent}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          <Button size="sm" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print / Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

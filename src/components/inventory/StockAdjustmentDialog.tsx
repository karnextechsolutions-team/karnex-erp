'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RawMaterial, Product } from '@/types/database'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { toast } from 'sonner'
import { Plus, Loader2 } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type StockType = 'raw_material' | 'finished_good'

interface FormState {
  stock_type: StockType
  material_id: string
  product_id: string
  quantity: string
  batch_number: string
  expiry_date: string
  production_date: string
  location: string
  notes: string
}

const emptyForm: FormState = {
  stock_type: 'raw_material',
  material_id: '',
  product_id: '',
  quantity: '',
  batch_number: '',
  expiry_date: '',
  production_date: '',
  location: '',
  notes: '',
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface StockAdjustmentDialogProps {
  onSuccess?: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function StockAdjustmentDialog({ onSuccess }: StockAdjustmentDialogProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [materials, setMaterials] = useState<RawMaterial[]>([])
  const [products, setProducts] = useState<Product[]>([])

  // Fetch lookup data once
  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    Promise.all([
      supabase.from('raw_materials').select('*').eq('is_active', true).order('name'),
      supabase.from('products').select('*').eq('is_active', true).order('name'),
    ]).then(([{ data: mats }, { data: prods }]) => {
      setMaterials(mats ?? [])
      setProducts(prods ?? [])
    })
  }, [open])

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function resetForm() {
    setForm(emptyForm)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const qty = parseFloat(form.quantity)
    if (!qty || qty <= 0) {
      toast.error('Quantity must be a positive number')
      return
    }

    if (form.stock_type === 'raw_material' && !form.material_id) {
      toast.error('Please select a raw material')
      return
    }
    if (form.stock_type === 'finished_good' && !form.product_id) {
      toast.error('Please select a product')
      return
    }

    setSaving(true)
    const supabase = createClient()

    try {
      if (form.stock_type === 'raw_material') {
        // ── Insert into inventory_stock ──────────────────────────────────
        const { error: stockErr } = await supabase.from('inventory_stock').insert({
          material_id: form.material_id,
          quantity: qty,
          batch_number: form.batch_number || null,
          expiry_date: form.expiry_date || null,
          location: form.location || null,
        })
        if (stockErr) throw new Error(stockErr.message)

        // ── Insert stock movement ────────────────────────────────────────
        const { error: movErr } = await supabase.from('stock_movements').insert({
          movement_type: 'in',
          stock_type: 'raw_material',
          material_id: form.material_id,
          product_id: null,
          quantity: qty,
          batch_number: form.batch_number || null,
          notes: form.notes || null,
        })
        if (movErr) throw new Error(movErr.message)

        const mat = materials.find((m) => m.id === form.material_id)
        toast.success(`Stock added: ${mat?.name ?? 'raw material'}`, {
          description: `${qty} ${mat?.unit ?? 'units'} recorded`,
        })
      } else {
        // ── Insert into finished_goods_stock ─────────────────────────────
        const { error: stockErr } = await supabase.from('finished_goods_stock').insert({
          product_id: form.product_id,
          quantity: qty,
          batch_number: form.batch_number || null,
          production_date: form.production_date || null,
          expiry_date: form.expiry_date || null,
          location: form.location || null,
        })
        if (stockErr) throw new Error(stockErr.message)

        // ── Insert stock movement ────────────────────────────────────────
        const { error: movErr } = await supabase.from('stock_movements').insert({
          movement_type: 'in',
          stock_type: 'finished_good',
          material_id: null,
          product_id: form.product_id,
          quantity: qty,
          batch_number: form.batch_number || null,
          notes: form.notes || null,
        })
        if (movErr) throw new Error(movErr.message)

        const prod = products.find((p) => p.id === form.product_id)
        toast.success(`Stock added: ${prod?.name ?? 'product'}`, {
          description: `${qty} ${prod?.unit ?? 'units'} recorded`,
        })
      }

      resetForm()
      setOpen(false)
      onSuccess?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      toast.error('Failed to add stock', { description: msg })
    } finally {
      setSaving(false)
    }
  }

  const isRaw = form.stock_type === 'raw_material'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Stock
          </Button>
        }
      />

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Stock Entry</DialogTitle>
        </DialogHeader>

        <form id="stock-adj-form" onSubmit={handleSubmit} className="space-y-4 mt-1">
          {/* Stock Type */}
          <div>
            <Label className="text-xs font-medium text-slate-700">Stock Type</Label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(['raw_material', 'finished_good'] as StockType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    set('stock_type', type)
                    set('material_id', '')
                    set('product_id', '')
                  }}
                  className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                    form.stock_type === type
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {type === 'raw_material' ? 'Raw Material' : 'Finished Good'}
                </button>
              ))}
            </div>
          </div>

          {/* Material / Product selector */}
          <div>
            <Label className="text-xs font-medium text-slate-700">
              {isRaw ? 'Raw Material' : 'Product'} <span className="text-red-500">*</span>
            </Label>
            <div className="mt-1">
              {isRaw ? (
                <Select value={form.material_id} onValueChange={(v) => set('material_id', v || '')}>
                  <SelectTrigger className="w-full h-8">
                    <SelectValue placeholder="Select raw material…" />
                  </SelectTrigger>
                  <SelectContent>
                    {materials.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}{m.code ? ` (${m.code})` : ''} — {m.unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={form.product_id} onValueChange={(v) => set('product_id', v || '')}>
                  <SelectTrigger className="w-full h-8">
                    <SelectValue placeholder="Select product…" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}{p.sku ? ` (${p.sku})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <Label htmlFor="sa-qty" className="text-xs font-medium text-slate-700">
              Quantity <span className="text-red-500">*</span>
            </Label>
            <Input
              id="sa-qty"
              type="number"
              min={0.01}
              step={0.01}
              value={form.quantity}
              onChange={(e) => set('quantity', e.target.value)}
              placeholder="0.00"
              className="mt-1 h-8"
            />
          </div>

          {/* Batch Number */}
          <div>
            <Label htmlFor="sa-batch" className="text-xs font-medium text-slate-700">Batch Number</Label>
            <Input
              id="sa-batch"
              value={form.batch_number}
              onChange={(e) => set('batch_number', e.target.value)}
              placeholder="e.g. BATCH-2024-001"
              className="mt-1 h-8"
            />
          </div>

          {/* Production Date (Finished Good only) */}
          {!isRaw && (
            <div>
              <Label htmlFor="sa-prod-date" className="text-xs font-medium text-slate-700">Production Date</Label>
              <Input
                id="sa-prod-date"
                type="date"
                value={form.production_date}
                onChange={(e) => set('production_date', e.target.value)}
                className="mt-1 h-8"
              />
            </div>
          )}

          {/* Expiry Date */}
          <div>
            <Label htmlFor="sa-expiry" className="text-xs font-medium text-slate-700">Expiry Date</Label>
            <Input
              id="sa-expiry"
              type="date"
              value={form.expiry_date}
              onChange={(e) => set('expiry_date', e.target.value)}
              className="mt-1 h-8"
            />
          </div>

          {/* Location */}
          <div>
            <Label htmlFor="sa-loc" className="text-xs font-medium text-slate-700">Storage Location</Label>
            <Input
              id="sa-loc"
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              placeholder="e.g. Warehouse A, Shelf 3"
              className="mt-1 h-8"
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="sa-notes" className="text-xs font-medium text-slate-700">Notes</Label>
            <Textarea
              id="sa-notes"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Any additional information…"
              rows={2}
              className="mt-1 text-sm resize-none"
            />
          </div>
        </form>

        <DialogFooter>
          <Button
            type="submit"
            form="stock-adj-form"
            disabled={saving}
            size="sm"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Saving…
              </>
            ) : (
              'Add Stock'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

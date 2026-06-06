'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RawMaterial } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trash2, Plus } from 'lucide-react'

export interface POLineItem {
  id: string
  material_id: string
  quantity: number
  unit_price: number
  total: number
}

interface POItemsTableProps {
  items: POLineItem[]
  onChange: (items: POLineItem[]) => void
  currency?: string
}

function generateId() {
  return Math.random().toString(36).slice(2)
}

export default function POItemsTable({ items, onChange, currency = 'LKR' }: POItemsTableProps) {
  const [materials, setMaterials] = useState<RawMaterial[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('raw_materials')
      .select('*')
      .eq('is_active', true)
      .order('name')
      .then((res: any) => setMaterials(res.data ?? []))
  }, [])

  function addRow() {
    onChange([
      ...items,
      { id: generateId(), material_id: '', quantity: 1, unit_price: 0, total: 0 },
    ])
  }

  function removeRow(id: string) {
    onChange(items.filter((item) => item.id !== id))
  }

  function updateRow(id: string, field: Partial<Omit<POLineItem, 'id' | 'total'>>) {
    onChange(
      items.map((item) => {
        if (item.id !== id) return item
        const updated = { ...item, ...field }
        updated.total = updated.quantity * updated.unit_price
        return updated
      })
    )
  }

  const subtotal = items.reduce((acc, item) => acc + item.total, 0)

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        {/* Desktop Table View */}
        <table className="hidden md:table w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Material</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Qty</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide w-36">Unit Price</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide w-36">Total</th>
              <th className="px-3 py-2.5 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm">
                  No line items yet. Click &ldquo;Add Item&rdquo; to get started.
                </td>
              </tr>
            )}
            {items.map((item) => {
              return (
                <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-3 py-2">
                    <Select
                      value={item.material_id}
                      onValueChange={(v) => updateRow(item.id, { material_id: v || '' })}
                    >
                      <SelectTrigger className="w-full h-8 text-sm">
                        <SelectValue placeholder="Select material…" />
                      </SelectTrigger>
                      <SelectContent>
                        {materials.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name} {m.code ? `(${m.code})` : ''} — {m.unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={item.quantity}
                      onChange={(e) => updateRow(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-right w-24 ml-auto"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1 justify-end">
                      <span className="text-xs text-slate-400">{currency}</span>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.unit_price}
                        onChange={(e) => updateRow(item.id, { unit_price: parseFloat(e.target.value) || 0 })}
                        className="h-8 text-right w-28"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-slate-700">
                    {currency} {item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(item.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 p-1 rounded"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Mobile View Card Grid */}
        <div className="block md:hidden space-y-4 p-4 divide-y divide-slate-100 bg-white">
          {items.length === 0 && (
            <div className="py-8 text-center text-slate-400 text-sm">
              No line items yet. Click &ldquo;Add Item&rdquo; to get started.
            </div>
          )}
          {items.map((item, idx) => {
            return (
              <div key={item.id} className="pt-4 first:pt-0 space-y-3">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                  <span>Item #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeRow(item.id)}
                    className="text-red-500 hover:text-red-700 font-medium"
                  >
                    Remove
                  </button>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Material</label>
                  <Select
                    value={item.material_id}
                    onValueChange={(v) => updateRow(item.id, { material_id: v || '' })}
                  >
                    <SelectTrigger className="w-full h-8 text-sm">
                      <SelectValue placeholder="Select material…" />
                    </SelectTrigger>
                    <SelectContent>
                      {materials.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} {m.code ? `(${m.code})` : ''} — {m.unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Quantity</label>
                    <Input
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={item.quantity}
                      onChange={(e) => updateRow(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-right"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Unit Price ({currency})</label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.unit_price}
                      onChange={(e) => updateRow(item.id, { unit_price: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-right"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs pt-1">
                  <span className="font-semibold text-slate-500">Total</span>
                  <span className="font-bold text-[#2D6A4F]">
                    {currency} {item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add Item
        </Button>
        <div className="text-right">
          <p className="text-xs text-slate-500 mb-0.5">Subtotal</p>
          <p className="text-lg font-semibold text-slate-900">
            {currency} {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>
    </div>
  )
}

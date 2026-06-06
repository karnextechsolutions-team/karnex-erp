'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { BillOfMaterial } from '@/types/database'
import { CheckCircle2, AlertTriangle, Loader2, Package } from 'lucide-react'

interface BOMRow extends BillOfMaterial {
  current_stock: number
}

interface BOMViewerProps {
  productId: string
  plannedQty: number
}

export default function BOMViewer({ productId, plannedQty }: BOMViewerProps) {
  const [rows, setRows] = useState<BOMRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!productId) {
      setRows([])
      return
    }

    setLoading(true)
    const supabase = createClient()

    async function fetch() {
      // 1. Fetch BOM rows with raw material info
      const bomRes = await supabase
        .from('bill_of_materials')
        .select('*, raw_materials(*)')
        .eq('product_id', productId)
        .order('created_at')
      const bom = bomRes.data

      if (!bom || bom.length === 0) {
        setRows([])
        setLoading(false)
        return
      }

      // 2. For each material, sum stock from inventory_stock
      const materialIds = bom.map((b: any) => b.material_id)
      const stockRes = await supabase
        .from('inventory_stock')
        .select('material_id, quantity')
        .in('material_id', materialIds)
      const stock = stockRes.data

      // Aggregate stock per material
      const stockMap: Record<string, number> = {}
      for (const row of (stock ?? [])) {
        stockMap[row.material_id] = (stockMap[row.material_id] ?? 0) + Number(row.quantity)
      }

      setRows(
        (bom as BillOfMaterial[]).map((b: any) => ({
          ...b,
          current_stock: stockMap[b.material_id] ?? 0,
        }))
      )
      setLoading(false)
    }

    fetch()
  }, [productId])

  if (!productId) return null

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-slate-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading bill of materials…
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="py-6 text-center text-slate-400 text-sm">
        <Package className="w-6 h-6 mx-auto mb-2 text-slate-300" />
        No bill of materials found for this product
      </div>
    )
  }

  const qty = Math.max(0, plannedQty || 0)

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      {/* Desktop Table View */}
      <table className="hidden md:table w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Material</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Per Unit</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Required</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">In Stock</th>
            <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide w-24">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => {
            const totalRequired = row.quantity_required * qty
            const sufficient = row.current_stock >= totalRequired
            const unit = row.raw_materials?.unit ?? ''

            return (
              <tr key={row.id} className={`transition-colors ${!sufficient && qty > 0 ? 'bg-red-50/40' : 'hover:bg-slate-50/50'}`}>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{row.raw_materials?.name ?? '—'}</p>
                  {row.raw_materials?.code && (
                    <p className="text-xs text-slate-400">{row.raw_materials.code}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-slate-600">
                  {row.quantity_required} <span className="text-slate-400 text-xs">{unit}</span>
                </td>
                <td className="px-4 py-3 text-right font-medium text-slate-700">
                  {qty > 0 ? (
                    <>
                      {totalRequired.toLocaleString()} <span className="text-slate-400 text-xs">{unit}</span>
                    </>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-slate-600">
                  {row.current_stock.toLocaleString()} <span className="text-slate-400 text-xs">{unit}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  {qty > 0 ? (
                    sufficient ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        OK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Low
                      </span>
                    )
                  ) : (
                    <span className="text-slate-300 text-xs">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Mobile Card List View */}
      <div className="block md:hidden space-y-4 p-4 divide-y divide-slate-100 bg-white">
        {rows.map((row) => {
          const totalRequired = row.quantity_required * qty
          const sufficient = row.current_stock >= totalRequired
          const unit = row.raw_materials?.unit ?? ''

          return (
            <div key={row.id} className="pt-4 first:pt-0 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-slate-805 text-sm">{row.raw_materials?.name ?? '—'}</p>
                  {row.raw_materials?.code && (
                    <p className="text-xs text-slate-400 font-mono">{row.raw_materials.code}</p>
                  )}
                </div>
                {qty > 0 ? (
                  sufficient ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      <CheckCircle2 className="w-3 h-3" />
                      OK
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                      <AlertTriangle className="w-3 h-3" />
                      Low
                    </span>
                  )
                ) : (
                  <span className="text-slate-350 text-xs">—</span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs text-[#4A6358] pt-1">
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Per Unit</span>
                  <span className="font-medium text-slate-805">{row.quantity_required} {unit}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Required</span>
                  <span className="font-medium text-slate-805">
                    {qty > 0 ? `${totalRequired} ${unit}` : '—'}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">In Stock</span>
                  <span className="font-medium text-slate-805">{row.current_stock} {unit}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Feasibility summary */}
      {qty > 0 && (
        <div className={`px-4 py-2.5 border-t text-xs font-medium flex items-center gap-1.5 ${
          rows.every((r) => r.current_stock >= r.quantity_required * qty)
            ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
            : 'bg-red-50 border-red-100 text-red-600'
        }`}>
          {rows.every((r) => r.current_stock >= r.quantity_required * qty) ? (
            <><CheckCircle2 className="w-3.5 h-3.5" /> Sufficient stock for {qty} unit{qty !== 1 ? 's' : ''}</>
          ) : (
            <><AlertTriangle className="w-3.5 h-3.5" /> Insufficient stock for {qty} unit{qty !== 1 ? 's' : ''} — some materials are short</>
          )}
        </div>
      )}
    </div>
  )
}

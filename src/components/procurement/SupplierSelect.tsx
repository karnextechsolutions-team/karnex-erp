'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Supplier } from '@/types/database'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface SupplierSelectProps {
  value: string
  onValueChange: (value: string) => void
  className?: string
}

export default function SupplierSelect({ value, onValueChange, className }: SupplierSelectProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('suppliers')
      .select('*')
      .eq('is_active', true)
      .order('name')
      .then((res: any) => {
        setSuppliers(res.data ?? [])
        setLoading(false)
      })
  }, [])

  return (
    <Select value={value} onValueChange={(v) => onValueChange(v || '')}>
      <SelectTrigger className={className ?? 'w-full'} disabled={loading}>
        <SelectValue placeholder={loading ? 'Loading suppliers…' : 'Select a supplier'} />
      </SelectTrigger>
      <SelectContent>
        {suppliers.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

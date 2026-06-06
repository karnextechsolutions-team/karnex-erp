import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  iconColor?: string
  trend?: { value: number; label: string }
}

export default function StatsCard({ title, value, subtitle, icon: Icon, trend }: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl border border-[#E2EBE7] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-[#4A6358] font-medium uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-[#1A2E25] mt-1">{value}</p>
          {subtitle && <p className="text-xs text-[#8FAF9F] mt-0.5">{subtitle}</p>}
          {trend && (
            <p className={cn('text-xs mt-1.5 font-medium', trend.value >= 0 ? 'text-emerald-600' : 'text-red-500')}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <div className="p-2.5 rounded-lg bg-[#D8F3DC] text-[#2D6A4F]">
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}

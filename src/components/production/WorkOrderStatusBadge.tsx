import type { WorkOrder } from '@/types/database'

type WOStatus = WorkOrder['status']

const config: Record<WOStatus, { bg: string; dot: string; label: string }> = {
  planned:     { bg: 'bg-slate-100 text-slate-600',    dot: 'bg-slate-400',   label: 'Planned'     },
  in_progress: { bg: 'bg-blue-100 text-blue-700',      dot: 'bg-blue-500',    label: 'In Progress' },
  completed:   { bg: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', label: 'Completed'   },
  cancelled:   { bg: 'bg-red-100 text-red-600',         dot: 'bg-red-500',     label: 'Cancelled'   },
}

interface WorkOrderStatusBadgeProps {
  status: WOStatus
}

export default function WorkOrderStatusBadge({ status }: WorkOrderStatusBadgeProps) {
  const { bg, dot, label } = config[status] ?? config.planned
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  )
}

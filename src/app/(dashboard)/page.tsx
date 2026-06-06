import { createClient } from '@/lib/supabase/server'
import StatsCard from '@/components/shared/StatsCard'
import PageHeader from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import {
  ShoppingCart, Factory, Package, TruckIcon,
  AlertTriangle, DollarSign, Users, ClipboardList
} from 'lucide-react'
import { format } from 'date-fns'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { count: supplierCount },
    { count: activeWO },
    { count: pendingPO },
    { count: openSO },
    { data: recentOrders },
    { data: recentWO },
    { data: lowStock },
  ] = await Promise.all([
    supabase.from('suppliers').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('work_orders').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
    supabase.from('purchase_orders').select('*', { count: 'exact', head: true }).in('status', ['draft','sent']),
    supabase.from('sales_orders').select('*', { count: 'exact', head: true }).in('status', ['confirmed','dispatched']),
    supabase.from('sales_orders')
      .select('so_number, total_amount, status, order_date, customers(name)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('work_orders')
      .select('wo_number, status, planned_date, products(name)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('inventory_stock')
      .select('quantity, raw_materials(name, reorder_point, unit)')
      .lt('quantity', 50)
      .limit(5),
  ])

  const statusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600',
    confirmed: 'bg-blue-100 text-blue-700',
    dispatched: 'bg-amber-100 text-amber-700',
    delivered: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-600',
    planned: 'bg-slate-100 text-slate-600',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Good ${new Date().getHours() < 12 ? 'morning' : 'afternoon'} — here's what's happening today`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6 lg:mb-8">
        <StatsCard title="Active suppliers" value={supplierCount ?? 0} icon={Users} iconColor="text-teal-600" />
        <StatsCard title="Work orders running" value={activeWO ?? 0} icon={Factory} iconColor="text-amber-600" />
        <StatsCard title="Pending POs" value={pendingPO ?? 0} icon={ClipboardList} iconColor="text-blue-600" />
        <StatsCard title="Open sales orders" value={openSO ?? 0} icon={ShoppingCart} iconColor="text-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Recent sales orders</h2>
            </div>
            <div className="divide-y divide-slate-50">
              {recentOrders?.length === 0 && (
                <p className="text-sm text-slate-400 px-5 py-8 text-center">No sales orders yet</p>
              )}
              {recentOrders?.map((order: any) => (
                <div key={order.so_number} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{order.so_number}</p>
                    <p className="text-xs text-slate-400">{order.customers?.name} · {format(new Date(order.order_date), 'dd MMM yyyy')}</p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                    <span className="text-sm font-medium text-slate-900">
                      LKR {Number(order.total_amount).toLocaleString()}
                    </span>
                    <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[order.status] ?? ''}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Recent work orders</h2>
            </div>
            <div className="divide-y divide-slate-50">
              {recentWO?.length === 0 && (
                <p className="text-sm text-slate-400 px-5 py-8 text-center">No work orders yet</p>
              )}
              {recentWO?.map((wo: any) => (
                <div key={wo.wo_number} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{wo.wo_number}</p>
                    <p className="text-xs text-slate-400">{wo.products?.name} · {format(new Date(wo.planned_date), 'dd MMM yyyy')}</p>
                  </div>
                  <span className={`self-start sm:self-auto text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[wo.status] ?? ''}`}>
                    {wo.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-slate-900">Low stock alerts</h2>
            </div>
            <div className="divide-y divide-slate-50">
              {lowStock?.length === 0 && (
                <p className="text-sm text-slate-400 px-5 py-8 text-center">All stock levels OK</p>
              )}
              {lowStock?.map((item: any, i: number) => (
                <div key={i} className="px-5 py-3">
                  <p className="text-sm font-medium text-slate-900">{item.raw_materials?.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-red-500 font-medium">{item.quantity} {item.raw_materials?.unit} left</span>
                    <span className="text-xs text-slate-400">· reorder at {item.raw_materials?.reorder_point}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl p-5 text-white">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Quick actions</p>
            <div className="space-y-2 mt-3">
              {[
                { label: 'New purchase order', href: '/procurement/new' },
                { label: 'New work order', href: '/production/new' },
                { label: 'New sales order', href: '/sales/new' },
                { label: 'Record stock entry', href: '/inventory/new' },
              ].map(action => (
                <a key={action.href} href={action.href}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-sm text-slate-200">
                  {action.label}
                  <span className="text-slate-500">→</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

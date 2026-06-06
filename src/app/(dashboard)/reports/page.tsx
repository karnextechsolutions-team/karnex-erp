'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts'
import { TrendingUp, Package, Factory, Truck } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'

const COLORS = ['#2D6A4F', '#40916C', '#52B788', '#74C69D', '#95D5B2', '#B7E4C7']
const PIE_COLORS = ['#2D6A4F', '#EAB308', '#3B82F6', '#EF4444'] // Completed, In Progress, Planned, Cancelled

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [salesData, setSalesData] = useState<any[]>([])
  const [productsData, setProductsData] = useState<any[]>([])
  const [woData, setWoData] = useState<any[]>([])
  const [supplierData, setSupplierData] = useState<any[]>([])

  useEffect(() => {
    async function fetchReports() {
      setLoading(true)
      const supabase = createClient()

      try {
        // 1. Sales Revenue (Last 6 Months approximation from sales_orders)
        const { data: sales } = await supabase
          .from('sales_orders')
          .select('order_date, total_amount')
          .order('order_date', { ascending: true })
        
        if (sales) {
          const monthly: Record<string, number> = {}
          sales.forEach(so => {
            const date = new Date(so.order_date)
            const monthStr = date.toLocaleString('default', { month: 'short' }) + ' ' + date.getFullYear()
            monthly[monthStr] = (monthly[monthStr] || 0) + Number(so.total_amount)
          })
          const salesArr = Object.entries(monthly).map(([name, amount]) => ({ name, amount }))
          // Take last 6 months
          setSalesData(salesArr.slice(-6))
        }

        // 2. Top Products (From so_items)
        const { data: soItems } = await supabase
          .from('so_items')
          .select('quantity, products(name)')
        
        if (soItems) {
          const productMap: Record<string, number> = {}
          soItems.forEach(item => {
            const pName = item.products?.name || 'Unknown'
            productMap[pName] = (productMap[pName] || 0) + item.quantity
          })
          const prodArr = Object.entries(productMap)
            .map(([name, quantity]) => ({ name, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5) // Top 5
          setProductsData(prodArr)
        }

        // 3. Work Order Status
        const { data: wos } = await supabase
          .from('work_orders')
          .select('status')
        
        if (wos) {
          const statusMap: Record<string, number> = {
            'completed': 0,
            'in_progress': 0,
            'planned': 0,
            'cancelled': 0
          }
          wos.forEach(wo => {
            if (statusMap[wo.status] !== undefined) {
              statusMap[wo.status] += 1
            }
          })
          const woArr = [
            { name: 'Completed', value: statusMap['completed'] },
            { name: 'In Progress', value: statusMap['in_progress'] },
            { name: 'Planned', value: statusMap['planned'] },
            { name: 'Cancelled', value: statusMap['cancelled'] }
          ].filter(item => item.value > 0)
          setWoData(woArr)
        }

        // 4. Supplier Spend (From purchase_orders)
        const { data: pos } = await supabase
          .from('purchase_orders')
          .select('total_amount, suppliers(name)')
        
        if (pos) {
          const supplierMap: Record<string, number> = {}
          pos.forEach(po => {
            const sName = po.suppliers?.name || 'Unknown'
            supplierMap[sName] = (supplierMap[sName] || 0) + Number(po.total_amount)
          })
          const suppArr = Object.entries(supplierMap)
            .map(([name, spend]) => ({ name, spend }))
            .sort((a, b) => b.spend - a.spend)
            .slice(0, 5) // Top 5
          setSupplierData(suppArr)
        }

      } catch (err) {
        console.error('Error fetching reports:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchReports()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Reports" description="Analytics and business intelligence" />
        <div className="flex items-center justify-center h-64 bg-white rounded-xl border border-gray-200">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Reports & Analytics" description="Key performance indicators and business intelligence" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Sales Revenue Chart */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-green-50 text-green-700 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Sales Revenue</h3>
              <p className="text-xs text-gray-500">Monthly revenue trend (LKR)</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            {salesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#64748b' }} 
                    tickFormatter={(val) => `LKR ${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    cursor={{ stroke: '#e2e8f0', strokeWidth: 1, strokeDasharray: '5 5' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`LKR ${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Line type="monotone" dataKey="amount" stroke="#2D6A4F" strokeWidth={3} dot={{ r: 4, fill: '#2D6A4F', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">No sales data available</div>
            )}
          </div>
        </div>

        {/* Top Products Chart */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Top Selling Products</h3>
              <p className="text-xs text-gray-500">By quantity sold</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            {productsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productsData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} width={100} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    formatter={(value: number) => [value, 'Units Sold']}
                  />
                  <Bar dataKey="quantity" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">No product data available</div>
            )}
          </div>
        </div>

        {/* Work Order Status */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
              <Factory className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Production Status</h3>
              <p className="text-xs text-gray-500">Distribution of work orders</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            {woData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={woData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {woData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    formatter={(value: number) => [value, 'Work Orders']}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">No production data available</div>
            )}
          </div>
        </div>

        {/* Supplier Spend */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-purple-50 text-purple-700 rounded-lg">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Top Suppliers</h3>
              <p className="text-xs text-gray-500">By total spend (LKR)</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            {supplierData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={supplierData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#64748b' }} 
                    tickFormatter={(val) => `LKR ${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    formatter={(value: number) => [`LKR ${value.toLocaleString()}`, 'Spend']}
                  />
                  <Bar dataKey="spend" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={40}>
                    {supplierData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">No supplier data available</div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

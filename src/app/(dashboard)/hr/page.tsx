'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search, Calendar, Users, FileText, CheckCircle, XCircle, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import type { Employee, Attendance, Leave, Payslip } from '@/types/database'

export default function HRPage() {
  const [mainTab, setMainTab] = useState<'employees' | 'attendance' | 'leaves' | 'payroll'>('employees')
  
  const [employees, setEmployees] = useState<Employee[]>([])
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [payslips, setPayslips] = useState<Payslip[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0])
  const [payrollMonth, setPayrollMonth] = useState('')

  // Modals
  const [showAddEmp, setShowAddEmp] = useState(false)
  const [empForm, setEmpForm] = useState({
    name: '', emp_number: '', designation: '', department: '', contact_number: '', basic_salary: 0, joined_date: new Date().toISOString().split('T')[0]
  })

  // Attendance Form
  const [attRecords, setAttRecords] = useState<{employee_id: string, status: string, check_in_time: string, check_out_time: string}[]>([])

  async function fetchAll() {
    setLoading(true)
    const supabase = createClient()
    const [
      { data: empData },
      { data: attData },
      { data: leaveData },
      { data: payslipData },
      { data: { user } }
    ] = await Promise.all([
      supabase.from('employees').select('*').order('name'),
      supabase.from('attendance').select('*, employees(name)').eq('date', attDate),
      supabase.from('leaves').select('*, employees(name)').order('created_at', { ascending: false }),
      supabase.from('payslips').select('*, employees(name)').order('month_year', { ascending: false }),
      supabase.auth.getUser()
    ])
    
    setEmployees(empData ?? [])
    setAttendance(attData ?? [])
    setLeaves(leaveData ?? [])
    setPayslips(payslipData ?? [])
    setUserId(user?.id ?? null)

    // Sync local attendance records for the daily view
    const currentAtts = (attData ?? []).reduce((acc: any, curr: any) => {
      acc[curr.employee_id] = curr
      return acc
    }, {})

    const newAttRecords = (empData ?? []).filter((e: any) => e.status === 'Active').map((e: any) => ({
      employee_id: e.id,
      status: currentAtts[e.id]?.status || 'Present',
      check_in_time: currentAtts[e.id]?.check_in_time || '',
      check_out_time: currentAtts[e.id]?.check_out_time || ''
    }))
    setAttRecords(newAttRecords)

    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
  }, [attDate])

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('employees').insert({
      name: empForm.name,
      emp_number: empForm.emp_number,
      designation: empForm.designation,
      department: empForm.department,
      contact_number: empForm.contact_number,
      basic_salary: empForm.basic_salary,
      joined_date: empForm.joined_date,
      status: 'Active'
    })
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Employee added')
    setShowAddEmp(false)
    setEmpForm({ name: '', emp_number: '', designation: '', department: '', contact_number: '', basic_salary: 0, joined_date: new Date().toISOString().split('T')[0] })
    fetchAll()
  }

  const handleSaveAttendance = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/hr/attendance/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: attDate, records: attRecords })
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Attendance saved for ' + attDate)
      fetchAll()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateLeave = async (id: string, newStatus: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('leaves').update({ status: newStatus }).eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Leave updated')
    fetchAll()
  }

  const handleGeneratePayroll = async () => {
    if (!payrollMonth) return toast.error('Select a month to generate payroll')
    setSaving(true)
    try {
      const res = await fetch('/api/hr/payroll/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month_year: payrollMonth })
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const data = await res.json()
      toast.success(`Payroll generated for ${data.count} employees`)
      fetchAll()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const filteredEmployees = employees.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || e.emp_number.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto pb-24">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">HR & Payroll</h1>
        <p className="text-sm text-gray-500 mt-1">Manage employees, attendance, leaves, and salary generation.</p>
      </div>

      {/* TABS */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto mb-6 scrollbar-none -mx-4 px-4 md:mx-0 md:px-0 shadow-sm">
        {[
          { key: 'employees', label: 'Employees', icon: Users },
          { key: 'attendance', label: 'Attendance', icon: CheckCircle },
          { key: 'leaves', label: 'Leaves', icon: Calendar },
          { key: 'payroll', label: 'Payroll', icon: CreditCard }
        ].map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setMainTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all whitespace-nowrap ${
                mainTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          )
        })}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━ EMPLOYEES TAB ━━━━━━━━━━━━━━━━━━━━━ */}
      {mainTab === 'employees' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search employees..."
                value={search} onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowAddEmp(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" /> New Employee
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-4 py-3">Emp #</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Designation</th>
                  <th className="px-4 py-3 text-right">Basic Salary</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEmployees.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-gray-500">{e.emp_number}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{e.name}</td>
                    <td className="px-4 py-3 text-gray-600">{e.department}</td>
                    <td className="px-4 py-3 text-gray-600">{e.designation}</td>
                    <td className="px-4 py-3 text-right font-medium">LKR {Number(e.basic_salary).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      {e.status === 'Active' ? <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">Active</span> : <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-medium">Inactive</span>}
                    </td>
                  </tr>
                ))}
                {filteredEmployees.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-500">No employees found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━ ATTENDANCE TAB ━━━━━━━━━━━━━━━━━━━━━ */}
      {mainTab === 'attendance' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="text-sm font-semibold text-gray-700">Attendance Date:</label>
              <input
                type="date"
                value={attDate}
                onChange={e => setAttDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleSaveAttendance}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-semibold px-6 py-2 rounded-lg transition-colors shadow-sm w-full sm:w-auto"
            >
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Check In</th>
                  <th className="px-4 py-3">Check Out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.filter(e => e.status === 'Active').map(e => {
                  const record = attRecords.find(r => r.employee_id === e.id)
                  if (!record) return null
                  return (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{e.name} <span className="text-xs text-gray-400 block font-mono">{e.emp_number}</span></td>
                      <td className="px-4 py-3">
                        <select
                          value={record.status}
                          onChange={ev => {
                            const newRecs = [...attRecords]
                            const idx = newRecs.findIndex(r => r.employee_id === e.id)
                            if (idx >= 0) newRecs[idx].status = ev.target.value
                            setAttRecords(newRecs)
                          }}
                          className={`px-3 py-1.5 border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${record.status === 'Present' ? 'bg-green-50 text-green-700 border-green-200' : record.status === 'Absent' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}
                        >
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                          <option value="Half-Day">Half-Day</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="time"
                          value={record.check_in_time || ''}
                          onChange={ev => {
                            const newRecs = [...attRecords]
                            const idx = newRecs.findIndex(r => r.employee_id === e.id)
                            if (idx >= 0) newRecs[idx].check_in_time = ev.target.value
                            setAttRecords(newRecs)
                          }}
                          className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="time"
                          value={record.check_out_time || ''}
                          onChange={ev => {
                            const newRecs = [...attRecords]
                            const idx = newRecs.findIndex(r => r.employee_id === e.id)
                            if (idx >= 0) newRecs[idx].check_out_time = ev.target.value
                            setAttRecords(newRecs)
                          }}
                          className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━ LEAVES TAB ━━━━━━━━━━━━━━━━━━━━━ */}
      {mainTab === 'leaves' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leaves.map(lv => (
                  <tr key={lv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{lv.employees?.name}</td>
                    <td className="px-4 py-3 text-gray-600">{lv.leave_type}</td>
                    <td className="px-4 py-3 text-gray-600">{lv.start_date} to {lv.end_date}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={lv.reason || ''}>{lv.reason || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${lv.status === 'Approved' ? 'bg-green-100 text-green-700' : lv.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {lv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {lv.status === 'Pending' && (
                        <>
                          <button onClick={() => handleUpdateLeave(lv.id, 'Approved')} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><CheckCircle className="w-4 h-4" /></button>
                          <button onClick={() => handleUpdateLeave(lv.id, 'Rejected')} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><XCircle className="w-4 h-4" /></button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {leaves.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-500">No leave requests found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━ PAYROLL TAB ━━━━━━━━━━━━━━━━━━━━━ */}
      {mainTab === 'payroll' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Generate Payroll For Month</label>
              <input
                type="month"
                value={payrollMonth}
                onChange={e => setPayrollMonth(e.target.value)}
                className="w-full md:w-64 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleGeneratePayroll}
              disabled={saving || !payrollMonth}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-semibold px-6 py-2 rounded-lg transition-colors shadow-sm"
            >
              {saving ? 'Generating...' : 'Generate Payroll'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3 text-right">Basic</th>
                  <th className="px-4 py-3 text-right text-red-600">Deductions</th>
                  <th className="px-4 py-3 text-right text-green-600">Net Salary</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payslips.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">{p.month_year}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{p.employees?.name}</td>
                    <td className="px-4 py-3 text-right text-gray-600">LKR {Number(p.basic_amount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-red-600">LKR {Number(p.deductions).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-bold text-green-700">LKR {Number(p.net_salary).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{p.status}</span>
                    </td>
                  </tr>
                ))}
                {payslips.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-500">No generated payslips found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NEW EMPLOYEE MODAL */}
      {showAddEmp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">Add New Employee</h2>
            <form onSubmit={handleSaveEmployee} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name *</label>
                <input required value={empForm.name} onChange={e => setEmpForm({...empForm, name: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Employee Number *</label>
                  <input required value={empForm.emp_number} onChange={e => setEmpForm({...empForm, emp_number: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm uppercase" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Contact Number</label>
                  <input value={empForm.contact_number} onChange={e => setEmpForm({...empForm, contact_number: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Department</label>
                  <input value={empForm.department} onChange={e => setEmpForm({...empForm, department: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Designation</label>
                  <input value={empForm.designation} onChange={e => setEmpForm({...empForm, designation: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Basic Salary *</label>
                  <input type="number" required min="0" value={empForm.basic_salary || ''} onChange={e => setEmpForm({...empForm, basic_salary: Number(e.target.value)})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Joined Date *</label>
                  <input type="date" required value={empForm.joined_date} onChange={e => setEmpForm({...empForm, joined_date: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
              <div className="flex gap-3 pt-4 mt-6 border-t border-gray-100">
                <button type="button" onClick={() => setShowAddEmp(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 bg-white hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 text-sm font-semibold px-4 py-2 rounded-lg transition-colors">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

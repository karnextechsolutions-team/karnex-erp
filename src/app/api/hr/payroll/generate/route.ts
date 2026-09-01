import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Minimal RBAC
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || !['admin', 'ADMIN', 'HR', 'hr'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { month_year } = await req.json()
    if (!month_year) return NextResponse.json({ error: 'Missing month_year' }, { status: 400 })

    // Get the year and month to find start/end dates
    const [yearStr, monthStr] = month_year.split('-')
    const year = parseInt(yearStr, 10)
    const month = parseInt(monthStr, 10)
    
    // We calculate dates using UTC to avoid timezone drift
    const startDate = new Date(Date.UTC(year, month - 1, 1)).toISOString().split('T')[0]
    const endDate = new Date(Date.UTC(year, month, 0)).toISOString().split('T')[0]

    // 1. Fetch active employees
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('*')
      .eq('status', 'Active')

    if (empError) throw new Error(empError.message)
    if (!employees || employees.length === 0) return NextResponse.json({ error: 'No active employees found' }, { status: 400 })

    // 2. Fetch attendance for the month
    const { data: attendanceRecords, error: attError } = await supabase
      .from('attendance')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)

    if (attError) throw new Error(attError.message)

    // 3. Fetch leaves for the month
    // Need leaves that overlap with this month
    const { data: leaveRecords, error: leaveError } = await supabase
      .from('leaves')
      .select('*')
      .lte('start_date', endDate)
      .gte('end_date', startDate)

    if (leaveError) throw new Error(leaveError.message)

    const newPayslips: any[] = []

    for (const emp of employees) {
      // Basic daily rate based on 30 days divisor
      const basicSalary = Number(emp.basic_salary) || 0
      const dailyRate = basicSalary / 30

      // Calculate absences
      const empAttendance = attendanceRecords?.filter((a: any) => a.employee_id === emp.id) || []
      const fullAbsences = empAttendance.filter((a: any) => a.status === 'Absent').length
      const halfAbsences = empAttendance.filter((a: any) => a.status === 'Half-Day').length

      let noPayDays = fullAbsences + (halfAbsences * 0.5)

      // Calculate unpaid leaves overlapping the month
      const empLeaves = leaveRecords?.filter((l: any) => l.employee_id === emp.id) || []
      
      for (const lv of empLeaves) {
        // Find overlap days
        const start = new Date(Math.max(new Date(lv.start_date).getTime(), new Date(startDate).getTime()))
        const end = new Date(Math.min(new Date(lv.end_date).getTime(), new Date(endDate).getTime()))
        
        const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
        
        if (days > 0) {
          // If leave is No-Pay or Rejected, count as no pay days
          if (lv.leave_type === 'No-Pay' || lv.status === 'Rejected') {
             noPayDays += days
          }
        }
      }

      // We only deduct if noPayDays > 0.
      const totalDeductions = noPayDays * dailyRate
      const netSalary = basicSalary - totalDeductions

      newPayslips.push({
        employee_id: emp.id,
        month_year: month_year,
        basic_amount: basicSalary,
        allowances: 0,
        deductions: totalDeductions,
        net_salary: netSalary > 0 ? netSalary : 0,
        status: 'Generated'
      })
    }

    // Delete existing payslips for this month to allow re-generation
    await supabase.from('payslips').delete().eq('month_year', month_year)

    // Insert new payslips
    const { error: insertError } = await supabase.from('payslips').insert(newPayslips)
    if (insertError) throw new Error(insertError.message)

    return NextResponse.json({ success: true, count: newPayslips.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const emp = await db.employee.findUnique({
      where: { id },
      include: {
        expenses: { orderBy: { createdAt: 'desc' } },
        attendances: { orderBy: { date: 'desc' } },
        dailyLogs: { orderBy: { date: 'desc' }, take: 31 },
      },
    })
    if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    // FIX: Only count expenses with category "سلف العماله" as loans (not all expenses)
    const totalLoans = emp.expenses
      .filter(e => e.category === 'سلف العماله')
      .reduce((sum, e) => sum + e.amount, 0)

    const salaryPerDay = emp.salary / 30
    let deductions = 0
    for (const att of emp.attendances) {
      const qty = att.quantity || 1
      // FIX: Recognize 'ABSENCE' type (the API only creates VACATION and ABSENCE)
      // Also use quantity field for multi-day absences/vacations
      if (att.type === 'VACATION') {
        deductions += salaryPerDay * qty
      } else if (att.type === 'ABSENCE' || att.type === 'ABSENCE_FULL') {
        deductions += salaryPerDay * qty
      } else if (att.type === 'ABSENCE_HALF') {
        deductions += (salaryPerDay / 2) * qty
      }
    }
    return NextResponse.json({ ...emp, totalLoans, deductions, remainingSalary: emp.salary - totalLoans - deductions })
  } catch (error) {
    console.error('Error fetching employee:', error)
    return NextResponse.json({ error: 'Failed to fetch employee' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name.trim()
    if (body.jobTitle !== undefined) updateData.jobTitle = body.jobTitle
    if (body.specialization !== undefined) updateData.specialization = body.specialization
    if (body.salary !== undefined) updateData.salary = body.salary
    if (body.dailyHours !== undefined) updateData.dailyHours = body.dailyHours
    const emp = await db.employee.update({ where: { id }, data: updateData })
    return NextResponse.json(emp)
  } catch (error) {
    console.error('Error updating employee:', error)
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.employee.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting employee:', error)
    return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 })
  }
}

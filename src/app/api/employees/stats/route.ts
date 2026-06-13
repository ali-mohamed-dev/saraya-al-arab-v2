import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const employees = await db.employee.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        expenses: { select: { amount: true, category: true, createdAt: true, description: true, createdBy: true } },
        attendances: { select: { type: true, date: true, quantity: true, notes: true } },
      },
    })

    const result = employees.map(emp => {
      // FIX: Only count expenses with category "سلف العماله" as loans (not all expenses)
      const totalLoans = emp.expenses
        .filter((e: any) => e.category === 'سلف العماله')
        .reduce((sum: number, e: any) => sum + e.amount, 0)
      const salaryPerDay = emp.salary / 30
      let deductions = 0
      for (const att of emp.attendances) {
        const qty = (att as any).quantity || 1
        if (att.type === 'VACATION') deductions += salaryPerDay * qty
        else if (att.type === 'ABSENCE' || att.type === 'ABSENCE_FULL') deductions += salaryPerDay * qty
        else if (att.type === 'ABSENCE_HALF') deductions += (salaryPerDay / 2) * qty
      }
      const remainingSalary = emp.salary - totalLoans - deductions

      return {
        id: emp.id,
        name: emp.name,
        jobTitle: emp.jobTitle,
        specialization: emp.specialization,
        salary: emp.salary,
        dailyHours: emp.dailyHours,
        totalLoans,
        deductions,
        remainingSalary,
        loans: emp.expenses,
        attendances: emp.attendances,
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching employee stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}

import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(request: NextRequest) {
  try {
    const { employeeId, dailyHours } = await request.json()
    if (!employeeId || dailyHours == null || dailyHours < 0) {
      return NextResponse.json({ error: 'employeeId and dailyHours required (>= 0)' }, { status: 400 })
    }
    const emp = await db.employee.update({
      where: { id: employeeId },
      data: { dailyHours }
    })
    return NextResponse.json({ success: true, employee: emp })
  } catch (error) {
    console.error('Daily hours PUT error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

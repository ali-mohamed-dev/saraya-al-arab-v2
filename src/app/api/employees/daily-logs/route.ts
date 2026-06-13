import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
    const date = searchParams.get('date')

    if (date) {
      const d = new Date(date + 'T00:00:00')
      const next = new Date(d)
      next.setDate(next.getDate() + 1)
      const logs = await db.dailyLog.findMany({
        where: { date: { gte: d, lt: next } },
        include: { employee: { select: { id: true, name: true, jobTitle: true, dailyHours: true } } },
        orderBy: { employee: { name: 'asc' } }
      })
      return NextResponse.json(logs)
    }

    const startOfMonth = new Date(year, month - 1, 1)
    const startOfNext = new Date(year, month, 1)

    const logs = await db.dailyLog.findMany({
      where: { date: { gte: startOfMonth, lt: startOfNext } },
      include: { employee: { select: { id: true, name: true, jobTitle: true, dailyHours: true, salary: true } } },
      orderBy: [{ employee: { name: 'asc' } }, { date: 'asc' }]
    })

    const employees = await db.employee.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } })

    const attendances = await db.attendance.findMany({
      where: { date: { gte: startOfMonth, lt: startOfNext } }
    })

    return NextResponse.json({ logs, employees, attendances })
  } catch (error) {
    console.error('Daily logs GET error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

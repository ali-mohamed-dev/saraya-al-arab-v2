import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { employeeId, action, recordedBy } = await request.json()
    if (!employeeId || !action || !recordedBy) {
      return NextResponse.json({ error: 'employeeId, action, recordedBy required' }, { status: 400 })
    }

    const emp = await db.employee.findUnique({ where: { id: employeeId } })
    if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (action === 'clockIn') {
      const existing = await db.dailyLog.findFirst({
        where: { employeeId, date: { gte: today, lt: tomorrow } }
      })
      if (existing?.clockIn) {
        return NextResponse.json({ error: 'مسجل حضور بالفعل اليوم', log: existing }, { status: 400 })
      }
      const log = await db.dailyLog.create({
        data: { employeeId, date: new Date(), clockIn: new Date(), recordedBy, status: 'PRESENT' }
      })
      return NextResponse.json({ success: true, log, message: `تم تسجيل حضور ${emp.name}` })
    }

    if (action === 'clockOut') {
      const log = await db.dailyLog.findFirst({
        where: { employeeId, date: { gte: today, lt: tomorrow }, clockOut: null }
      })
      if (!log) {
        return NextResponse.json({ error: 'لم يسجل حضور اليوم أو تم تسجيل الانصراف بالفعل' }, { status: 400 })
      }
      const clockOut = new Date()
      const clockIn = log.clockIn!
      const workedMs = clockOut.getTime() - clockIn.getTime()
      const workedMinutes = Math.round(workedMs / 60000)
      const expectedMinutes = Math.round(emp.dailyHours * 60)
      const overtimeMinutes = Math.max(0, workedMinutes - expectedMinutes)

      const updated = await db.dailyLog.update({
        where: { id: log.id },
        data: { clockOut, overtimeMinutes }
      })
      const hrs = Math.floor(workedMinutes / 60)
      const mins = workedMinutes % 60
      return NextResponse.json({
        success: true,
        log: updated,
        message: `تم تسجيل انصراف ${emp.name} (${hrs}h ${mins}m)${overtimeMinutes > 0 ? ` — أوفر تايم ${Math.floor(overtimeMinutes / 60)}h ${overtimeMinutes % 60}m` : ''}`
      })
    }

    if (action === 'markAbsent') {
      const existing = await db.dailyLog.findFirst({
        where: { employeeId, date: { gte: today, lt: tomorrow } }
      })
      if (existing) {
        return NextResponse.json({ error: 'مسجل حضور بالفعل اليوم' }, { status: 400 })
      }
      const log = await db.dailyLog.create({
        data: { employeeId, date: new Date(), recordedBy, status: 'ABSENT' }
      })
      return NextResponse.json({ success: true, log, message: `تم تسجيل غياب ${emp.name}` })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Daily log error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const date = searchParams.get('date')

    if (!employeeId && !date) {
      return NextResponse.json({ error: 'employeeId or date required' }, { status: 400 })
    }

    if (employeeId) {
      const where: any = { employeeId }
      if (date) {
        const d = new Date(date + 'T00:00:00')
        const next = new Date(d)
        next.setDate(next.getDate() + 1)
        where.date = { gte: d, lt: next }
      }
      const logs = await db.dailyLog.findMany({ where, orderBy: { date: 'desc' } })
      return NextResponse.json(logs)
    }

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

    return NextResponse.json([])
  } catch (error) {
    console.error('Daily log GET error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

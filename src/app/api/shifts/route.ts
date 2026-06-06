import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/shifts - get all shifts or current open shift
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const current = searchParams.get('current')
    const date = searchParams.get('date')

    if (date) {
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      const shift = await db.shift.findFirst({
        where: {
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json(shift || null)
    }

    if (current === 'true') {
      const shift = await db.shift.findFirst({
        where: { status: 'OPEN' },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json(shift || null)
    }

    const shifts = await db.shift.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(shifts)
  } catch (error) {
    console.error('Error fetching shifts:', error)
    return NextResponse.json({ error: 'Failed to fetch shifts' }, { status: 500 })
  }
}

// POST /api/shifts - start a new shift
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { startedBy } = body

    // استخدام transaction لمنع إنشاء أكتر من شيفت مفتوح في نفس الوقت
    const shift = await db.$transaction(async (tx) => {
      // إغلاق أي شيفت مفتوح مع حساب الإيرادات
      const openShifts = await tx.shift.findMany({
        where: { status: 'OPEN' },
      })

      for (const openShift of openShifts) {
        // حساب الإيرادات قبل الإغلاق
        const orders = await tx.order.findMany({
          where: { shiftId: openShift.id, status: 'DELIVERED' },
          select: { total: true },
        })
        const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0)

        const expenses = await tx.expense.findMany({
          where: { shiftId: openShift.id },
          select: { amount: true },
        })
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

        await tx.shift.update({
          where: { id: openShift.id },
          data: {
            status: 'CLOSED',
            endedAt: new Date(),
            totalRevenue,
            totalExpenses,
            netRevenue: totalRevenue - totalExpenses,
          },
        })
      }

      // إنشاء الشيفت الجديد
      return tx.shift.create({
        data: {
          startedBy: startedBy || 'admin',
          status: 'OPEN',
        },
      })
    })

    return NextResponse.json(shift, { status: 201 })
  } catch (error) {
    console.error('Error creating shift:', error)
    return NextResponse.json({ error: 'Failed to create shift' }, { status: 500 })
  }
}

import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'

// GET /api/shifts - get all shifts or current open shift
export async function GET(request: NextRequest) {
  if (!requireRole(request, ['ADMIN', 'CASHIER', 'WAITER', 'KITCHEN', 'BARISTA'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
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

    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const where: any = {}
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to) where.createdAt.lte = new Date(to)
    }

    const shifts = await db.shift.findMany({
      where,
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
  if (!requireRole(request, ['ADMIN', 'CASHIER'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
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
          select: { total: true, discountAmount: true, discountType: true, payments: true },
        })
        const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0)
        const totalDiscounts = orders.reduce((sum, o) => sum + (o.discountAmount || 0), 0)
        const totalLoyaltyDiscounts = orders
          .filter(o => o.discountType === 'POINTS')
          .reduce((sum, o) => sum + (o.discountAmount || 0), 0)

        const cashRevenue = orders.reduce((sum, o) => {
          const payments = o.payments as Array<{ method: string; amount: number }> | null | undefined
          if (payments && payments.length > 0) {
            return sum + payments.filter(p => p.method === 'CASH').reduce((s, p) => s + p.amount, 0)
          }
          return sum + o.total
        }, 0)
        const visaRevenue = orders.reduce((sum, o) => {
          const payments = o.payments as Array<{ method: string; amount: number }> | null | undefined
          if (payments && payments.length > 0) {
            return sum + payments.filter(p => p.method === 'VISA').reduce((s, p) => s + p.amount, 0)
          }
          return sum + 0
        }, 0)
        const vodafoneCashRevenue = orders.reduce((sum, o) => {
          const payments = o.payments as Array<{ method: string; amount: number }> | null | undefined
          if (payments && payments.length > 0) {
            return sum + payments.filter(p => p.method === 'VODAFONE_CASH').reduce((s, p) => s + p.amount, 0)
          }
          return sum + 0
        }, 0)

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
            netRevenue: cashRevenue - totalExpenses,
            totalDiscounts,
            totalLoyaltyDiscounts,
            cashRevenue,
            visaRevenue,
            vodafoneCashRevenue,
          },
        })
      }

      if (!startedBy || typeof startedBy !== 'string' || !startedBy.trim()) {
        return NextResponse.json({ error: 'staffName required' }, { status: 400 })
      }
      const newShift = await tx.shift.create({
        data: {
          startedBy: startedBy.trim(),
          status: 'OPEN',
        },
      })

      // Reassign any non-terminal orders from closed shifts to the new shift
      for (const closedShift of openShifts) {
        await tx.order.updateMany({
          where: {
            shiftId: closedShift.id,
            status: { notIn: ['DELIVERED', 'CANCELLED'] },
          },
          data: { shiftId: newShift.id },
        })
      }

      return newShift
    })

    return NextResponse.json(shift, { status: 201 })
  } catch (error) {
    console.error('Error creating shift:', error)
    return NextResponse.json({ error: 'Failed to create shift' }, { status: 500 })
  }
}

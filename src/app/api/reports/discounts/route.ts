import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!from || !to) {
      return NextResponse.json({ error: 'from and to params are required' }, { status: 400 })
    }

    // FIX: support both date-only (YYYY-MM-DD, treated as local-day boundaries)
    // and full ISO datetime strings (treated as exact instants).
    const parseLocalStart = (s: string) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [y, m, d] = s.split('-').map(Number)
        return new Date(y, m - 1, d, 0, 0, 0, 0)
      }
      return new Date(s)
    }
    const parseLocalEnd = (s: string) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [y, m, d] = s.split('-').map(Number)
        return new Date(y, m - 1, d, 23, 59, 59, 999)
      }
      return new Date(s)
    }

    const fromDate = parseLocalStart(from)
    const toDate = parseLocalEnd(to)

    const [discountedOrders, revenueResult, shiftResult] = await Promise.all([
      db.order.findMany({
        where: {
          createdAt: { gte: fromDate, lte: toDate },
          status: 'DELIVERED',
          discountAmount: { gt: 0 },
        },
        select: {
          orderNumber: true,
          discountType: true,
          discountValue: true,
          discountAmount: true,
          discountReason: true,
          discountAppliedBy: true,
          customerName: true,
          createdAt: true,
          total: true,
          subtotal: true,
          serviceCharge: true,
          deliveryFee: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.order.aggregate({
        _sum: { total: true },
        where: {
          createdAt: { gte: fromDate, lte: toDate },
          status: 'DELIVERED',
        },
      }),
      db.shift.aggregate({
        _sum: { totalRevenue: true, totalDiscounts: true, totalLoyaltyDiscounts: true, totalExpenses: true },
        where: {
          startedAt: { gte: fromDate, lte: toDate },
        },
      }),
    ])

    const totalDiscounts = discountedOrders.reduce((s, o) => s + o.discountAmount, 0)
    const totalRevenue = revenueResult._sum.total ?? 0
    const shiftRevenue = shiftResult._sum.totalRevenue ?? 0
    const shiftDiscounts = shiftResult._sum.totalDiscounts ?? 0
    const shiftLoyaltyDiscounts = shiftResult._sum.totalLoyaltyDiscounts ?? 0
    const shiftExpenses = shiftResult._sum.totalExpenses ?? 0

    return NextResponse.json({
      orders: discountedOrders,
      totalDiscounts,
      totalRevenue,
      shiftRevenue,
      shiftDiscounts,
      shiftLoyaltyDiscounts,
      shiftExpenses,
    })
  } catch (error) {
    console.error('Discounts report error:', error)
    return NextResponse.json({ error: 'Failed to fetch discounts' }, { status: 500 })
  }
}

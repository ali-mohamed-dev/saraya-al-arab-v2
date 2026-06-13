import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'

// POST /api/reports/handover — Hand over monthly net revenue to owner
export async function POST(request: NextRequest) {
  if (!requireRole(request, ['ADMIN'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  try {
    const body = await request.json()
    const { month, year, notes, handedOverBy } = body

    if (month === undefined || month === null || !year || !handedOverBy) {
      return NextResponse.json({ error: 'month, year, and handedOverBy are required' }, { status: 400 })
    }

    const m = parseInt(month)
    const y = parseInt(year)
    if (isNaN(m) || m < 1 || m > 12 || isNaN(y)) {
      return NextResponse.json({ error: 'Invalid month or year' }, { status: 400 })
    }

    // Check if already handed over
    const existing = await db.monthlyHandover.findUnique({
      where: { month_year: { month: m, year: y } },
    })
    if (existing) {
      return NextResponse.json({ error: 'هذا الشهر تم تسليمه مسبقاً للأونر' }, { status: 409 })
    }

    // Calculate month totals — same logic as admin-expense-manager.tsx
    const from = new Date(y, m - 1, 1)
    const to = new Date(y, m, 0, 23, 59, 59, 999)

    const [allExpenses, shifts, revenueResult] = await Promise.all([
      db.expense.findMany({
        where: { createdAt: { gte: from, lte: to } },
      }),
      db.shift.findMany({
        where: { startedAt: { gte: from, lte: to } },
        select: { id: true, totalRevenue: true, totalDiscounts: true, totalLoyaltyDiscounts: true, startedAt: true },
      }),
      db.order.aggregate({
        _sum: { total: true },
        where: {
          createdAt: { gte: from, lte: to },
          status: 'DELIVERED',
        },
      }),
    ])

    // Filter expenses by shift date range (same as admin-expense-manager)
    const shiftIds = new Set(shifts.map(s => s.id))
    const filteredExpenses = allExpenses.filter(e => !e.shiftId || shiftIds.has(e.shiftId))

    const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0)
    const totalRevenue = revenueResult._sum.total ?? shifts.reduce((s, sh) => s + sh.totalRevenue, 0)
    const totalDiscounts = shifts.reduce((s, sh) => s + (sh.totalDiscounts || 0) + (sh.totalLoyaltyDiscounts || 0), 0)
    const netRevenue = totalRevenue - totalExpenses

    const handover = await db.monthlyHandover.create({
      data: {
        month: m,
        year: y,
        totalRevenue,
        totalExpenses,
        totalDiscounts,
        netRevenue,
        handedOverBy,
        notes: notes || '',
      },
    })

    return NextResponse.json(handover, { status: 201 })
  } catch (error) {
    console.error('Error creating handover:', error)
    return NextResponse.json({ error: 'Failed to hand over month' }, { status: 500 })
  }
}

// GET /api/reports/handover?month=6&year=2026 — Check handover status
export async function GET(request: NextRequest) {
  if (!requireRole(request, ['ADMIN'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    const where: Record<string, unknown> = {}
    if (month) where.month = parseInt(month)
    if (year) where.year = parseInt(year)

    const handovers = await db.monthlyHandover.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })

    return NextResponse.json(handovers)
  } catch (error) {
    console.error('Error fetching handovers:', error)
    return NextResponse.json({ error: 'Failed to fetch handovers' }, { status: 500 })
  }
}

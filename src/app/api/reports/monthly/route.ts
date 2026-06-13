import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { generateMonthlyReportExcel } from '@/lib/saraya/excel-export'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const title = searchParams.get('title') || undefined

    if (!from || !to) {
      return NextResponse.json({ error: 'from and to params are required' }, { status: 400 })
    }

    // FIX: `from`/`to` arrive as date-only strings (YYYY-MM-DD) or full ISO strings.
    // `new Date('YYYY-MM-DD')` parses as UTC midnight, which shifts the range by
    // the server's UTC offset relative to the user's local day. Parse date-only
    // strings as local-day boundaries instead.
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

    // Fetch all shifts (open + closed) for revenue, within range
    const shifts = await db.shift.findMany({
      where: {
        startedAt: { gte: fromDate, lte: toDate },
      },
    })

    // ── Expenses ──────────────────────────────────────
    // FIX: previously only admin expenses (shiftId: null) were included here,
    // while the on-screen preview also includes shift-bound expenses
    // (matched by their shift's startedAt). Replicate that logic here so the
    // exported Excel matches the preview totals.
    const shiftExpenses = await db.expense.findMany({
      where: { shiftId: { in: shifts.map(s => s.id) } },
      orderBy: { createdAt: 'desc' },
    })
    const adminExpenses = await db.expense.findMany({
      where: {
        shiftId: null,
        createdAt: { gte: fromDate, lte: toDate },
      },
      orderBy: { createdAt: 'desc' },
    })
    const expenses = [...shiftExpenses, ...adminExpenses]

    const totalRevenue = shifts.reduce((s, sh) => {
      // FIX: For OPEN shifts, totalRevenue is 0 in the DB (only set on close).
      // Calculate live revenue from DELIVERED orders instead.
      if (sh.status === 'OPEN') return s // Will be added from orders below
      return s + sh.totalRevenue
    }, 0)

    // ── Orders ──────────────────────────────────────
    // Fetch DELIVERED orders within the date range for:
    // 1. Open shift revenue calculation
    // 2. Discount reporting (from orders directly, not shifts - avoids double-counting)
    const deliveredOrders = await db.order.findMany({
      where: {
        createdAt: { gte: fromDate, lte: toDate },
        status: 'DELIVERED',
      },
      select: {
        id: true,
        orderNumber: true,
        subtotal: true,
        serviceCharge: true,
        deliveryFee: true,
        total: true,
        discountType: true,
        discountValue: true,
        discountAmount: true,
        discountReason: true,
        discountAppliedBy: true,
        customerName: true,
        shiftId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Add revenue from orders belonging to OPEN shifts
    const openShiftIds = new Set(shifts.filter(s => s.status === 'OPEN').map(s => s.id))
    const openShiftRevenue = deliveredOrders
      .filter(o => openShiftIds.has(o.shiftId || ''))
      .reduce((s, o) => s + o.total, 0)

    const totalRevenueWithOpen = totalRevenue + openShiftRevenue
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
    const netRevenue = totalRevenueWithOpen - totalExpenses

    // ── Discount data ────────────────────────────────
    // FIX: Use ONLY order-level discounts, NOT shift-level.
    // Shift totalDiscounts is already derived from order discounts,
    // so adding both would be double-counting.
    const discountedOrders = deliveredOrders.filter(o => (o.discountAmount || 0) > 0)
    const totalDiscounts = discountedOrders.reduce((s, o) => s + (o.discountAmount || 0), 0)
    const totalLoyaltyDiscounts = discountedOrders
      .filter(o => o.discountType === 'POINTS')
      .reduce((s, o) => s + (o.discountAmount || 0), 0)

    // Group by category
    const catMap = new Map<string, number>()
    for (const e of expenses) {
      catMap.set(e.category, (catMap.get(e.category) || 0) + e.amount)
    }
    const categoryTotals = Array.from(catMap.entries()).map(([category, total]) => ({ category, total }))

    // Map to expense rows
    const expenseRows = expenses.map(e => ({
      title: e.description,
      amount: e.amount,
      category: e.category,
      addedBy: e.createdBy,
      createdAt: e.createdAt,
    }))

    const revenueRows = shifts.map(sh => ({
      shiftId: sh.id,
      startedAt: sh.startedAt,
      totalRevenue: sh.status === 'OPEN'
        ? deliveredOrders.filter(o => o.shiftId === sh.id).reduce((s, o) => s + o.total, 0)
        : sh.totalRevenue,
    }))

    const fromSafe = from.slice(0, 10)
    const toSafe = to.slice(0, 10)

    const xlsxBuffer = await generateMonthlyReportExcel({
      title,
      fromDate: from,
      toDate: to,
      revenues: revenueRows,
      expenses: expenseRows,
      categoryTotals,
      totalRevenue: totalRevenueWithOpen,
      totalExpenses,
      netRevenue,
      discountedOrders,
      totalDiscounts,
      totalLoyaltyDiscounts,
    })

    return new NextResponse(new Uint8Array(xlsxBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="monthly-report-${fromSafe}-${toSafe}.xlsx"`,
      },
    })
  } catch (error) {
    console.error('Monthly report error:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}

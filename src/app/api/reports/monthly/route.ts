import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { generateMonthlyReportExcel } from '@/lib/saraya/excel-export'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!from || !to) {
      return NextResponse.json({ error: 'from and to params are required' }, { status: 400 })
    }

    const fromDate = new Date(from)
    const toDate = new Date(to)
    toDate.setHours(23, 59, 59, 999)

    // Fetch admin expenses in date range
    const expenses = await db.expense.findMany({
      where: {
        shiftId: null,
        createdAt: { gte: fromDate, lte: toDate },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Fetch closed shifts for revenue
    const shifts = await db.shift.findMany({
      where: {
        status: 'CLOSED',
        startedAt: { gte: fromDate, lte: toDate },
      },
    })

    const totalRevenue = shifts.reduce((s, sh) => s + sh.totalRevenue, 0)
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
    const netRevenue = totalRevenue - totalExpenses

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
      totalRevenue: sh.totalRevenue,
    }))

    const fromDisplay = fromDate.toLocaleDateString('ar-EG')
    const toDisplay = toDate.toLocaleDateString('ar-EG')
    const fromSafe = fromDate.toISOString().slice(0, 10)
    const toSafe = toDate.toISOString().slice(0, 10)

    const xlsxBuffer = await generateMonthlyReportExcel({
      fromDate: fromDisplay,
      toDate: toDisplay,
      revenues: revenueRows,
      expenses: expenseRows,
      categoryTotals,
      totalRevenue,
      totalExpenses,
      netRevenue,
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

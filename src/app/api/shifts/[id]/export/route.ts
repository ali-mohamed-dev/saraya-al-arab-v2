import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateShiftExcel } from '@/lib/saraya/excel-export'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const shift = await db.shift.findUnique({
      where: { id },
    })

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    // Fetch expenses for this shift (not deleted on close)
    const expenses = await db.expense.findMany({
      where: { shiftId: id },
      orderBy: { createdAt: 'desc' },
    })

    // Orders may have been deleted on close; use stored totals from Shift model
    const totalRevenue = shift.totalRevenue ?? 0
    const totalExpenses = shift.totalExpenses ?? expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0)
    const netRevenue = shift.netRevenue ?? (totalRevenue - totalExpenses)

    const xlsxBuffer = await generateShiftExcel({
      shift: {
        startedAt: shift.startedAt,
        endedAt: shift.endedAt ?? undefined,
        startedBy: shift.startedBy ?? '',
        endedBy: shift.endedBy ?? undefined,
        notes: shift.notes ?? undefined,
      },
      orders: [],
      cancelledOrders: [],
      discountedOrders: [],
      expenses: expenses.map((e) => ({
        title: e.description ?? '',
        amount: e.amount ?? 0,
        category: e.category ?? 'عام',
        addedBy: e.createdBy ?? '',
        createdAt: e.createdAt,
      })),
      totalRevenue,
      totalExpenses,
      netRevenue,
      totalDiscounts: shift.totalDiscounts ?? 0,
      cashRevenue: shift.cashRevenue ?? 0,
      visaRevenue: shift.visaRevenue ?? 0,
      vodafoneCashRevenue: shift.vodafoneCashRevenue ?? 0,
    })

    return new NextResponse(new Uint8Array(xlsxBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="shift-${id.slice(0, 8)}.xlsx"`,
      },
    })
  } catch (error) {
    console.error('export shift error:', error)
    return NextResponse.json({ error: 'Failed to export shift' }, { status: 500 })
  }
}

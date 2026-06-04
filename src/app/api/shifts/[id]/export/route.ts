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

    // Fetch orders and expenses for this shift
    const orders = await db.order.findMany({
      where: { shiftId: id, status: 'DELIVERED' },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    })

    const expenses = await db.expense.findMany({
      where: { shiftId: id },
      orderBy: { createdAt: 'desc' },
    })

    const totalRevenue = orders.reduce((sum, o) => sum + (o.total ?? 0), 0)
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0)
    const netRevenue = totalRevenue - totalExpenses

    const xlsxBuffer = await generateShiftExcel({
      shift: {
        startedAt: shift.createdAt,
        endedAt: shift.endedAt ?? undefined,
        startedBy: shift.startedBy ?? '',
        endedBy: shift.endedBy ?? undefined,
        notes: shift.notes ?? undefined,
      },
      orders: orders.map((o) => ({
        orderNumber: o.orderNumber ?? 0,
        type: o.type,
        status: o.status,
        tableNumber: o.tableNumber,
        total: o.total ?? 0,
        customerName: o.customerName,
        createdAt: o.createdAt,
        items: o.items?.map((it) => ({
          name: it.mealTitle,
          qty: it.quantity,
          price: it.price,
        })),
      })),
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

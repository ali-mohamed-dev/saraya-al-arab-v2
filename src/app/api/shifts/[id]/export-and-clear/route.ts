import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateShiftExcel } from '@/lib/saraya/excel-export'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const { endedBy, notes, includeNonDelivered } = body as {
    endedBy?: string
    notes?: string
    includeNonDelivered?: boolean
  }

  try {
    const result = await db.$transaction(async (tx) => {
      // Fetch shift orders
      const orders = await tx.order.findMany({
        where: {
          shiftId: id,
          ...(includeNonDelivered ? {} : { status: 'DELIVERED' }),
        },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      })

      const deliveredOrders = orders.filter(o => o.status === 'DELIVERED')
      const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (o.total ?? 0), 0)

      // Expenses for shift
      const expenses = await tx.expense.findMany({
        where: { shiftId: id },
        orderBy: { createdAt: 'desc' },
      })
      const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0)
      const netRevenue = totalRevenue - totalExpenses

      // Close shift — use correct schema field names: endedAt / endedBy
      const shift = await tx.shift.update({
        where: { id },
        data: {
          status: 'CLOSED',
          endedAt: new Date(),   // FIX: was closedAt (field doesn't exist in schema)
          endedBy: endedBy || '', // FIX: was closedBy (field doesn't exist in schema)
          notes: notes || '',
        },
      })

      // Clear orders and expenses for this shift
      const orderIds = orders.map((o) => o.id)
      if (orderIds.length > 0) {
        await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } })
      }

      await tx.order.deleteMany({
        where: {
          shiftId: id,
          ...(includeNonDelivered ? {} : { status: 'DELIVERED' }),
        },
      })

      await tx.expense.deleteMany({ where: { shiftId: id } })

      return { shift, orders, expenses, netRevenue, totalRevenue, totalExpenses }
    })

    // Generate Excel file
    const xlsxBuffer = await generateShiftExcel({
      shift: {
        startedAt: result.shift.createdAt,
        endedAt: result.shift.endedAt,   // FIX: was result.shift.closedAt
        startedBy: result.shift.startedBy,
        endedBy: result.shift.endedBy,   // FIX: was result.shift.closedBy
        notes: result.shift.notes,
      },
      orders: result.orders.map((o) => ({
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
      expenses: result.expenses.map((e) => ({
        title: e.description ?? '',
        amount: e.amount ?? 0,
        category: e.category ?? 'عام',
        addedBy: e.createdBy ?? '',
        createdAt: e.createdAt,
      })),
      totalRevenue: result.totalRevenue,
      totalExpenses: result.totalExpenses,
      netRevenue: result.netRevenue,
    })

    // Return xlsx as binary response
    return new NextResponse(new Uint8Array(xlsxBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="shift-${id.slice(0, 8)}.xlsx"`,
      },
    })
  } catch (error) {
    console.error('export-and-clear error:', error)
    return NextResponse.json({ error: 'Failed to export and clear' }, { status: 500 })
  }
}

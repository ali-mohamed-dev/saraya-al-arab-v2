import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function csvEscape(value: string) {
  const v = value ?? ''
  return `"${String(v).replace(/"/g, '""')}"`
}

function toCSV(rows: string[][]) {
  return rows.map((r) => r.map(csvEscape).join(',')).join('\n')
}

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
    // Use a transaction to guarantee: export view is consistent + then clear data
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

      const deliveredTotals = orders.reduce((sum, o) => sum + (o.total ?? 0), 0)

      // Expenses for shift
      const expenses = await tx.expense.findMany({
        where: { shiftId: id },
        orderBy: { createdAt: 'desc' },
      })
      const expensesTotal = expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0)

      const netRevenue = deliveredTotals - expensesTotal

      // Update shift (close)
      const shift = await tx.shift.update({
        where: { id },
        data: {
          status: 'CLOSED',
          endedAt: new Date(),
          endedBy: endedBy || '',
          totalRevenue: deliveredTotals,
          totalExpenses: expensesTotal,
          netRevenue,
          notes: notes || '',
        },
      })

      const rows: string[][] = []
      rows.push(['اسم المصروف', 'نوع المصروف', 'السعر'])
      for (const e of expenses) {
        rows.push([
          e.title ?? '',
          e.category ?? 'عام',
          String(e.amount ?? 0),
        ])
      }
      if (expenses.length === 0) {
        rows.push(['(لا توجد مصاريف)', '', ''])
      }

      // Clear cashier/day data: delete OrderItems first then Orders; and delete expenses of shift
      // (Order->OrderItem is cascade, but deleting explicitly keeps the intent clear.)
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

      return { csv: toCSV(rows), netRevenue, totalRevenue: deliveredTotals, totalExpenses: expensesTotal, shiftId: id }
    })

    const blob = new Blob(['\uFEFF' + result.csv], { type: 'text/csv;charset=utf-8;' })
    // NextResponse cannot stream Blob from server the same way as browser.
    // So return as plain text and let frontend convert to blob.
    return NextResponse.json({
      csv: result.csv,
      totals: {
        totalRevenue: result.totalRevenue,
        totalExpenses: result.totalExpenses,
        netRevenue: result.netRevenue,
      },
      shiftId: result.shiftId,
    })
  } catch (error) {
    console.error('export-and-clear error:', error)
    return NextResponse.json({ error: 'Failed to export and clear' }, { status: 500 })
  }
}


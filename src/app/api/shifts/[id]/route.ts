import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// PUT /api/shifts/[id] - close a shift with summary
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { endedBy, notes } = body

    // Calculate revenue from DELIVERED orders in this shift
    const orders = await db.order.findMany({
      where: { shiftId: id, status: 'DELIVERED' },
      select: { total: true },
    })
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0)

    // Calculate total expenses for this shift
    const expenses = await db.expense.findMany({
      where: { shiftId: id },
      select: { amount: true },
    })
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
    const netRevenue = totalRevenue - totalExpenses

    const shift = await db.shift.update({
      where: { id },
      data: {
        status: 'CLOSED',
        endedAt: new Date(),
        endedBy: endedBy || '',
        totalRevenue,
        totalExpenses,
        netRevenue,
        notes: notes || '',
      },
    })

    return NextResponse.json(shift)
  } catch (error) {
    console.error('Error closing shift:', error)
    return NextResponse.json({ error: 'Failed to close shift' }, { status: 500 })
  }
}

// GET /api/shifts/[id] - get shift details with orders and expenses
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const shift = await db.shift.findUnique({ where: { id } })
    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    const orders = await db.order.findMany({
      where: { shiftId: id },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    })

    const expenses = await db.expense.findMany({
      where: { shiftId: id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ shift, orders, expenses })
  } catch (error) {
    console.error('Error fetching shift:', error)
    return NextResponse.json({ error: 'Failed to fetch shift' }, { status: 500 })
  }
}

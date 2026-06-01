import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'PREPARING', 'READY', 'READY_TO_PAY', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'READY', 'READY_TO_PAY', 'CANCELLED'],
  PREPARING: ['READY', 'READY_TO_PAY', 'CANCELLED'],
  READY: ['READY_TO_PAY', 'DELIVERED', 'CANCELLED'],
  READY_TO_PAY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['CANCELLED'],
  CANCELLED: [],
}

// PUT /api/orders/[id]/status - Quick status update with validation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const payload = await request.json()
    const status = payload?.status

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    const validStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'READY_TO_PAY', 'DELIVERED', 'CANCELLED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status: ${status}` }, { status: 400 })
    }

    const existing = await db.order.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const allowedTransitions = VALID_TRANSITIONS[existing.status] || []
    if (!allowedTransitions.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${existing.status} to ${status}` },
        { status: 400 }
      )
    }

    const order = await db.order.update({
      where: { id },
      data: {
        status,
        ...(status === 'CANCELLED' ? { cancelledBy: (payload.cancelledBy as string) || 'admin' } : {}),
      },
      include: { items: true },
    })

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error updating order status:', error)
    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 })
  }
}

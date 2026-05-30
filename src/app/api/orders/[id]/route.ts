import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/orders/[id] - Get a single order with its items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const order = await db.order.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 })
  }
}

// PUT /api/orders/[id] - Update an order (mainly for status changes)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.order.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (body.status !== undefined) updateData.status = body.status
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.customerName !== undefined) updateData.customerName = body.customerName
    if (body.customerPhone !== undefined) updateData.customerPhone = body.customerPhone
    if (body.deliveryAddress !== undefined) updateData.deliveryAddress = body.deliveryAddress
    if (body.tableNumber !== undefined) updateData.tableNumber = body.tableNumber
    if (body.pickupTime !== undefined) updateData.pickupTime = body.pickupTime

    const order = await db.order.update({
      where: { id },
      data: updateData,
      include: { items: true },
    })

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}

// DELETE /api/orders/[id] - Cancel an order (set status to CANCELLED)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.order.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (existing.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Order is already cancelled' }, { status: 400 })
    }

    if (existing.status === 'DELIVERED') {
      return NextResponse.json({ error: 'Cannot cancel a delivered order' }, { status: 400 })
    }

    const order = await db.order.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: { items: true },
    })

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error cancelling order:', error)
    return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 })
  }
}

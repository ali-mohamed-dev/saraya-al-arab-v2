import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { releasePhoneOrder } from '@/lib/saraya/rate-limit'

// PUT /api/orders/[id]/status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { status, kitchenAccess } = await request.json()

    const order = await db.order.findUnique({ where: { id } })

    if (!order) {
      return NextResponse.json({ id, deleted: true, status: 'DELIVERED' }, { status: 200 })
    }

    // تحديث حالة الطلب مع تحديث kitchenStatus/baristaStatus لو لازم
    const updateData: Record<string, any> = {
      status,
      kitchenAccess: kitchenAccess !== undefined ? kitchenAccess : undefined,
    }

    // لما الطلب يتحول لـ DELIVERED أو CANCELLED، نحدث المطبخ والباريستا كمان
    if (status === 'DELIVERED' || status === 'CANCELLED') {
      updateData.kitchenStatus = status
      updateData.baristaStatus = status
      if (order.customerPhone) {
        releasePhoneOrder(order.customerPhone)
      }
    }

    const updatedOrder = await db.order.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error('Update order status error:', error)
    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 })
  }
}
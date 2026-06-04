import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// PUT /api/orders/[id]/status
// تحديث حالة الطلب (PENDING -> CONFIRMED -> PREPARING -> READY -> READY_TO_PAY)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { status, kitchenAccess } = await request.json()

    // 1. التحقق من وجود الطلب أولاً
    const order = await db.order.findUnique({ where: { id } })
    
   
    if (!order) {
      return NextResponse.json({ id, deleted: true, status: 'DELIVERED' }, { status: 200 })
    }

    // 3. تحديث حالة الطلب
    const updatedOrder = await db.order.update({
      where: { id },
      data: {
        status,
        kitchenAccess: kitchenAccess !== undefined ? kitchenAccess : undefined,
      },
    })

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error('Update order status error:', error)
    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 })
  }
}
import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { releasePhoneOrder } from '@/lib/saraya/rate-limit'
import { validateStatusTransition } from '@/lib/saraya/calculate-order'

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

    // Validate status transition
    const transitionCheck = validateStatusTransition(order.status, status)
    if (!transitionCheck.valid) {
      return NextResponse.json({ error: transitionCheck.error }, { status: 400 })
    }

    // تحديث حالة الطلب مع تحديث kitchenStatus/baristaStatus لو لازم
    const updateData: Record<string, any> = {
      status,
    }

    // Check which preparation areas this order has (only update status for relevant departments)
    const orderItems = await db.orderItem.findMany({
      where: { orderId: id },
      select: { preparationArea: true },
    })
    const hasKitchenItem = orderItems.some(i => i.preparationArea === 'KITCHEN')
    const hasBaristaItem = orderItems.some(i => i.preparationArea === 'BARISTA')

    // فقط لو الطلب عنده items في المطبخ أو الباريستا، نحدث statuses
    if (status === 'CONFIRMED') {
      if (hasKitchenItem) {
        updateData.kitchenStatus = 'CONFIRMED'
        updateData.kitchenReceivedAt = new Date()
      }
      if (hasBaristaItem) {
        updateData.baristaStatus = 'CONFIRMED'
        updateData.baristaReceivedAt = new Date()
      }
      // HALL-only items: no kitchen/barista status update needed
    }

    if (status === 'PREPARING') {
      if (hasKitchenItem) updateData.kitchenStatus = 'PREPARING'
      if (hasBaristaItem) updateData.baristaStatus = 'PREPARING'
    }

    if (status === 'READY') {
      if (hasKitchenItem) updateData.kitchenStatus = 'READY'
      if (hasBaristaItem) updateData.baristaStatus = 'READY'
    }

    if (status === 'DELIVERED' || status === 'CANCELLED') {
      if (hasKitchenItem) updateData.kitchenStatus = status
      if (hasBaristaItem) updateData.baristaStatus = status
      if (order.customerPhone) {
        releasePhoneOrder(order.customerPhone)
      }
    }

    // Sync kitchenAccess based on actual items (Bug 3.3 fix)
    updateData.kitchenAccess = hasKitchenItem

    // Atomic delivery: update order + award points in a single transaction
    const updatedOrder = await db.$transaction(async (tx) => {
      const txOrder = await tx.order.findUnique({ where: { id } })
      if (!txOrder) throw new Error('Order not found')

      const isBeingDelivered = status === 'DELIVERED' && txOrder.status !== 'DELIVERED'

      const updated = await tx.order.update({
        where: { id },
        data: updateData,
      })

      if (isBeingDelivered && txOrder.webUserId && txOrder.total) {
        await tx.webUser.update({
          where: { id: txOrder.webUserId },
          data: { totalSpent: { increment: txOrder.total } },
        })
        const settings = await tx.storeSettings.findUnique({ where: { id: 'default' } })
        if (settings?.loyaltyEnabled && (settings.loyaltyThreshold ?? 0) > 0) {
          const pointsEarned = Math.floor(txOrder.total / settings.loyaltyThreshold!)
          if (pointsEarned > 0) {
            await tx.webUser.update({
              where: { id: txOrder.webUserId },
              data: { pointsBalance: { increment: pointsEarned } },
            })
          }
        }
      }

      return updated
    })

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error('Update order status error:', error)
    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 })
  }
}
import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { releasePhoneOrder } from '@/lib/saraya/rate-limit'
import { recalculateFromItems, validateDiscount, validateStatusTransition, validatePreparationStatus } from '@/lib/saraya/calculate-order'
import { requireRole } from '@/lib/auth'

// GET /api/orders/[id] - Get a single order with its items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireRole(request, ['ADMIN', 'CASHIER', 'WAITER', 'KITCHEN', 'BARISTA'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
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
  if (!requireRole(request, ['ADMIN', 'CASHIER', 'WAITER', 'KITCHEN', 'BARISTA'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.order.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Prevent cancelling already DELIVERED orders
    if (body.status === 'CANCELLED' && existing.status === 'DELIVERED') {
      return NextResponse.json(
        { error: 'لا يمكن إلغاء طلب تم تسليمه بالفعل' },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (body.status !== undefined) {
      // Validate status transition
      const transitionCheck = validateStatusTransition(existing.status, body.status)
      if (!transitionCheck.valid) {
        return NextResponse.json({ error: transitionCheck.error }, { status: 400 })
      }
      updateData.status = body.status
      // Barista timer: starts when order becomes CONFIRMED and has barista items
      if (body.status === 'CONFIRMED' && existing.status !== 'CONFIRMED') {
        const orderItems = await db.orderItem.findMany({
          where: { orderId: id },
          select: { preparationArea: true },
        })
        const hasBaristaItem = orderItems.some(i => i.preparationArea === 'BARISTA')
        if (hasBaristaItem && !existing.baristaReceivedAt) {
          updateData.baristaReceivedAt = new Date()
        }
      }
    }
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.customerName !== undefined) updateData.customerName = body.customerName
    if (body.customerPhone !== undefined) updateData.customerPhone = body.customerPhone
    if (body.deliveryAddress !== undefined) updateData.deliveryAddress = body.deliveryAddress
    if (body.tableNumber !== undefined) updateData.tableNumber = body.tableNumber
    if (body.pickupTime !== undefined) updateData.pickupTime = body.pickupTime
    if (body.shiftId !== undefined) updateData.shiftId = body.shiftId
    if (body.kitchenStatus !== undefined) {
      // Validate kitchen status transition
      const kitchenCheck = validatePreparationStatus(existing.kitchenStatus, body.kitchenStatus, 'المطبخ')
      if (!kitchenCheck.valid) {
        return NextResponse.json({ error: kitchenCheck.error }, { status: 400 })
      }
      updateData.kitchenStatus = body.kitchenStatus
      if (body.kitchenStatus === 'PREPARING') {
        await db.orderItem.updateMany({
          where: { orderId: id, preparationArea: 'KITCHEN', addedQuantity: { gt: 0 } },
          data: { addedQuantity: 0 },
        })
      }
    }
    if (body.baristaStatus !== undefined) {
      // Validate barista status transition
      const baristaCheck = validatePreparationStatus(existing.baristaStatus, body.baristaStatus, 'الباريستا')
      if (!baristaCheck.valid) {
        return NextResponse.json({ error: baristaCheck.error }, { status: 400 })
      }
      updateData.baristaStatus = body.baristaStatus
      if (body.baristaStatus === 'PREPARING') {
        await db.orderItem.updateMany({
          where: { orderId: id, preparationArea: 'BARISTA', addedQuantity: { gt: 0 } },
          data: { addedQuantity: 0 },
        })
      }
    }
    if (body.acknowledgeAdditions === 'KITCHEN') {
      await db.orderItem.updateMany({
        where: { orderId: id, preparationArea: 'KITCHEN', addedQuantity: { gt: 0 } },
        data: { addedQuantity: 0 },
      })
    }
    if (body.acknowledgeAdditions === 'BARISTA') {
      await db.orderItem.updateMany({
        where: { orderId: id, preparationArea: 'BARISTA', addedQuantity: { gt: 0 } },
        data: { addedQuantity: 0 },
      })
    }
    if (body.cancelledBy !== undefined) updateData.cancelledBy = body.cancelledBy
    // kitchenAccess: only set true if order actually has kitchen items (skip for HALL-only)
    if (body.kitchenAccess !== undefined) {
      if (body.kitchenAccess === true) {
        const orderItems = await db.orderItem.findMany({
          where: { orderId: id },
          select: { preparationArea: true },
        })
        const hasKitchenItem = orderItems.some(i => i.preparationArea === 'KITCHEN')
        updateData.kitchenAccess = hasKitchenItem
        if (!existing.kitchenAccess && hasKitchenItem) {
          updateData.kitchenReceivedAt = new Date()
        }
      } else {
        updateData.kitchenAccess = body.kitchenAccess
      }
    }
    if (body.baristaAccess !== undefined) {
      if (body.baristaAccess === true) {
        const orderItems = await db.orderItem.findMany({
          where: { orderId: id },
          select: { preparationArea: true },
        })
        const hasBaristaItem = orderItems.some(i => i.preparationArea === 'BARISTA')
        updateData.baristaAccess = hasBaristaItem
        if (!existing.baristaAccess && hasBaristaItem) {
          updateData.baristaReceivedAt = new Date()
        }
      } else {
        updateData.baristaAccess = body.baristaAccess
      }
    }

    if (Array.isArray(body.itemsToAdd) && body.itemsToAdd.length > 0) {
      // Validate quantities for items being added
      for (const item of body.itemsToAdd) {
        const qty = parseInt(String(item.quantity), 10)
        if (isNaN(qty) || qty < 1) {
          return NextResponse.json(
            { error: `الكمية غير صالحة: ${item.quantity}. يجب أن تكون رقم موجب.` },
            { status: 400 }
          )
        }
      }

      // Fetch actual meal prices from DB for items being added
      const addMealIds = Array.from(new Set(body.itemsToAdd.map((i: any) => i.mealId).filter(Boolean)))
      const mealsForAdd = await db.meal.findMany({
        where: { id: { in: addMealIds }, isActive: true },
        select: {
          id: true,
          title: true,
          titleAr: true,
          price: true,
          preparationArea: true,
          imageUrl: true,
          category: true,
          categoryAr: true,
          addons: {
            where: { isActive: true },
            select: { id: true, title: true, titleAr: true, price: true },
          },
        },
      })
      const mealMapForAdd = new Map(mealsForAdd.map(m => [m.id, m]))

      const itemsToAdd = body.itemsToAdd.map((item: any) => {
        const meal = mealMapForAdd.get(item.mealId)
        // Use DB price if available, otherwise fallback (should not happen due to earlier validation)
        const basePrice = meal ? meal.price : (parseFloat(String(item.price)) || 0)

        // Validate and resolve addOns from DB
        let addOnArray: { id?: string; title?: string; titleAr?: string; price?: number }[] = []
        try {
          const raw = typeof item.addOns === 'string' ? JSON.parse(item.addOns) : item.addOns
          if (Array.isArray(raw)) addOnArray = raw
        } catch { /* empty */ }

        const dbAddOnMap = meal ? new Map(meal.addons.map(a => [a.id, a])) : new Map()
        const validatedAddOns = addOnArray
          .filter(a => a.id && dbAddOnMap.has(a.id))
          .map(a => {
            const dbAddOn = dbAddOnMap.get(a.id)!
            return { id: dbAddOn.id, title: dbAddOn.title, titleAr: dbAddOn.titleAr, price: dbAddOn.price }
          })

        return {
          orderId: id,
          mealId: item.mealId,
          mealTitle: meal ? meal.title : (item.mealTitle || ''),
          mealTitleAr: meal ? meal.titleAr : (item.mealTitleAr || ''),
          price: basePrice,
          quantity: parseInt(String(item.quantity)) || 1,
          addOns: JSON.stringify(validatedAddOns),
          category: meal ? (meal.categoryAr || meal.category) : (item.category || ''),
          preparationArea: meal ? meal.preparationArea : (item.preparationArea || 'KITCHEN'),
          imageUrl: meal ? meal.imageUrl : (item.imageUrl || ''),
          notes: item.notes || '',
          addedQuantity: item.quantity,
        }
      })

      const existingItems = await db.orderItem.findMany({ where: { orderId: id } })
      const createOrUpdatePromises = itemsToAdd.map(async (item) => {
        const existingItem = existingItems.find((existingItem) => {
          // Compare addOns by parsing JSON (key order-independent)
          let itemAddOns: any[], existingAddOns: any[]
          try { itemAddOns = typeof item.addOns === 'string' ? JSON.parse(item.addOns) : item.addOns || [] } catch { itemAddOns = [] }
          try { existingAddOns = typeof existingItem.addOns === 'string' ? JSON.parse(existingItem.addOns) : existingItem.addOns || [] } catch { existingAddOns = [] }
          return existingItem.mealId === item.mealId &&
            existingItem.category === item.category &&
            JSON.stringify(itemAddOns) === JSON.stringify(existingAddOns)
        })

        if (existingItem) {
          return db.orderItem.update({
            where: { id: existingItem.id },
            data: {
              quantity: existingItem.quantity + item.quantity,
              addedQuantity: (existingItem.addedQuantity ?? 0) + item.quantity,
            },
          })
        }

        return db.orderItem.create({ data: item })
      })

      await Promise.all(createOrUpdatePromises)
      // NOTE: subtotal/serviceCharge/total will be recalculated below in the itemsWereModified block

      // Reset kitchen/barista status if items are added to a READY/READY_TO_PAY order
      if (existing.status === 'READY' || existing.status === 'READY_TO_PAY') {
        const hasKitchenItems = itemsToAdd.some(i => i.preparationArea === 'KITCHEN')
        const hasBaristaItems = itemsToAdd.some(i => i.preparationArea === 'BARISTA')
        // Only reset status for departments that actually have new items
        if (hasKitchenItems) {
          updateData.kitchenStatus = 'PENDING'
          updateData.kitchenAccess = true
          updateData.kitchenReceivedAt = new Date() // new timer for the additions
        }
        if (hasBaristaItems) {
          updateData.baristaStatus = 'PENDING'
          updateData.baristaReceivedAt = new Date() // new timer for the additions
        }
        if (hasKitchenItems || hasBaristaItems) {
          updateData.status = 'PREPARING'
        }
        // HALL-only items: no status/access changes at all
      }
    }

    if (Array.isArray(body.removedItemIds) && body.removedItemIds.length > 0) {
      await db.orderItem.deleteMany({
        where: { id: { in: body.removedItemIds }, orderId: id },
      })
    }

    if (Array.isArray(body.itemUpdates) && body.itemUpdates.length > 0) {
      await Promise.all(
        body.itemUpdates.map(async (item: any) => {
          if (!item.id) return null
          const quantity = parseInt(String(item.quantity)) || 0
          if (quantity <= 0) {
            await db.orderItem.delete({ where: { id: item.id } })
            return null
          }

          return db.orderItem.update({
            where: { id: item.id },
            data: {
              mealId: item.mealId,
              mealTitle: item.mealTitle,
              mealTitleAr: item.mealTitleAr || '',
              price: parseFloat(String(item.price)) || 0,
              quantity,
              addOns: typeof item.addOns === 'string' ? item.addOns : JSON.stringify(item.addOns || []),
              category: item.category || '',
              imageUrl: item.imageUrl || '',
            },
          })
        })
      )
    }

    // Only recalculate totals if items were modified in this request
    const itemsWereModified =
      (Array.isArray(body.itemsToAdd) && body.itemsToAdd.length > 0) ||
      (Array.isArray(body.removedItemIds) && body.removedItemIds.length > 0) ||
      (Array.isArray(body.itemUpdates) && body.itemUpdates.length > 0)

    if (itemsWereModified) {
      const finalItems = await db.orderItem.findMany({ where: { orderId: id } })

      // Use the shared recalculation utility — correctly handles:
      // 1. Base meal price + addOn prices (no double-counting)
      // 2. Service charge based on order type
      // 3. Delivery fee preservation
      // 4. Existing discount amount
      const recalcResult = recalculateFromItems(
        finalItems,
        existing.type,
        existing.discountAmount || 0,
        existing.deliveryFee || 0,
      )

      updateData.subtotal = recalcResult.subtotal
      updateData.serviceCharge = recalcResult.serviceCharge
      updateData.deliveryFee = recalcResult.deliveryFee
      updateData.total = recalcResult.total
    }
    // If no items changed, preserve existing subtotal/serviceCharge/total (don't overwrite)

    // ── Discount ────────────────────────────────────────────────────────
    if (body.discountType !== undefined) {
      // Prevent discount changes on DELIVERED or CANCELLED orders
      if (existing.status === 'DELIVERED' || existing.status === 'CANCELLED') {
        return NextResponse.json(
          { error: 'لا يمكن تعديل الخصم على طلب تم تسليمه أو إلغائه' },
          { status: 400 }
        )
      }

      // Validate discount values
      const discountValidation = validateDiscount(body.discountType, body.discountValue ?? 0)
      if (!discountValidation.valid) {
        return NextResponse.json({ error: discountValidation.error }, { status: 400 })
      }

      // baseTotal = subtotal + serviceCharge + deliveryFee (all components)
      const baseSubtotal = (updateData.subtotal as number) ?? existing.subtotal
      const baseServiceCharge = (updateData.serviceCharge as number) ?? existing.serviceCharge
      const baseDeliveryFee = (updateData.deliveryFee as number) ?? existing.deliveryFee
      const baseTotal = baseSubtotal + baseServiceCharge + baseDeliveryFee
      let discountAmount = 0
      if (body.discountType === 'FIXED') {
        // Clamp: discount cannot exceed baseTotal and cannot be negative
        discountAmount = Math.max(0, Math.min(body.discountValue ?? 0, baseTotal))
      } else if (body.discountType === 'PERCENTAGE') {
        // Clamp: percentage is already validated to be 0-100
        discountAmount = Math.max(0, Math.min(baseTotal * (body.discountValue ?? 0) / 100, baseTotal))
      }
      updateData.discountAmount = discountAmount
      updateData.discountType = body.discountType
      updateData.discountValue = body.discountValue ?? 0
      updateData.discountReason = body.discountReason ?? ''
      updateData.discountAppliedBy = body.discountAppliedBy ?? ''
      updateData.total = Math.max(0, baseTotal - discountAmount)
    }

    // Release phone rate limit when order is delivered or cancelled
    if (body.status === 'DELIVERED' || body.status === 'CANCELLED') {
      updateData.kitchenStatus = body.status
      updateData.baristaStatus = body.status
      if (existing.customerPhone) {
        releasePhoneOrder(existing.customerPhone)
      }
      // Auto-regenerate table secret code when order is paid/completed
      if (body.status === 'DELIVERED' && existing.tableNumber) {
        try {
          const table = await db.restaurantTable.findFirst({
            where: { number: parseInt(existing.tableNumber) },
            select: { id: true },
          })
          if (table) {
            const newCode = Math.random().toString(36).substring(2, 8).toUpperCase()
            await db.restaurantTable.update({
              where: { id: table.id },
              data: { secretCode: newCode },
            })
          }
        } catch (e) {
          console.error('Failed to regenerate table code:', e)
        }
      }
    }

    // Atomic delivery: update order and award points in a single transaction
    // to prevent race conditions where two concurrent requests both award points
    const order = await db.$transaction(async (tx) => {
      // Re-read order inside transaction to detect concurrent modifications
      const txOrder = await tx.order.findUnique({ where: { id } })
      if (!txOrder) throw new Error('Order not found')

      const wasDelivered = txOrder.status === 'DELIVERED'
      const isBeingDelivered = body.status === 'DELIVERED' && !wasDelivered

      // Update the order
      const updated = await tx.order.update({
        where: { id },
        data: updateData,
        include: { items: true },
      })

      // Award points only if this is the first time being delivered
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

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}

// DELETE /api/orders/[id] - Cancel an order (set status to CANCELLED)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireRole(request, ['ADMIN', 'CASHIER', 'WAITER', 'KITCHEN', 'BARISTA'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const { id } = await params
    // FIX: DELETE requests may have no body — use .catch to avoid parse errors
    const payload = await request.json().catch(() => ({}))

    const existing = await db.order.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (existing.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Order is already cancelled' }, { status: 400 })
    }

    // لا يمكن إلغاء طلب تم تسليمه
    if (existing.status === 'DELIVERED') {
      return NextResponse.json({ error: 'لا يمكن إلغاء طلب تم تسليمه بالفعل' }, { status: 400 })
    }

    if (existing.customerPhone) {
      releasePhoneOrder(existing.customerPhone)
    }

    const order = await db.order.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledBy: (payload?.cancelledBy as string) || 'admin',
      },
      include: { items: true },
    })

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error cancelling order:', error)
    return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 })
  }
}

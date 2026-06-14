import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { checkPhoneRateLimit, checkMinOrderValue, getMinOrderValue } from '@/lib/saraya/rate-limit'
import { calculateOrderTotals, validateDiscount } from '@/lib/saraya/calculate-order'
import { SERVICE_CHARGE_RATE, DELIVERY_FEE } from '@/lib/saraya/constants'
import { requireRole, getStaffRole } from '@/lib/auth'

// GET /api/orders - List all orders with items
// Query params: ?status=PENDING, ?type=DINE_IN, ?page=1&limit=50 (اختياري)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerPhone = searchParams.get('customerPhone')
    // Customer order tracking by phone — skip staff auth
    if (!customerPhone && !requireRole(request, ['ADMIN', 'CASHIER', 'WAITER', 'KITCHEN', 'BARISTA'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const kitchenAccess = searchParams.get('kitchenAccess')
    const shiftId = searchParams.get('shiftId')
    const customerName = searchParams.get('customerName')
    const orderNumber = searchParams.get('orderNumber')
    const page = searchParams.get('page')
    const limit = searchParams.get('limit')

    const where: any = {}
    if (status) where.status = status
    if (type) where.type = type
    if (shiftId) where.shiftId = shiftId
    if (kitchenAccess !== null) where.kitchenAccess = kitchenAccess === 'true'
    if (customerPhone) where.customerPhone = customerPhone
    if (customerName) where.customerName = { contains: customerName }
    if (orderNumber) {
      const parsed = parseInt(orderNumber)
      if (!isNaN(parsed) && parsed > 0) where.orderNumber = parsed
    }

    // Pagination: إذا لم يتم تحديد page/limit نرجع كل النتائج (للتوافق مع القديم)
    if (page && limit) {
      const pageNum = Math.max(1, parseInt(page) || 1)
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50))
      const skip = (pageNum - 1) * limitNum

      const [orders, total] = await Promise.all([
        db.order.findMany({
          where,
          include: { items: { select: { id: true, mealId: true, mealTitle: true, mealTitleAr: true, quantity: true, price: true, preparationArea: true, imageUrl: true, addOns: true, category: true, addedQuantity: true, notes: true, createdAt: true, updatedAt: true } } },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
        db.order.count({ where }),
      ])

      return NextResponse.json({
        data: orders,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      })
    }

    // بدون pagination (سلوك قديم)
    const orders = await db.order.findMany({
      where,
      include: { items: { select: { id: true, mealId: true, mealTitle: true, mealTitleAr: true, quantity: true, price: true, preparationArea: true, imageUrl: true, addOns: true, category: true, addedQuantity: true, notes: true, createdAt: true, updatedAt: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

// POST /api/orders - Create a new order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      type,
      customerName,
      customerPhone,
      customerEmail,
      deliveryAddress,
      tableNumber,
      tableCode,
      pickupTime,
      notes,
      items,
      subtotal,
      serviceCharge,
      deliveryFee,
      total,
      shiftId,
      redeemPoints,
    } = body

    // ─── Validation ──────────────────────────────────────────
    if (!type || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Order type and items are required' },
        { status: 400 }
      )
    }

    // 0a) Check store settings (taking orders toggle)
    const storeSettings = await db.storeSettings.findUnique({ where: { id: 'default' } })
    if (storeSettings && !storeSettings.takingOrders) {
      return NextResponse.json(
        { error: storeSettings.message || 'المطعم مغلق حالياً، لا يمكن استقبال الطلبات' },
        { status: 503 }
      )
    }

    // 0b) Check if there's an open shift
    const openShift = await db.shift.findFirst({
      where: { status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
    })
    if (!openShift) {
      return NextResponse.json(
        { error: 'المطعم مغلق حالياً. لا يمكن استقبال الطلبات بدون شيفت مفتوح.' },
        { status: 400 }
      )
    }

    // 1) Validate quantities first (before any DB lookups)
    for (const item of items) {
      const qty = parseInt(String(item.quantity), 10)
      if (isNaN(qty) || qty < 1) {
        return NextResponse.json(
          { error: `الكمية غير صالحة: ${item.quantity}. يجب أن تكون رقم موجب.` },
          { status: 400 }
        )
      }
    }

    // 1a) Calculate prices SERVER-SIDE from database
    let calculatedTotals
    try {
      calculatedTotals = await calculateOrderTotals(items, type)
    } catch (calcErr: any) {
      return NextResponse.json(
        { error: calcErr.message || 'خطأ في حساب الأسعار' },
        { status: 400 }
      )
    }

    // 1b) Minimum order value (check pre-discount total)
    const orderTotal = calculatedTotals.subtotal + calculatedTotals.serviceCharge + calculatedTotals.deliveryFee
    const minCheck = checkMinOrderValue(orderTotal)
    if (!minCheck.allowed) {
      return NextResponse.json(
        { error: `الحد الأدنى للطلب ${getMinOrderValue()} جنيه` },
        { status: 400 }
      )
    }

    // isStaff flag — staff (waiter/cashier) skip tableCode + IP rate limit
    const staffRole = getStaffRole(request)
    const isStaff = body.isStaff === true && !!staffRole && ['ADMIN', 'CASHIER', 'WAITER'].includes(staffRole)

    // 1c) Verify all meals or promotions exist and are active
    // (calculateOrderTotals already validated meals, but we still need to check promotions)
    const promoIds = Array.from(new Set(items.map((i: any) => i.mealId).filter(Boolean))) as string[]
    const existingPromos = await db.promotion.findMany({
      where: { id: { in: promoIds }, isActive: true },
      select: { id: true }
    })
    // If any of the item IDs are promotions, those won't be in the meals map
    // For now, check that all items were resolved by calculateOrderTotals
    const resolvedMealIds = new Set(calculatedTotals.resolvedItems.map(i => i.mealId))
    const unresolvedIds = promoIds.filter(id => !resolvedMealIds.has(id) && !existingPromos.some(p => p.id === id))
    if (unresolvedIds.length > 0) {
      return NextResponse.json(
        { error: 'بعض الأطباق أو العروض في سلتك لم تعد موجودة أو تم إيقافها، يرجى تحديث الصفحة' },
        { status: 400 }
      )
    }

    // 2) Phone Rate Limiting moved below validations to avoid consuming slot on invalid requests

    // 3) DINE_IN: Validate table code (required for customer QR, optional for staff)
    if (type === 'DINE_IN' && tableNumber) {
      if (tableCode) {
        const table = await db.restaurantTable.findFirst({
          where: {
            number: parseInt(String(tableNumber)),
            secretCode: String(tableCode).toUpperCase(),
            isActive: true,
          },
        })
        if (!table) {
          return NextResponse.json(
            { error: 'كود الطاولة غير صحيح. يرجى مسح QR code الموجود على الطاولة.' },
            { status: 403 }
          )
        }
      } else if (!isStaff) {
        return NextResponse.json(
          { error: 'كود الطاولة مطلوب للطلب في الصالة' },
          { status: 400 }
        )
      }
    }

    // 4) TAKEAWAY: Require phone
    if (type === 'TAKEAWAY' && !customerPhone) {
      return NextResponse.json(
        { error: 'رقم الهاتف مطلوب لطلبات التيك أواي' },
        { status: 400 }
      )
    }

    // 5b) TAKEAWAY/DELIVERY: Require registered web user email
    if (type !== 'DINE_IN') {
      if (!customerEmail) {
        return NextResponse.json(
          { error: 'البريد الإلكتروني مطلوب لطلبات التيك أواي والديليفري' },
          { status: 400 }
        )
      }
      const webUser = await db.webUser.findUnique({ where: { email: customerEmail } })
      if (!webUser) {
        return NextResponse.json(
          { error: 'البريد الإلكتروني غير مسجل. الرجاء إنشاء حساب أولاً.' },
          { status: 400 }
        )
      }
      if (webUser.isBlocked) {
        return NextResponse.json(
          { error: 'هذا الحساب محظور. لا يمكنك الطلب.' },
          { status: 403 }
        )
      }
    }

    // 5) DELIVERY: Require phone + address
    if (type === 'DELIVERY') {
      if (!customerPhone) {
        return NextResponse.json(
          { error: 'رقم الهاتف مطلوب لطلبات الديليفري' },
          { status: 400 }
        )
      }
      if (!deliveryAddress || deliveryAddress.trim().length < 5) {
        return NextResponse.json(
          { error: 'العنوان مطلوب لطلبات الديليفري' },
          { status: 400 }
        )
      }
    }

    // 3) Phone Rate Limiting (for takeaway & delivery) — placed after all validations
    // FIX: was before table code validation, which consumed a rate-limit slot even when order failed
    if (customerPhone && type !== 'DINE_IN') {
      const activeOrdersForPhone = await db.order.count({
        where: {
          customerPhone,
          status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'READY_TO_PAY'] },
        },
      })
      if (activeOrdersForPhone >= 3) {
        return NextResponse.json(
          { error: 'لديك طلبات نشطة كثيرة بالفعل. يرجى الانتظار حتى يتم معالجتها.' },
          { status: 429 }
        )
      }

      const phoneCheck = checkPhoneRateLimit(customerPhone)
      if (!phoneCheck.allowed) {
        return NextResponse.json(
          { error: phoneCheck.reason || 'يرجى الانتظار قبل تقديم طلب جديد' },
          { status: 429 }
        )
      }
    }

    // ─── Existing DINE_IN order merge logic ──────────────
    // Only merge into orders that are still being prepared (not READY/READY_TO_PAY)
    // This prevents merging items into an order that a different party may have opened
    if (type === 'DINE_IN' && tableNumber) {
      const existingOrder = await db.order.findFirst({
        where: {
          tableNumber: String(tableNumber),
          status: { in: ['PENDING', 'CONFIRMED', 'PREPARING'] },
        },
        orderBy: { createdAt: 'desc' },
        include: { items: { select: { id: true, mealId: true, mealTitle: true, mealTitleAr: true, quantity: true, price: true, preparationArea: true, imageUrl: true, addOns: true, category: true, addedQuantity: true, createdAt: true, updatedAt: true } } },
      })

      if (existingOrder) {
        // Normalize addOns JSON string to ensure consistent comparison
        function normalizeAddOns(addOns: string): string {
          try {
            const parsed = JSON.parse(addOns)
            const sorted = JSON.stringify(parsed, (_, val) =>
              Array.isArray(val)
                ? val.map((v: unknown) => typeof v === 'object' && v !== null
                    ? Object.keys(v).sort().reduce((acc: Record<string, unknown>, k: string) => { acc[k] = (v as Record<string, unknown>)[k]; return acc }, {})
                    : v)
                : val
            )
            return sorted
          } catch {
            return addOns
          }
        }

        type IncomingItem = {
          mealId: string
          mealTitle: string
          mealTitleAr: string
          price: number
          quantity: number
          addOns: string
          category: string
          preparationArea: string
          imageUrl: string
        }

        const existingItems = existingOrder.items as unknown as Array<{
          id: string
          mealId: string
          category: string
          addOns: string
          quantity: number
        }>

        const itemUpdates: Array<Promise<unknown>> = []
        const createData: Array<{
          orderId: string
          mealId: string
          mealTitle: string
          mealTitleAr: string
          price: number
          quantity: number
          addOns: string
          preparationArea: string
          category: string
          imageUrl: string
          lastAddedQuantity: number
          addedQuantity: number
        }> = []

        const normalizedIncomingItems: IncomingItem[] = calculatedTotals.resolvedItems.map((item) => ({
          mealId: item.mealId,
          mealTitle: item.mealTitle,
          mealTitleAr: item.mealTitleAr,
          price: item.price,
          quantity: item.quantity,
          addOns: item.addOns,
          preparationArea: item.preparationArea,
          category: item.category,
          imageUrl: item.imageUrl,
        }))

        const mergedIncomingItems: IncomingItem[] = Object.values(
          normalizedIncomingItems.reduce((acc, item) => {
            const key = `${item.mealId}|${item.category}|${item.addOns}`
            if (!acc[key]) acc[key] = { ...item }
            else acc[key].quantity += item.quantity
            return acc
          }, {} as Record<string, IncomingItem>)
        )

        mergedIncomingItems.forEach((item) => {
          const existingItem = existingItems.find((ei) =>
            ei.mealId === item.mealId &&
            ei.category === item.category &&
            normalizeAddOns(ei.addOns) === item.addOns
          )

          if (existingItem) {
            itemUpdates.push(db.orderItem.update({
              where: { id: existingItem.id },
              data: {
                quantity: existingItem.quantity + item.quantity,
                addedQuantity: item.quantity,
              },
            }))
          } else {
            createData.push({
              orderId: existingOrder.id,
              mealId: item.mealId,
              mealTitle: item.mealTitle,
              mealTitleAr: item.mealTitleAr,
              price: item.price,
              quantity: item.quantity,
              addOns: item.addOns,
              category: item.category,
              preparationArea: item.preparationArea,
              imageUrl: item.imageUrl,
              lastAddedQuantity: 0,
              addedQuantity: item.quantity,
            })
          }
        })

        await Promise.all(itemUpdates)
        if (createData.length > 0) {
          await db.orderItem.createMany({ data: createData })
        }

        const hasNewKitchenItems = normalizedIncomingItems.some(i => i.preparationArea === 'KITCHEN')
        const hasNewBaristaItems = normalizedIncomingItems.some(i => i.preparationArea === 'BARISTA')
        const needsNewPreparation = hasNewKitchenItems || hasNewBaristaItems

        // Use SERVER-CALCULATED prices instead of trusting client-sent values
        const safeSubtotal = calculatedTotals.subtotal
        const safeServiceCharge = calculatedTotals.serviceCharge
        const safeDeliveryFee = calculatedTotals.deliveryFee

        const updatedOrder = await db.order.update({
          where: { id: existingOrder.id },
          data: {
            subtotal: existingOrder.subtotal + safeSubtotal,
            serviceCharge: existingOrder.serviceCharge + safeServiceCharge,
            deliveryFee: (existingOrder.deliveryFee || 0) + safeDeliveryFee,
            total: existingOrder.total + safeSubtotal + safeServiceCharge + safeDeliveryFee,
            notes: notes ? (existingOrder.notes ? `${existingOrder.notes} | ${notes}` : notes) : existingOrder.notes,
            status: existingOrder.status,
            kitchenAccess: existingOrder.kitchenAccess || (hasNewKitchenItems && existingOrder.status !== 'PENDING'),
            kitchenStatus: hasNewKitchenItems ? 'PENDING' : existingOrder.kitchenStatus,
            baristaStatus: hasNewBaristaItems ? 'PENDING' : existingOrder.baristaStatus,
            kitchenReceivedAt: hasNewKitchenItems ? null : existingOrder.kitchenReceivedAt,
            baristaReceivedAt: hasNewBaristaItems ? null : existingOrder.baristaReceivedAt,
          },
          include: { items: { select: { id: true, mealId: true, mealTitle: true, mealTitleAr: true, quantity: true, price: true, preparationArea: true, imageUrl: true, addOns: true, category: true, addedQuantity: true, createdAt: true, updatedAt: true } } },
        })

        return NextResponse.json(updatedOrder, { status: 200 })
      }
    }

    // ─── Create New Order ─────────────────────────────────
    // Order number resets to 1 per shift (since orders are deleted on shift close).
    // Retry loop handles the race condition where two concurrent requests
    // read the same max orderNumber and both try to insert the same value.
    let order
    let attempts = 0
    const effectiveShiftId = shiftId || openShift.id

    // FIX: Validate shiftId exists before using it (prevents 500 from FK constraint)
    if (shiftId) {
      const shiftExists = await db.shift.findUnique({ where: { id: shiftId } })
      if (!shiftExists) {
        return NextResponse.json({ error: 'الشيفت المحدد غير موجود' }, { status: 400 })
      }
    }

    // ─── Points Redemption (calculated before retry loop) ──
    let pointsDiscount = 0
    let pointsRedeemed = 0
    let webUserId: string | undefined
    if (customerEmail) {
      const wu = await db.webUser.findUnique({ where: { email: customerEmail }, select: { id: true } })
      if (wu) webUserId = wu.id
    }
    if (redeemPoints && redeemPoints > 0 && webUserId) {
      try {
        const [settings, webUserData] = await Promise.all([
          db.storeSettings.findUnique({ where: { id: 'default' } }),
          db.webUser.findUnique({ where: { id: webUserId }, select: { pointsBalance: true } }),
        ])
        if (settings?.loyaltyEnabled && webUserData) {
          const actualRedeem = Math.min(redeemPoints, webUserData.pointsBalance)
          if (actualRedeem > 0) {
            pointsDiscount = actualRedeem * (settings.loyaltyCashback || 0)
            const baseTotal = calculatedTotals.subtotal + calculatedTotals.serviceCharge + calculatedTotals.deliveryFee
            pointsDiscount = Math.min(pointsDiscount, baseTotal)
            pointsRedeemed = actualRedeem
          }
        }
      } catch (e) {
        console.error('Points redemption error:', e)
      }
    }

    while (attempts < 5) {
      attempts++
      const maxOrder = await db.order.findFirst({
        where: { shiftId: effectiveShiftId },
        orderBy: { orderNumber: 'desc' },
        select: { orderNumber: true },
      })
      const orderNumber = maxOrder ? maxOrder.orderNumber + 1 : 1

      // Staff orders (waiter/cashier) go directly to CONFIRMED — no manual confirmation needed
      const initialStatus = isStaff ? 'CONFIRMED' : 'PENDING'

      // ─── Use SERVER-CALCULATED prices ──────────────────
      // Total includes points discount deducted
      const finalTotal = Math.max(0, calculatedTotals.subtotal + calculatedTotals.serviceCharge + calculatedTotals.deliveryFee - pointsDiscount)

      const orderData: any = {
        orderNumber,
        type,
        customerName: customerName || '',
        customerPhone: customerPhone || '',
        customerEmail: customerEmail || '',
        webUserId: webUserId || null,
        deliveryAddress: deliveryAddress || '',
        tableNumber: tableNumber || '',
        pickupTime: pickupTime || '',
        notes: notes || '',
        subtotal: calculatedTotals.subtotal,
        serviceCharge: calculatedTotals.serviceCharge,
        deliveryFee: calculatedTotals.deliveryFee,
        total: Math.round(finalTotal * 100) / 100,
        discountAmount: pointsDiscount,
        discountType: pointsRedeemed > 0 ? 'POINTS' : '',
        discountValue: pointsRedeemed,
        discountReason: pointsRedeemed > 0 ? `خصم نقاط الولاء (${pointsRedeemed} نقطة)` : '',
        status: initialStatus,
        kitchenStatus: 'PENDING',
        baristaStatus: 'PENDING',
        kitchenAccess: isStaff && calculatedTotals.resolvedItems.some((i: any) => i.preparationArea !== 'HALL'),
        kitchenReceivedAt: isStaff && calculatedTotals.resolvedItems.some((i: any) => i.preparationArea === 'KITCHEN') ? new Date() : undefined,
        baristaReceivedAt: isStaff && calculatedTotals.resolvedItems.some((i: any) => i.preparationArea === 'BARISTA') ? new Date() : undefined,
        shiftId: shiftId || openShift.id,
        items: {
          create: calculatedTotals.resolvedItems.map(
            (item) => ({
              mealId: item.mealId,
              mealTitle: item.mealTitle,
              mealTitleAr: item.mealTitleAr,
              price: item.price,
              quantity: item.quantity,
              addOns: item.addOns,
              category: item.category,
              notes: item.notes || '',
              preparationArea: item.preparationArea,
              imageUrl: item.imageUrl,
            })
          ),
        },
      }

      try {
        order = await db.order.create({
          data: orderData,
          include: { items: { select: { id: true, mealId: true, mealTitle: true, mealTitleAr: true, quantity: true, price: true, preparationArea: true, imageUrl: true, addOns: true, category: true, addedQuantity: true, createdAt: true, updatedAt: true } } },
        })
        break // success
      } catch (createErr: any) {
        // P2002 = unique constraint violation (duplicate orderNumber)
        if (createErr?.code === 'P2002' && attempts < 5) continue
        throw createErr
      }
    }

    if (!order) {
      return NextResponse.json({ error: 'Failed to generate unique order number' }, { status: 500 })
    }

    // Deduct points only AFTER successful order creation (prevents points loss on failure)
    if (pointsRedeemed > 0 && webUserId) {
      try {
        // Optimistic locking: only deduct if user still has enough points
        const result = await db.webUser.updateMany({
          where: { id: webUserId, pointsBalance: { gte: pointsRedeemed } },
          data: { pointsBalance: { decrement: pointsRedeemed } },
        })
        if (result.count === 0) {
          console.error(`Race condition: user ${webUserId} no longer has ${pointsRedeemed} points`)
        }
      } catch (e) {
        console.error('Failed to deduct points after order creation:', e)
      }
    }

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}

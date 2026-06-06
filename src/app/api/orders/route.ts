import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { checkIpRateLimit, checkPhoneRateLimit, checkMinOrderValue, getMinOrderValue } from '@/lib/saraya/rate-limit'

// GET /api/orders - List all orders with items
// Query params: ?status=PENDING, ?type=DINE_IN
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const kitchenAccess = searchParams.get('kitchenAccess')
    const shiftId = searchParams.get('shiftId')
    const customerPhone = searchParams.get('customerPhone')

    const where: any = {}
    if (status) where.status = status
    if (type) where.type = type
    if (shiftId) where.shiftId = shiftId
    if (kitchenAccess !== null) where.kitchenAccess = kitchenAccess === 'true'
    if (customerPhone) where.customerPhone = customerPhone

    const orders = await db.order.findMany({
      where,
      include: { items: true },
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
    } = body

    if (!type || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Order type and items are required' },
        { status: 400 }
      )
    }

    const storeSettings = await db.storeSettings.findUnique({ where: { id: 'default' } })
    if (storeSettings && !storeSettings.takingOrders) {
      return NextResponse.json(
        { error: storeSettings.message || 'المطعم مغلق حالياً، لا يمكن استقبال الطلبات' },
        { status: 503 }
      )
    }

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

    // 1) Minimum order value
    const orderTotal = parseFloat(String(total)) || 0
    const minCheck = checkMinOrderValue(orderTotal)
    if (!minCheck.allowed) {
      return NextResponse.json(
        { error: `الحد الأدنى للطلب ${getMinOrderValue()} جنيه` },
        { status: 400 }
      )
    }

    // 1b) Verify all meals or promotions exist
    const itemIds = Array.from(new Set(items.map((i: any) => i.mealId).filter(Boolean))) as string[]
    
    const [existingMeals, existingPromos] = await Promise.all([
      db.meal.findMany({
        where: { id: { in: itemIds } },
        select: { id: true }
      }),
      db.promotion.findMany({
        where: { id: { in: itemIds } },
        select: { id: true }
      })
    ])

    const foundIds = new Set([...existingMeals.map(m => m.id), ...existingPromos.map(p => p.id)])

    if (foundIds.size !== itemIds.length) {
      return NextResponse.json(
        { 
          error: 'بعض الأطباق أو العروض في سلتك لم تعد موجودة، يرجى تحديث الصفحة' 
        },
        { status: 400 }
      )
    }

    // 2) IP Rate Limiting
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'
    const ipCheck = checkIpRateLimit(clientIp)
    if (!ipCheck.allowed) {
      const retryMin = Math.ceil((ipCheck.retryAfterMs || 0) / 60000)
      return NextResponse.json(
        { error: `تم تجاوز الحد المسموح من الطلبات. حاول مرة أخرى بعد ${retryMin} دقيقة` },
        { status: 429 }
      )
    }

    // 3) Phone Rate Limiting moved below validations to avoid consuming slot on invalid requests

    // 4) DINE_IN: Validate table code
    if (type === 'DINE_IN' && tableNumber) {
      if (!tableCode) {
        return NextResponse.json(
          { error: 'كود الطاولة مطلوب للطلب في الصالة' },
          { status: 400 }
        )
      }
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
    }

    // 5) TAKEAWAY: Require phone
    if (type === 'TAKEAWAY' && !customerPhone) {
      return NextResponse.json(
        { error: 'رقم الهاتف مطلوب لطلبات التيك أواي' },
        { status: 400 }
      )
    }

    // 6) DELIVERY: Require phone + address
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
    if (type === 'DINE_IN' && tableNumber) {
      const existingOrder = await db.order.findFirst({
        where: {
          tableNumber: String(tableNumber),
          status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'READY_TO_PAY'] },
        },
        include: { items: true },
      })

      if (existingOrder) {
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
        const promoIds = new Set(existingPromos.map(p => p.id))

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
          isPromotion: boolean
          lastAddedQuantity: number
        }> = []

        const normalizedIncomingItems: IncomingItem[] = items.map((item: any) => ({
          mealId: item.mealId,
          mealTitle: item.mealTitle,
          mealTitleAr: item.mealTitleAr || '',
          price: parseFloat(String(item.price)) || 0,
          quantity: parseInt(String(item.quantity)) || 1,
          addOns: typeof item.addOns === 'string' ? item.addOns : JSON.stringify(item.addOns || []),
          preparationArea: item.preparationArea || 'KITCHEN',
          category: (item.category || '').trim(),
          imageUrl: item.imageUrl || '',
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
            ei.addOns === item.addOns
          )

          if (existingItem) {
            itemUpdates.push(db.orderItem.update({
              where: { id: existingItem.id },
              data: {
                quantity: { increment: item.quantity },
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
              isPromotion: promoIds.has(item.mealId),
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

        const safeSubtotal = parseFloat(String(subtotal)) || 0
        const safeServiceCharge = parseFloat(String(serviceCharge)) || 0
        const safeDeliveryFee = parseFloat(String(deliveryFee)) || 0
        const safeTotal = parseFloat(String(total)) || 0

        const updatedOrder = await db.order.update({
          where: { id: existingOrder.id },
          data: {
            subtotal: { increment: safeSubtotal },
            serviceCharge: { increment: safeServiceCharge },
            deliveryFee: { increment: safeDeliveryFee },
            total: { increment: safeSubtotal + safeServiceCharge + safeDeliveryFee },
            notes: notes ? (existingOrder.notes ? `${existingOrder.notes} | ${notes}` : notes) : existingOrder.notes,
            status: needsNewPreparation && (existingOrder.status === 'READY' || existingOrder.status === 'READY_TO_PAY')
              ? 'PREPARING'
              : existingOrder.status,
            // FIX: preserve kitchenAccess=true if already granted; new items need kitchen to see them
            kitchenAccess: existingOrder.kitchenAccess || (hasNewKitchenItems || hasNewBaristaItems),
            kitchenStatus: hasNewKitchenItems ? 'PENDING' : existingOrder.kitchenStatus,
            baristaStatus: hasNewBaristaItems ? 'PENDING' : existingOrder.baristaStatus,
          },
          include: { items: true },
        })

        return NextResponse.json(updatedOrder, { status: 200 })
      }
    }

    // ─── Create New Order ─────────────────────────────────
    // Retry loop handles the race condition where two concurrent requests
    // read the same max orderNumber and both try to insert the same value.
    let order
    let attempts = 0
    while (attempts < 5) {
      attempts++
      const maxOrder = await db.order.findFirst({
        orderBy: { orderNumber: 'desc' },
        select: { orderNumber: true },
      })
      const orderNumber = maxOrder ? maxOrder.orderNumber + 1 : 1001

      // Determine which items are promotions
      const promoIds = new Set(existingPromos.map(p => p.id))

      const orderData: any = {
        orderNumber,
        type,
        customerName: customerName || '',
        customerPhone: customerPhone || '',
        deliveryAddress: deliveryAddress || '',
        tableNumber: tableNumber || '',
        pickupTime: pickupTime || '',
        notes: notes || '',
        subtotal: parseFloat(subtotal) || 0,
        serviceCharge: parseFloat(serviceCharge) || 0,
        deliveryFee: parseFloat(deliveryFee) || 0,
        total: parseFloat(total) || 0,
        status: 'PENDING',
        kitchenStatus: 'PENDING',
        baristaStatus: 'PENDING',
        kitchenAccess: false, // Staff must confirm before kitchen sees it
        shiftId: openShift.id,
        items: {
          create: items.map(
            (item: {
              mealId: string
              mealTitle: string
              mealTitleAr: string
              price: number
              quantity: number
              addOns: unknown
              category?: string
              preparationArea?: string
              imageUrl?: string
            }) => {
              const isPromo = promoIds.has(item.mealId)
              return {
                mealId: item.mealId,
                mealTitle: item.mealTitle,
                mealTitleAr: item.mealTitleAr || '',
                price: parseFloat(String(item.price)),
                quantity: parseInt(String(item.quantity)),
                addOns: typeof item.addOns === 'string' ? item.addOns : JSON.stringify(item.addOns || []),
                category: item.category || '',
                preparationArea: item.preparationArea || 'KITCHEN',
                imageUrl: item.imageUrl || '',
                isPromotion: isPromo,
              }
            }
          ),
        },
      }

      try {
        order = await db.order.create({
          data: orderData,
          include: { items: true },
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

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}

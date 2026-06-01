import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/orders - List all orders with items
// Query params: ?status=PENDING, ?type=DINE_IN
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    const shiftId = searchParams.get('shiftId')
    const where: Record<string, string> = {}
        if (status) where.status = status
        if (type) where.type = type
        if (shiftId) where.shiftId = shiftId
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
      pickupTime,
      notes,
      items,
      subtotal,
      serviceCharge,
      total,
      shiftId,
    } = body

    if (!type || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Order type and items are required' },
        { status: 400 }
      )
    }

    if (type === 'DINE_IN' && tableNumber) {
  const existingOrder = await db.order.findFirst({
    where: {
      tableNumber: tableNumber,
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
      category: string
      imageUrl: string
      lastAddedQuantity: number
    }> = []

    const normalizedIncomingItems: IncomingItem[] = items.map((item: any) => ({
      mealId: item.mealId,
      mealTitle: item.mealTitle,
      mealTitleAr: item.mealTitleAr || '',
      price: parseFloat(String(item.price)) || 0,
      quantity: parseInt(String(item.quantity)) || 1,
      addOns: typeof item.addOns === 'string' ? item.addOns : JSON.stringify(item.addOns || []),
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
      const existingItem = existingItems.find((existingItem) =>
        existingItem.mealId === item.mealId &&
        existingItem.category === item.category &&
        existingItem.addOns === item.addOns
      )

      if (existingItem) {
        itemUpdates.push(db.orderItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: existingItem.quantity + item.quantity,
            lastAddedQuantity: item.quantity,
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
          imageUrl: item.imageUrl,
          lastAddedQuantity: item.quantity,
        })
      }
    })

    await Promise.all(itemUpdates)
    if (createData.length > 0) {
      await db.orderItem.createMany({ data: createData })
    }

    const updatedOrder = await db.order.update({
      where: { id: existingOrder.id },
      data: {
        subtotal: existingOrder.subtotal + parseFloat(subtotal),
        serviceCharge: existingOrder.serviceCharge + parseFloat(serviceCharge),
        total: existingOrder.total + parseFloat(total),
        notes: notes ? (existingOrder.notes ? `${existingOrder.notes} | ${notes}` : notes) : existingOrder.notes,
        status: existingOrder.status === 'READY' || existingOrder.status === 'READY_TO_PAY' ? 'PREPARING' : existingOrder.status,
      },
      include: { items: true },
    })

    return NextResponse.json(updatedOrder, { status: 200 })
  }
}


    // Get max orderNumber and increment
    const maxOrder = await db.order.findFirst({
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    })
    const orderNumber = maxOrder ? maxOrder.orderNumber + 1 : 1001

    const order = await db.order.create({
      data: {
        orderNumber,
        type,
        shiftId: shiftId || '',
        customerName: customerName || '',
        customerPhone: customerPhone || '',
        deliveryAddress: deliveryAddress || '',
        tableNumber: tableNumber || '',
        pickupTime: pickupTime || '',
        notes: notes || '',
        subtotal: parseFloat(subtotal) || 0,
        serviceCharge: parseFloat(serviceCharge) || 0,
        total: parseFloat(total) || 0,
        status: 'PENDING',
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
              imageUrl?: string
            }) => ({
              mealId: item.mealId,
              mealTitle: item.mealTitle,
              mealTitleAr: item.mealTitleAr || '',
              price: parseFloat(String(item.price)),
              quantity: parseInt(String(item.quantity)),
              addOns: typeof item.addOns === 'string' ? item.addOns : JSON.stringify(item.addOns || []),
              category: item.category || '',
              imageUrl: item.imageUrl || '',
            })
          ),
        },
      },
      include: { items: true },
    })

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}

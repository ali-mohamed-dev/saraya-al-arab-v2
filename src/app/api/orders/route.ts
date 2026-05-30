import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/orders - List all orders with items
// Query params: ?status=PENDING, ?type=DINE_IN
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    const where: Record<string, string> = {}
    if (status) where.status = status
    if (type) where.type = type

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
    } = body

    if (!type || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Order type and items are required' },
        { status: 400 }
      )
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
              addOns: string
              imageUrl?: string
            }) => ({
              mealId: item.mealId,
              mealTitle: item.mealTitle,
              mealTitleAr: item.mealTitleAr || '',
              price: parseFloat(String(item.price)),
              quantity: parseInt(String(item.quantity)),
              addOns: item.addOns || '[]',
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

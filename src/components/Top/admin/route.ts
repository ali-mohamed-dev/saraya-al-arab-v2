import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // 1. جيب IDs الأوردرات القديمة
    const oldOrders = await db.order.findMany({
      where: { createdAt: { lt: thirtyDaysAgo } },
      select: { id: true },
    })

    const oldOrderIds = oldOrders.map(o => o.id)

    if (oldOrderIds.length === 0) {
      return NextResponse.json({
        success: true,
        deletedOrders: 0,
        deletedItems: 0,
        cutoffDate: thirtyDaysAgo.toISOString(),
      })
    }

    // 2. امسح OrderItems الأول (foreign key)
    const deletedItems = await db.orderItem.deleteMany({
      where: { orderId: { in: oldOrderIds } },
    })

    // 3. امسح Orders
    const deletedOrders = await db.order.deleteMany({
      where: { id: { in: oldOrderIds } },
    })

    return NextResponse.json({
      success: true,
      deletedOrders: deletedOrders.count,
      deletedItems: deletedItems.count,
      cutoffDate: thirtyDaysAgo.toISOString(),
    })
  } catch (error) {
    console.error('Cron cleanup error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/orders/stats - Get order statistics for admin dashboard
export async function GET() {
  try {
    const totalOrders = await db.order.count()

    const pendingOrders = await db.order.count({
      where: { status: 'PENDING' },
    })

    const preparingOrders = await db.order.count({
      where: { status: 'PREPARING' },
    })

    // Today's date range (start of day to end of day)
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    const todayOrdersResult = await db.order.aggregate({
      _count: true,
      _sum: { total: true },
      where: {
        createdAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
        status: { not: 'CANCELLED' },
      },
    })

    const todayRevenue = todayOrdersResult._sum.total || 0
    const todayOrders = todayOrdersResult._count

    return NextResponse.json({
      totalOrders,
      pendingOrders,
      preparingOrders,
      todayRevenue,
      todayOrders,
    })
  } catch (error) {
    console.error('Error fetching order stats:', error)
    return NextResponse.json({ error: 'Failed to fetch order statistics' }, { status: 500 })
  }
}

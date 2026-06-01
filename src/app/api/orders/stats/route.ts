import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/orders/stats - Get order statistics for admin dashboard
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const shiftId = url.searchParams.get('shiftId') || undefined
    const baseWhere = shiftId ? { shiftId } : undefined

    const totalOrders = await db.order.count({ where: baseWhere })

    const pendingOrders = await db.order.count({
      where: shiftId ? { status: 'PENDING', shiftId } : { status: 'PENDING' },
    })

    const preparingOrders = await db.order.count({
      where: shiftId ? { status: 'PREPARING', shiftId } : { status: 'PREPARING' },
    })

    const readyOrders = await db.order.count({
      where: shiftId ? { status: 'READY', shiftId } : { status: 'READY' },
    })

    const readyToPayOrders = await db.order.count({
      where: shiftId ? { status: 'READY_TO_PAY', shiftId } : { status: 'READY_TO_PAY' },
    })

    const cancelledOrders = await db.order.count({
      where: shiftId ? { status: 'CANCELLED', shiftId } : { status: 'CANCELLED' },
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
        ...(shiftId ? { shiftId } : {}),
      },
    })

    const todayRevenue = todayOrdersResult._sum.total || 0
    const todayOrders = todayOrdersResult._count

    return NextResponse.json({
      totalOrders,
      pendingOrders,
      preparingOrders,
      readyOrders,
      readyToPayOrders,
      cancelledOrders,
      todayRevenue,
      todayOrders,
    })
  } catch (error) {
    console.error('Error fetching order stats:', error)
    return NextResponse.json({ error: 'Failed to fetch order statistics' }, { status: 500 })
  }
}

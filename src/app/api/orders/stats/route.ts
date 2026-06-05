import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/orders/stats - Get order statistics for admin dashboard
// FIX: replaced 6 separate count() calls with a single groupBy() query
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const shiftId = url.searchParams.get('shiftId') || undefined

    // Single query to count all statuses at once
    const grouped = await db.order.groupBy({
      by: ['status'],
      where: shiftId ? { shiftId } : undefined,
      _count: { _all: true },
    })

    const countByStatus = (status: string) =>
      grouped.find((g) => g.status === status)?._count._all ?? 0

    const totalOrders    = grouped.reduce((sum, g) => sum + g._count._all, 0)
    const pendingOrders  = countByStatus('PENDING')
    const preparingOrders= countByStatus('PREPARING')
    const readyOrders    = countByStatus('READY')
    const readyToPayOrders = countByStatus('READY_TO_PAY')
    const cancelledOrders  = countByStatus('CANCELLED')

    // Today's revenue — only from DELIVERED orders
    const today      = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay   = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    const todayOrdersResult = await db.order.aggregate({
      _count: true,
      _sum: { total: true },
      where: {
        createdAt: { gte: startOfDay, lt: endOfDay },
        status: 'DELIVERED',
        ...(shiftId ? { shiftId } : {}),
      },
    })

    return NextResponse.json({
      totalOrders,
      pendingOrders,
      preparingOrders,
      readyOrders,
      readyToPayOrders,
      cancelledOrders,
      todayRevenue: todayOrdersResult._sum.total ?? 0,
      todayOrders:  todayOrdersResult._count,
    })
  } catch (error) {
    console.error('Error fetching order stats:', error)
    return NextResponse.json({ error: 'Failed to fetch order statistics' }, { status: 500 })
  }
}

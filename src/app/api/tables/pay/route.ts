import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'

export async function POST(request: NextRequest) {
  if (!requireRole(request, ['ADMIN', 'CASHIER'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const { orderIds } = await request.json()
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: 'orderIds array required' }, { status: 400 })
    }

    const result = await db.$transaction(async (tx) => {
      const orders = await tx.order.findMany({
        where: { id: { in: orderIds } },
        select: { id: true, status: true },
      })

      const notFound = orderIds.filter(id => !orders.find(o => o.id === id))
      if (notFound.length > 0) {
        throw new Error(`Orders not found: ${notFound.join(',')}`)
      }

      const alreadyDelivered = orders.filter(o => o.status === 'DELIVERED' || o.status === 'CANCELLED')
      if (alreadyDelivered.length > 0) {
        throw new Error(`Orders already terminal: ${alreadyDelivered.map(o => o.id).join(',')}`)
      }

      const { count } = await tx.order.updateMany({
        where: { id: { in: orderIds } },
        data: { status: 'DELIVERED' },
      })

      return { updatedCount: count }
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to pay orders'
    console.error('Batch payment error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'

export async function POST(request: NextRequest) {
  if (!requireRole(request, ['ADMIN', 'CASHIER'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const { orderIds, payments } = await request.json()
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: 'orderIds array required' }, { status: 400 })
    }

    const result = await db.$transaction(async (tx) => {
      const orders = await tx.order.findMany({
        where: { id: { in: orderIds } },
        select: { id: true, status: true, total: true },
      })

      const notFound = orderIds.filter(id => !orders.find(o => o.id === id))
      if (notFound.length > 0) {
        throw new Error(`Orders not found: ${notFound.join(',')}`)
      }

      const alreadyDelivered = orders.filter(o => o.status === 'DELIVERED' || o.status === 'CANCELLED')
      if (alreadyDelivered.length > 0) {
        throw new Error(`Orders already terminal: ${alreadyDelivered.map(o => o.id).join(',')}`)
      }

      const grandTotal = orders.reduce((s, o) => s + o.total, 0)
      const paymentsArr = Array.isArray(payments) ? payments as Array<{ method: string; amount: number }> : []

      // Distribute payments proportionally to each order
      const updateData: Array<{ id: string; data: any }> = []
      for (const order of orders) {
        const share = grandTotal > 0 ? order.total / grandTotal : 1 / orders.length
        const orderPayments = paymentsArr.length > 0
          ? paymentsArr.map(p => ({ method: p.method, amount: Math.round(p.amount * share * 100) / 100 }))
          : [{ method: 'CASH', amount: order.total }]

        updateData.push({
          id: order.id,
          data: { status: 'DELIVERED', payments: orderPayments },
        })
      }

      for (const u of updateData) {
        await tx.order.update({ where: { id: u.id }, data: u.data })
      }

      return { updatedCount: updateData.length }
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to pay orders'
    console.error('Batch payment error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

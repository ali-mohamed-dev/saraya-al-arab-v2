import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const fromDate = new Date(2026, 5, 1) // June 1
  const toDate = new Date(2026, 5, 30, 23, 59, 59, 999) // June 30

  console.log('=== ALL ORDERS WITH discountAmount > 0 ===')
  const discounted = await prisma.order.findMany({
    where: {
      createdAt: { gte: fromDate, lte: toDate },
      discountAmount: { gt: 0 },
    },
    select: {
      id: true, orderNumber: true, status: true,
      discountType: true, discountValue: true, discountAmount: true,
      discountReason: true, customerName: true,
      subtotal: true, total: true, shiftId: true, createdAt: true,
    },
    orderBy: { createdAt: 'desc' }
  })

  let totalDisc = 0
  let totalPoints = 0
  for (const o of discounted) {
    totalDisc += o.discountAmount
    if (o.discountType === 'POINTS') totalPoints += o.discountAmount
    const reason = o.discountReason?.slice(0, 40) || '-'
    console.log(`#${o.orderNumber} status:${o.status} type:${o.discountType || '-'} val:${o.discountValue} amt:${o.discountAmount} reason:"${reason}" subtotal:${o.subtotal} total:${o.total} shift:${o.shiftId?.slice(0,8)||'-'}`)
  }

  console.log(`\nTotal discount amount: ${totalDisc}`)
  console.log(`Total points discount: ${totalPoints}`)
  console.log(`Number of discounted orders: ${discounted.length}`)

  // Now check what the discounts API returns
  console.log('\n=== AGGREGATE: sum of total for DELIVERED orders ===')
  const revenueAgg = await prisma.order.aggregate({
    _sum: { total: true },
    where: {
      createdAt: { gte: fromDate, lte: toDate },
      status: 'DELIVERED',
    },
  })
  console.log(`Revenue total (sum of DELIVERED orders): ${revenueAgg._sum.total}`)

  // Check for any orders with discountAmount but that are CANCELLED
  console.log('\n=== DISCOUNTS ON NON-DELIVERED ORDERS ===')
  const nonDelivered = discounted.filter(o => o.status !== 'DELIVERED')
  console.log(`Count: ${nonDelivered.length}`)
  for (const o of nonDelivered) {
    console.log(`#${o.orderNumber} status:${o.status} amt:${o.discountAmount} type:${o.discountType}`)
  }

  await prisma.$disconnect()
}
main().catch(console.error)

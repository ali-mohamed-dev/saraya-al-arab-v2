const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()

async function main() {
  const shifts = await db.shift.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { orders: true } },
    },
  })
  console.log('Shifts:')
  for (const s of shifts) {
    console.log(`  ${s.id}: status=${s.status}, createdAt=${s.createdAt}, orders=${s._count.orders}`)
  }

  // Count orders by status for the OPEN shift
  const openShift = shifts.find(s => s.status === 'OPEN')
  if (openShift) {
    const byStatus = await db.order.groupBy({
      by: ['status'],
      where: { shiftId: openShift.id },
      _count: true,
    })
    console.log(`\nOrders in open shift ${openShift.id}:`)
    for (const g of byStatus) {
      console.log(`  ${g.status}: ${g._count}`)
    }

    // Delivered orders total
    const deliveredTotal = await db.order.aggregate({
      _sum: { total: true },
      where: { shiftId: openShift.id, status: 'DELIVERED' },
    })
    console.log(`\nDelivered total in shift: ${deliveredTotal._sum.total}`)
  }
}
main().then(() => db.$disconnect())

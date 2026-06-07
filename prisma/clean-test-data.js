const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
async function main() {
  // Delete all order items where the order number is >= 2000 OR orderNumber = 0
  const highOrders = await p.order.findMany({ where: { OR: [{ orderNumber: { gte: 2000 } }, { orderNumber: 0 }, { orderNumber: 99999 }] }, select: { id: true } })
  const ids = highOrders.map(o => o.id)
  if (ids.length > 0) {
    await p.orderItem.deleteMany({ where: { orderId: { in: ids } } })
    await p.order.deleteMany({ where: { id: { in: ids } } })
  }
  // Close any open shifts from simulation
  await p.shift.updateMany({ where: { startedBy: 'admin', status: 'OPEN' }, data: { status: 'CLOSED', endedAt: new Date(), endedBy: 'system' } })
  // Delete simulation expenses
  await p.expense.deleteMany({})
  console.log('Cleaned test data - deleted', ids.length, 'orders')
  await p.$disconnect()
}
main()

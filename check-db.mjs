import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  const oldest = await p.order.findFirst({ orderBy: { orderNumber: 'asc' }, select: { id: true, orderNumber: true, shiftId: true } })
  console.log('Oldest order:', JSON.stringify(oldest))
  const simShift = await p.shift.findFirst({ where: { startedBy: 'simulation' }, select: { id: true } })
  console.log('Sim shift:', JSON.stringify(simShift))
  const count = await p.order.count()
  console.log('Total orders:', count)
  await p.$disconnect()
}
main()

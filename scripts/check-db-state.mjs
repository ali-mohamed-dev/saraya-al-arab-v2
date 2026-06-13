import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

async function main() {
  const disc = await p.order.aggregate({ _sum: { discountAmount: true }, where: { discountAmount: { gt: 0 } } })
  console.log('=== DISCOUNTS ===')
  console.log('Sum:', disc._sum.discountAmount)
  const discOrders = await p.order.findMany({ where: { discountAmount: { gt: 0 } }, select: { orderNumber: true, total: true, discountAmount: true, discountType: true, discountValue: true, discountReason: true }, take: 10 })
  discOrders.forEach(o => console.log(`  Order #${o.orderNumber}: total=${o.total}, disc=${o.discountAmount}, type=${o.discountType}, val=${o.discountValue}, reason=${o.discountReason}`))

  const shifts = await p.shift.findMany({ orderBy: { startedAt: 'desc' }, take: 5 })
  console.log('\n=== SHIFTS ===')
  shifts.forEach(s => console.log(JSON.stringify({ id: s.id?.slice(0,8), status: s.status, rev: s.totalRevenue, exp: s.totalExpenses, net: s.netRevenue, date: s.startedAt?.toISOString().slice(0,10) })))

  const tRev = await p.order.aggregate({ _sum: { total: true }, where: { status: 'DELIVERED' } })
  console.log('\nTotal delivered revenue:', tRev._sum.total)
  const tExp = await p.expense.aggregate({ _sum: { amount: true } })
  console.log('Total expenses:', tExp._sum.amount)
  const net = (tRev._sum.total || 0) - (tExp._sum.amount || 0)
  console.log('Net revenue:', net)

  const dCount = await p.order.count({ where: { status: 'DELIVERED' } })
  const pCount = await p.order.count({ where: { status: { not: 'DELIVERED' } } })
  console.log('\nOrders:', dCount, 'delivered,', pCount, 'pending')
  const totalOrders = await p.order.count()
  console.log('Total orders:', totalOrders)

  const eCat = await p.expense.groupBy({ by: ['category'], _sum: { amount: true }, orderBy: { _sum: { amount: 'desc' } } })
  console.log('\n=== EXPENSES BY CATEGORY ===')
  eCat.forEach(e => console.log(' ', e.category, ':', e._sum.amount))

  const oType = await p.order.groupBy({ by: ['type'], _count: true })
  console.log('\n=== ORDERS BY TYPE ===')
  oType.forEach(o => console.log(' ', o.type, ':', o._count))

  const oStatus = await p.order.groupBy({ by: ['status'], _count: true })
  console.log('\n=== ORDERS BY STATUS ===')
  oStatus.forEach(o => console.log(' ', o.status, ':', o._count))

  const w = await p.webUser.count()
  const h = await p.monthlyHandover.count()
  const e2 = await p.employee.count()
  console.log('\nWeb users:', w, '| Handovers:', h, '| Employees:', e2)

  // Check loyalty points
  const loyaltyOrders = await p.order.count({ where: { loyaltyPoints: { gt: 0 } } })
  console.log('Orders with loyalty points:', loyaltyOrders)

  // Check delivery fees
  const delFee = await p.order.aggregate({ _sum: { deliveryFee: true }, where: { deliveryFee: { gt: 0 } } })
  console.log('Total delivery fees:', delFee._sum.deliveryFee)

  // Check service charges
  const svcCharge = await p.order.aggregate({ _sum: { serviceCharge: true } })
  console.log('Total service charges:', svcCharge._sum.serviceCharge)

  // Check supplies
  const supplies = await p.expense.count({ where: { category: 'توريدات' } })
  const suppliesAmount = await p.expense.aggregate({ _sum: { amount: true }, where: { category: 'توريدات' } })
  console.log('Supplies count:', supplies, '| Total:', suppliesAmount._sum.amount)

  // Check salaries
  const salaries = await p.expense.count({ where: { category: 'مرتبات' } })
  const salariesAmount = await p.expense.aggregate({ _sum: { amount: true }, where: { category: 'مرتبات' } })
  console.log('Salaries count:', salaries, '| Total:', salariesAmount._sum.amount)

  // Check loans (سلف)
  const loans = await p.expense.count({ where: { category: 'سلف' } })
  const loansAmount = await p.expense.aggregate({ _sum: { amount: true }, where: { category: 'سلف' } })
  console.log('Loans count:', loans, '| Total:', loansAmount._sum.amount)

  // Check total discounts applied
  const totalDisc = await p.order.aggregate({ _sum: { discountAmount: true } })
  console.log('\nTotal discount amount across all orders:', totalDisc._sum.discountAmount)

  // Check recently created orders
  const recentOrders = await p.order.findMany({ orderBy: { createdAt: 'desc' }, take: 3, include: { items: true } })
  console.log('\n=== LATEST 3 ORDERS ===')
  recentOrders.forEach(o => console.log(JSON.stringify({ num: o.orderNumber, type: o.type, status: o.status, total: o.total, items: o.items.length, shiftId: o.shiftId?.slice(0,8) || 'null' })))

  await p.$disconnect()
}
main()

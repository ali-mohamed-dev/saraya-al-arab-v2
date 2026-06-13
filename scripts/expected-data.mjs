// Query expected data for comparison with UI
import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

async function main() {
  // === CURRENT SHIFT ===
  const openShift = await p.shift.findFirst({ where: { status: 'OPEN' } })
  console.log('CURRENT_SHIFT:')
  if (openShift) {
    console.log(JSON.stringify({ id: openShift.id, status: openShift.status, revenue: openShift.totalRevenue, expenses: openShift.totalExpenses, net: openShift.netRevenue, discounts: openShift.totalDiscounts, loyaltyDiscounts: openShift.totalLoyaltyDiscounts }))
  } else {
    console.log('null')
  }

  // === ALL SHIFTS SUMMARY ===
  const allShifts = await p.shift.findMany({ orderBy: { startedAt: 'desc' } })
  console.log('\nALL_SHIFTS:')
  allShifts.forEach(s => console.log(JSON.stringify({
    id: s.id.slice(0,8),
    status: s.status,
    rev: s.totalRevenue,
    exp: s.totalExpenses,
    net: s.netRevenue,
    disc: s.totalDiscounts,
    loyalDisc: s.totalLoyaltyDiscounts,
    date: s.startedAt?.toISOString().slice(0,10)
  })))

  // === ORDERS SUMMARY ===
  const totalRev = await p.order.aggregate({ _sum: { total: true }, where: { status: 'DELIVERED' } })
  const totalSub = await p.order.aggregate({ _sum: { subtotal: true }, where: { status: 'DELIVERED' } })
  const totalSvc = await p.order.aggregate({ _sum: { serviceCharge: true }, where: { status: 'DELIVERED' } })
  const totalDel = await p.order.aggregate({ _sum: { deliveryFee: true }, where: { status: 'DELIVERED' } })
  const totalDisc = await p.order.aggregate({ _sum: { discountAmount: true } })
  console.log('\nORDERS_SUMMARY:')
  console.log(JSON.stringify({
    deliveredRevenue: totalRev._sum.total,
    deliveredSubtotal: totalSub._sum.subtotal,
    deliveredServiceCharge: totalSvc._sum.serviceCharge,
    deliveredDeliveryFee: totalDel._sum.deliveryFee,
    totalDiscounts: totalDisc._sum.discountAmount
  }))

  // === ORDERS BY TYPE ===
  const byType = await p.order.groupBy({ by: ['type'], _count: true, where: { status: 'DELIVERED' } })
  console.log('\nDELIVERED_ORDERS_BY_TYPE:')
  byType.forEach(o => console.log(JSON.stringify({ type: o.type, count: o._count })))

  // === ALL ORDERS BY STATUS ===
  const byStatus = await p.order.groupBy({ by: ['status'], _count: true })
  console.log('\nALL_ORDERS_BY_STATUS:')
  byStatus.forEach(o => console.log(JSON.stringify({ status: o.status, count: o._count })))

  // === ORDERS BY STATUS FOR EACH SHIFT ===
  console.log('\nORDERS_PER_SHIFT:')
  for (const shift of allShifts) {
    const orderCounts = await p.order.groupBy({ by: ['status'], _count: true, where: { shiftId: shift.id } })
    const shiftTotal = await p.order.aggregate({ _sum: { total: true }, where: { shiftId: shift.id, status: 'DELIVERED' } })
    console.log(JSON.stringify({
      shiftId: shift.id.slice(0,8),
      total: shiftTotal._sum.total,
      orders: Object.fromEntries(orderCounts.map(o => [o.status, o._count]))
    }))
  }

  // === EXPENSES BY CATEGORY ===
  const expByCat = await p.expense.groupBy({ by: ['category'], _sum: { amount: true }, orderBy: { _sum: { amount: 'desc' } } })
  console.log('\nEXPENSES_BY_CATEGORY:')
  expByCat.forEach(e => console.log(JSON.stringify({ category: e.category, total: e._sum.amount })))
  const totalExp = await p.expense.aggregate({ _sum: { amount: true } })
  console.log(JSON.stringify({ category: 'TOTAL', total: totalExp._sum.amount }))

  // === EXPENSES PER SHIFT ===
  console.log('\nEXPENSES_PER_SHIFT:')
  for (const shift of allShifts) {
    const shiftExp = await p.expense.aggregate({ _sum: { amount: true }, where: { shiftId: shift.id } })
    const expCount = await p.expense.count({ where: { shiftId: shift.id } })
    console.log(JSON.stringify({ shiftId: shift.id.slice(0,8), total: shiftExp._sum.amount, count: expCount }))
  }

  // === WEB USERS ===
  const webUsers = await p.webUser.findMany({ select: { id: true, name: true, phone: true, pointsBalance: true, totalSpent: true, createdAt: true } })
  console.log('\nWEB_USERS:')
  webUsers.forEach(u => console.log(JSON.stringify(u)))
  console.log(JSON.stringify({ count: webUsers.length }))

  // === EMPLOYEES ===
  const employees = await p.employee.findMany({ select: { id: true, name: true, role: true, salary: true, phone: true } })
  console.log('\nEMPLOYEES:')
  employees.forEach(e => console.log(JSON.stringify(e)))
  console.log(JSON.stringify({ count: employees.length }))

  // === DISCOUNTED ORDERS ===
  const discOrders = await p.order.findMany({
    where: { discountAmount: { gt: 0 } },
    select: { orderNumber: true, total: true, discountType: true, discountValue: true, discountAmount: true, discountReason: true, discountAppliedBy: true },
    orderBy: { createdAt: 'desc' },
    take: 20
  })
  console.log('\nDISCOUNTED_ORDERS:')
  discOrders.forEach(o => console.log(JSON.stringify(o)))

  // === HANDOVERS ===
  const handovers = await p.monthlyHandover.findMany()
  console.log('\nHANDOVERS:')
  console.log(JSON.stringify(handovers))

  // === TABLES ===
  const tables = await p.restaurantTable.findMany()
  console.log('\nTABLES:')
  tables.forEach(t => console.log(JSON.stringify({ id: t.id.slice(0,8), name: t.name, seats: t.seats })))

  // === TOTAL DISCOUNTS ===
  const deliveryDiscounts = await p.order.findMany({ where: { discountAmount: { gt: 0 }, deliveryFee: { gt: 0 } }, select: { orderNumber: true, discountAmount: true, deliveryFee: true } })
  console.log('\nDELIVERY_DISCOUNTS:', JSON.stringify(deliveryDiscounts))

  await p.$disconnect()
}
main()

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== SHIFTS ===')
  const shifts = await prisma.shift.findMany({ orderBy: { startedAt: 'asc' } })
  for (const s of shifts) {
    console.log(`ID:${s.id.slice(0,8)} Status:${s.status} Revenue:${s.totalRevenue} Discounts:${s.totalDiscounts} Started:${s.startedAt.toISOString().slice(0,10)}`)
  }

  console.log('\n=== DELIVERED ORDERS ===')
  const delivered = await prisma.order.findMany({
    where: { status: 'DELIVERED' },
    orderBy: { createdAt: 'asc' },
    select: { id: true, orderNumber: true, total: true, subtotal: true, discountAmount: true, discountType: true, discountReason: true, customerName: true, shiftId: true, createdAt: true }
  })
  let openShiftRevenue = 0
  const openShiftIds = new Set(shifts.filter(s => s.status === 'OPEN').map(s => s.id))
  for (const o of delivered) {
    const inOpen = openShiftIds.has(o.shiftId || '')
    if (inOpen) openShiftRevenue += o.total
    console.log(`#${o.orderNumber} total:${o.total} discAmt:${o.discountAmount} discType:${o.discountType || '-'} reason:"${o.discountReason || '-'}" shiftOpen:${inOpen} date:${o.createdAt.toISOString().slice(0,10)}`)
  }

  const closedShiftRevenue = shifts.filter(s => s.status === 'CLOSED').reduce((sum, s) => sum + s.totalRevenue, 0)
  const totalRevenue = closedShiftRevenue + openShiftRevenue
  console.log(`\nClosed shifts revenue: ${closedShiftRevenue}`)
  console.log(`Open shifts revenue (from delivered orders): ${openShiftRevenue}`)
  console.log(`Total revenue: ${totalRevenue}`)

  const discountedOrders = delivered.filter(o => (o.discountAmount || 0) > 0)
  const totalDiscounts = discountedOrders.reduce((s, o) => s + (o.discountAmount || 0), 0)
  const totalLoyaltyDiscounts = discountedOrders.filter(o => o.discountType === 'POINTS').reduce((s, o) => s + (o.discountAmount || 0), 0)
  console.log(`\nTotal discounts: ${totalDiscounts}`)
  console.log(`Loyalty discounts: ${totalLoyaltyDiscounts}`)
  console.log(`Number of discounted orders: ${discountedOrders.length}`)

  console.log('\n=== ALL ORDERS (by status) ===')
  const allOrders = await prisma.order.findMany({
    select: { id: true, status: true, orderNumber: true, total: true, shiftId: true },
    orderBy: { createdAt: 'asc' }
  })
  for (const o of allOrders) {
    console.log(`#${o.orderNumber} status:${o.status} total:${o.total} shiftId:${o.shiftId?.slice(0,8) || '-'}`)
  }

  console.log('\n=== EXPENSES ===')
  const expenses = await prisma.expense.findMany({ orderBy: { createdAt: 'asc' } })
  let totalExpenses = 0
  const catMap = new Map()
  for (const e of expenses) {
    totalExpenses += e.amount
    catMap.set(e.category, (catMap.get(e.category) || 0) + e.amount)
    console.log(`${e.description} amount:${e.amount} cat:"${e.category}" shiftId:${e.shiftId?.slice(0,8) || 'null'} by:${e.createdBy} date:${e.createdAt.toISOString().slice(0,10)}`)
  }
  console.log(`\nTotal expenses: ${totalExpenses}`)
  console.log('Category totals:')
  for (const [cat, total] of Array.from(catMap.entries()).sort((a,b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${total}`)
  }

  const netRevenue = totalRevenue - totalExpenses
  console.log(`\nNet revenue: ${totalRevenue} - ${totalExpenses} = ${netRevenue}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())

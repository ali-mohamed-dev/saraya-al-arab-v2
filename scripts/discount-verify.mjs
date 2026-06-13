import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

async function main() {
  const from = new Date('2026-05-31T21:00:00.000Z')
  const to = new Date('2026-06-30T20:59:59.000Z')

  // Simulate discounts API
  const orders = await p.order.findMany({
    where: { discountAmount: { gt: 0 }, createdAt: { gte: from, lte: to } },
    select: { discountAmount: true, discountType: true }
  })
  const total = orders.reduce((s, o) => s + o.discountAmount, 0)
  const pointsTotal = orders.filter(o => o.discountType === 'POINTS').reduce((s, o) => s + o.discountAmount, 0)
  console.log('=== DISCOUNTS API ===')
  console.log('Total discounts:', total)
  console.log('Points discounts:', pointsTotal)
  console.log('Other discounts:', total - pointsTotal)
  console.log('Orders count:', orders.length)

  // Shift totals
  const shifts = await p.shift.findMany({
    where: { startedAt: { gte: from, lte: to } },
    select: { totalDiscounts: true, totalLoyaltyDiscounts: true }
  })
  const shiftDisc = shifts.reduce((s, sh) => s + (sh.totalDiscounts || 0), 0)
  const shiftLoyal = shifts.reduce((s, sh) => s + (sh.totalLoyaltyDiscounts || 0), 0)
  console.log('\n=== SHIFT TOTALS ===')
  console.log('Shift totalDiscounts sum:', shiftDisc)
  console.log('Shift totalLoyaltyDiscounts sum:', shiftLoyal)

  // Revenue
  const rev = await p.order.aggregate({ _sum: { total: true }, where: { status: 'DELIVERED', createdAt: { gte: from, lte: to } } })
  console.log('\n=== REVENUE ===')
  console.log('Delivered orders revenue:', rev._sum.total)

  // Expenses
  const expTotal = await p.expense.aggregate({ _sum: { amount: true } })
  const expJune = await p.expense.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: from, lte: to } } })
  console.log('\n=== EXPENSES ===')
  console.log('Total expenses:', expTotal._sum.amount)
  console.log('June expenses:', expJune._sum.amount)

  // Check the discounts API code
  // The UI shows 60 total and 10 loyalty
  // 60 could be: shift totalDiscounts (40.08) + something
  // Let me check if there are discounts not on orders but recorded elsewhere
  console.log('\n=== ANALYSIS ===')
  console.log('Revenue (orders):', rev._sum.total)
  console.log('Expenses (all):', expTotal._sum.amount)
  console.log('Expected net:', (rev._sum.total || 0) - (expTotal._sum.amount || 0))
  console.log('\nDiscount discrepancy:')
  console.log('  From order records:', total)
  console.log('  From shift records:', shiftDisc)
  console.log('  UI says: 60')
  console.log('Loyalty discrepancy:')
  console.log('  From order POINTS type:', pointsTotal)
  console.log('  From shift records:', shiftLoyal)
  console.log('  UI says: 10')

  // UI shows: إجمالي الخصومات = 60, خصم نقاط الولاء = 10
  // 60 - 10 = 50 non-loyalty discounts
  // But shift totalDiscounts = 40.08, and 40.08 ≠ 50
  // Order total discounts = 400.53, and 400.53 ≠ 60
  // 
  // Let me check: maybe 60 = 20 (one discount) + 20 (another) + 20 (another)?
  const nonPoints = orders.filter(o => o.discountType !== 'POINTS')
  console.log('\nNon-points discounts:')
  nonPoints.forEach(o => console.log(`  ${o.discountAmount} (${o.discountType})`))
  // Maybe the UI shows only SOME of the discounts?

  await p.$disconnect()
}
main()

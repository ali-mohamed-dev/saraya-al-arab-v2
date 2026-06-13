import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

async function main() {
  // Discounts in June 2026
  const juneStart = new Date('2026-06-01T00:00:00.000Z')
  const juneEnd = new Date('2026-06-30T23:59:59.000Z')

  const juneDisc = await p.order.findMany({
    where: { discountAmount: { gt: 0 }, createdAt: { gte: juneStart, lte: juneEnd } },
    select: { orderNumber: true, discountAmount: true, discountType: true, discountValue: true, discountReason: true, discountAppliedBy: true, createdAt: true, total: true },
    orderBy: { createdAt: 'desc' }
  })
  console.log(`June discounts count: ${juneDisc.length}`)
  console.log(`June discounts total: ${juneDisc.reduce((s, o) => s + o.discountAmount, 0)}`)
  juneDisc.forEach(o => console.log(`  Order #${o.orderNumber}: ${o.discountAmount} (${o.discountType} ${o.discountValue}) - ${o.discountReason} | total=${o.total} | ${o.createdAt.toISOString().slice(0,10)}`))

  // All discounts (including those from simulation data)
  const allDisc = await p.order.findMany({
    where: { discountAmount: { gt: 0 } },
    select: { orderNumber: true, discountAmount: true, discountType: true, discountValue: true, discountReason: true, createdAt: true, total: true },
    orderBy: { createdAt: 'desc' }
  })
  console.log(`\nAll discounts count: ${allDisc.length}`)
  console.log(`All discounts total: ${allDisc.reduce((s, o) => s + o.discountAmount, 0)}`)
  allDisc.forEach(o => console.log(`  Order #${o.orderNumber}: ${o.discountAmount} (${o.discountType} ${o.discountValue}) - ${o.discountReason} | total=${o.total} | ${o.createdAt.toISOString().slice(0,10)}`))

  // Check revenue by month
  const monthRev = await p.order.aggregate({ _sum: { total: true }, where: { status: 'DELIVERED', createdAt: { gte: juneStart, lte: juneEnd } } })
  console.log(`\nJune delivered revenue: ${monthRev._sum.total}`)

  // Check total expenses in June
  const juneExp = await p.expense.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: juneStart, lte: juneEnd } } })
  console.log(`June expenses: ${juneExp._sum.amount}`)

  const allExp = await p.expense.aggregate({ _sum: { amount: true } })
  console.log(`All expenses: ${allExp._sum.amount}`)

  // Check discounts API stats
  const loyaltyDisc = await p.order.aggregate({ _sum: { discountAmount: true }, where: { discountType: 'POINTS' } })
  console.log(`\nLoyalty points discounts total: ${loyaltyDisc._sum.discountAmount}`)

  // Check each shift's date
  const shifts = await p.shift.findMany({ orderBy: { startedAt: 'asc' }, select: { id: true, status: true, totalRevenue: true, totalExpenses: true, totalDiscounts: true, totalLoyaltyDiscounts: true, startedAt: true } })
  console.log('\n=== ALL SHIFTS WITH DATES ===')
  let totalShiftRev = 0
  let totalShiftExp = 0
  let totalShiftDisc = 0
  let totalShiftLoyal = 0
  let inJuneCount = 0
  shifts.forEach(s => {
    const inJune = s.startedAt >= juneStart && s.startedAt <= juneEnd
    if (inJune) {
      totalShiftRev += s.totalRevenue || 0
      totalShiftExp += s.totalExpenses || 0
      totalShiftDisc += s.totalDiscounts || 0
      totalShiftLoyal += s.totalLoyaltyDiscounts || 0
      inJuneCount++
    }
    console.log(`  ${s.status} | rev=${s.totalRevenue} exp=${s.totalExpenses} disc=${s.totalDiscounts} loyal=${s.totalLoyaltyDiscounts} | ${s.startedAt.toISOString().slice(0,10)} ${inJune ? '← JUNE' : ''}`)
  })
  console.log(`\nJune shift totals: rev=${totalShiftRev} exp=${totalShiftExp} disc=${totalShiftDisc} loyal=${totalShiftLoyal} (${inJuneCount} shifts)`)

  await p.$disconnect()
}
main()

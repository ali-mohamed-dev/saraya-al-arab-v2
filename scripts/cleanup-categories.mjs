import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('=== CURRENT CATEGORIES ===')
  const cats = await prisma.expenseCategory.findMany({ orderBy: { name: 'asc' } })
  for (const c of cats) {
    console.log(`id=${c.id} name="${c.name}"`)
  }

  console.log('\n=== EXPENSES GROUPED BY CATEGORY ===')
  const expenses = await prisma.expense.findMany()
  const catMap = new Map()
  for (const e of expenses) {
    const entry = catMap.get(e.category) || { count: 0, total: 0 }
    entry.count++
    entry.total += e.amount
    catMap.set(e.category, entry)
  }
  for (const [cat, data] of catMap) {
    console.log(`"${cat}" => ${data.count} expenses, ${data.total} total`)
  }

  // Ensure "أخرى" category exists
  const other = await prisma.expenseCategory.upsert({
    where: { name: 'أخرى' },
    update: {},
    create: { name: 'أخرى' },
  })
  console.log(`\n"أخرى" category id=${other.id}`)

  // Cleanup: identify garbled categories
  // Garbled = names with replacement characters, or __Renamed__, or pure ASCII non-words
  const knownGood = ['إيجار', 'Bills', 'سلف العماله', 'Supplies', 'Maintenance', 'صيانة', 'مواد خام', 'أخرى', 'تسويق', 'خامات', 'رواتب', 'فواتير', 'نقل']
  const garbled = cats.filter(c => !knownGood.includes(c.name) && (c.name === '__Renamed__' || /[�?]/.test(c.name)))
  console.log(`\n=== GARBLED CATEGORIES TO DELETE (${garbled.length}) ===`)
  for (const g of garbled) {
    // Move any expenses using this garbled name to "أخرى"
    const affected = await prisma.expense.updateMany({
      where: { category: g.name },
      data: { category: 'أخرى' },
    })
    await prisma.expenseCategory.delete({ where: { id: g.id } })
    console.log(`Deleted "${g.name}" -> moved ${affected.count} expenses to "أخرى"`)
  }

  const remaining = await prisma.expenseCategory.findMany({ orderBy: { name: 'asc' } })
  console.log('\n=== REMAINING CATEGORIES ===')
  for (const c of remaining) {
    console.log(`id=${c.id} name="${c.name}"`)
  }

  await prisma.$disconnect()
}
main().catch(console.error)

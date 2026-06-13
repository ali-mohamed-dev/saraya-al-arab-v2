import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const defaults = ['خامات', 'رواتب', 'إيجار', 'فواتير', 'صيانة', 'تسويق', 'نقل', 'أخرى']
  for (const name of defaults) {
    try {
      await prisma.expenseCategory.upsert({
        where: { name },
        update: {},
        create: { name },
      })
      console.log('  OK', name)
    } catch (e: any) {
      console.log('  FAIL', name, e.message)
    }
  }
  const cats = await prisma.expenseCategory.findMany({ orderBy: { name: 'asc' } })
  console.log('Total categories:', cats.length)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

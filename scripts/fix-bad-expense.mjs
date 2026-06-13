import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const badExpense = await prisma.expense.findFirst({
    where: { category: { contains: '�' } },
  })
  if (badExpense) {
    console.log(`Fixing expense: id=${badExpense.id} desc="${badExpense.description}" cat="${badExpense.category}" amt=${badExpense.amount}`)
    await prisma.expense.update({ where: { id: badExpense.id }, data: { category: 'أخرى' } })
    console.log('-> Moved to "أخرى"')
  }
  // Also check for __TestUpd__
  const testExpense = await prisma.expense.findFirst({
    where: { description: { contains: '__TestUpd__' } },
  })
  if (testExpense) {
    console.log(`Deleting test expense: id=${testExpense.id}`)
    await prisma.expense.delete({ where: { id: testExpense.id } })
    console.log('-> Deleted')
  }
  await prisma.$disconnect()
}
main().catch(console.error)

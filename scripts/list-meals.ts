import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const meals = await prisma.meal.findMany({ select: { id: true, name: true, price: true, category: true } })
  console.log(JSON.stringify(meals, null, 2))
  const count = await prisma.shift.count()
  console.log('Current shift count:', count)
  const orderCount = await prisma.order.count()
  console.log('Current order count:', orderCount)
  const expenseCount = await prisma.expense.count()
  console.log('Current expense count:', expenseCount)
  const adminCount = await prisma.admin.count()
  console.log('Current admin count:', adminCount)
  const catCount = await prisma.category.count()
  console.log('Current category count:', catCount)
  const addOnCount = await prisma.addOn.count()
  console.log('Current addon count:', addOnCount)
  const promoCount = await prisma.promotion.count()
  console.log('Current promo count:', promoCount)
  const tableCount = await prisma.restaurantTable.count()
  console.log('Current table count:', tableCount)
}

main().catch(console.error).finally(() => prisma.$disconnect())

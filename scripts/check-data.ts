import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const meals = await prisma.meal.findMany({ select: { id: true, title: true, titleAr: true, price: true, category: true, preparationArea: true } })
  const addons = await prisma.addOn.findMany({ select: { id: true, title: true, price: true } })
  const admins = await prisma.admin.findMany({ select: { id: true, username: true } })
  const cats = await prisma.category.findMany({ select: { id: true, name: true } })
  const tables = await prisma.restaurantTable.findMany({ select: { id: true, number: true } })
  const promos = await prisma.promotion.findMany({ select: { id: true, title: true } })

  console.log('=== MEALS ===')
  console.log(JSON.stringify(meals, null, 2))
  console.log('\n=== ADDONS ===')
  console.log(JSON.stringify(addons, null, 2))
  console.log('\n=== ADMINS ===')
  console.log(JSON.stringify(admins, null, 2))
  console.log('\n=== CATEGORIES ===')
  console.log(JSON.stringify(cats, null, 2))
  console.log('\n=== TABLES ===')
  console.log(JSON.stringify(tables, null, 2))
  console.log('\n=== PROMOS ===')
  console.log(JSON.stringify(promos, null, 2))

  console.log('\n=== COUNTS ===')
  console.log('Meals:', meals.length)
  console.log('Addons:', addons.length)
  console.log('Admins:', admins.length)
  console.log('Categories:', cats.length)
  console.log('Tables:', tables.length)
  console.log('Promos:', promos.length)
  console.log('Shifts:', await prisma.shift.count())
  console.log('Orders:', await prisma.order.count())
  console.log('OrderItems:', await prisma.orderItem.count())
  console.log('Expenses:', await prisma.expense.count())
}

main().catch(console.error).finally(() => prisma.$disconnect())

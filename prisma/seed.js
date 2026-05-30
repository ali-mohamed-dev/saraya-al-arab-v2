/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...\n')

  // 1. Create Admin user
  const admin = await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: 'saraya2024',
    },
  })
  console.log('✅ Admin created:', admin.username)

  // 2. Create sample meals
  const meals = [
    {
      title: 'Mixed Grill Platter',
      titleAr: 'مشويات مشكلة',
      description: 'A generous platter of kebab, kofta, and lamb chops',
      descriptionAr: 'طبق سخي من الكباب والكفتة وريش الغنم',
      price: 250,
      prepTime: '25 دقيقة',
      category: 'مشويات',
      categoryAr: 'Grills',
      isActive: true,
    },
    {
      title: 'Lamb Kofta',
      titleAr: 'كفتة لحم',
      description: 'Juicy lamb kofta with spices',
      descriptionAr: 'كفتة لحم شهية بالتوابل',
      price: 120,
      prepTime: '20 دقيقة',
      category: 'مشويات',
      categoryAr: 'Grills',
      isActive: true,
    },
    {
      title: 'Chicken Shawarma',
      titleAr: 'شاورما فراخ',
      description: 'Tender chicken shawarma wrap',
      descriptionAr: 'راب شاورما فراخ طري',
      price: 75,
      prepTime: '15 دقيقة',
      category: 'ساندويتشات',
      categoryAr: 'Sandwiches',
      isActive: true,
    },
    {
      title: 'Hummus',
      titleAr: 'حمص',
      description: 'Creamy chickpea dip with tahini',
      descriptionAr: 'حمص كريمي بالطحينة',
      price: 45,
      prepTime: '5 دقيقة',
      category: 'مقبلات',
      categoryAr: 'Appetizers',
      isActive: true,
    },
    {
      title: 'Falafel Plate',
      titleAr: 'طبق فلافل',
      description: 'Crispy falafel with tahini sauce',
      descriptionAr: 'فلافل مقرمشة بصوص الطحينة',
      price: 55,
      prepTime: '10 دقيقة',
      category: 'مقبلات',
      categoryAr: 'Appetizers',
      isActive: true,
    },
    {
      title: 'Kunafa',
      titleAr: 'كنافة',
      description: 'Traditional sweet cheese kunafa',
      descriptionAr: 'كنافة بالجبنة التقليدية',
      price: 65,
      prepTime: '15 دقيقة',
      category: 'حلويات',
      categoryAr: 'Desserts',
      isActive: true,
    },
    {
      title: 'Fresh Orange Juice',
      titleAr: 'عصير برتقان طازج',
      description: 'Freshly squeezed orange juice',
      descriptionAr: 'عصير برتقان طازج معصور',
      price: 30,
      prepTime: '5 دقيقة',
      category: 'مشروبات',
      categoryAr: 'Beverages',
      isActive: true,
    },
    {
      title: 'Mansaf',
      titleAr: 'منسف',
      description: 'Traditional lamb mansaf with rice',
      descriptionAr: 'منسف لحم تقليدي بالأرز',
      price: 180,
      prepTime: '30 دقيقة',
      category: 'أطباق رئيسية',
      categoryAr: 'Main Courses',
      isActive: true,
    },
  ]

  for (const meal of meals) {
    const existing = await prisma.meal.findFirst({
      where: { titleAr: meal.titleAr },
    })
    if (!existing) {
      await prisma.meal.create({ data: meal })
      console.log(`✅ Meal: ${meal.titleAr}`)
    } else {
      console.log(`⏭️  Meal exists: ${meal.titleAr}`)
    }
  }

  console.log('\n🎉 Seeding complete!')
  console.log('📧 Admin login: admin / saraya2024')
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

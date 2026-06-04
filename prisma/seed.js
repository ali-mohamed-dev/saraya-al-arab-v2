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
      category: 'Grills',
      categoryAr: 'مشويات',
      isActive: true,
    },
    {
      title: 'Lamb Kofta',
      titleAr: 'كفتة لحم',
      description: 'Juicy lamb kofta with spices',
      descriptionAr: 'كفتة لحم شهية بالتوابل',
      price: 120,
      prepTime: '20 دقيقة',
      category: 'Grills',
      categoryAr: 'مشويات',
      isActive: true,
    },
    {
      title: 'Chicken Shawarma',
      titleAr: 'شاورما فراخ',
      description: 'Tender chicken shawarma wrap',
      descriptionAr: 'راب شاورما فراخ طري',
      price: 75,
      prepTime: '15 دقيقة',
      category: 'Sandwiches',
      categoryAr: 'ساندويتشات',
      isActive: true,
    },
    {
      title: 'Hummus',
      titleAr: 'حمص',
      description: 'Creamy chickpea dip with tahini',
      descriptionAr: 'حمص كريمي بالطحينة',
      price: 45,
      prepTime: '5 دقيقة',
      category: 'Appetizers',
      categoryAr: 'مقبلات',
      isActive: true,
    },
    {
      title: 'Falafel Plate',
      titleAr: 'طبق فلافل',
      description: 'Crispy falafel with tahini sauce',
      descriptionAr: 'فلافل مقرمشة بصوص الطحينة',
      price: 55,
      prepTime: '10 دقيقة',
      category: 'Appetizers',
      categoryAr: 'مقبلات',
      isActive: true,
    },
    {
      title: 'Kunafa',
      titleAr: 'كنافة',
      description: 'Traditional sweet cheese kunafa',
      descriptionAr: 'كنافة بالجبنة التقليدية',
      price: 65,
      prepTime: '15 دقيقة',
      category: 'Desserts',
      categoryAr: 'حلويات',
      isActive: true,
    },
    {
      title: 'Fresh Orange Juice',
      titleAr: 'عصير برتقان طازج',
      description: 'Freshly squeezed orange juice',
      descriptionAr: 'عصير برتقان طازج معصور',
      price: 30,
      prepTime: '5 دقيقة',
      category: 'Beverages',
      categoryAr: 'مشروبات',
      isActive: true,
    },
    {
      title: 'Mansaf',
      titleAr: 'منسف',
      description: 'Traditional lamb mansaf with rice',
      descriptionAr: 'منسف لحم تقليدي بالأرز',
      price: 180,
      prepTime: '30 دقيقة',
      category: 'Main Courses',
      categoryAr: 'أطباق رئيسية',
      isActive: true,
    },
    {
      title: 'Tabbouleh',
      titleAr: 'تبولة',
      description: 'Fresh parsley salad with bulgur and lemon',
      descriptionAr: 'سلطة بقدونس طازجة مع البرغل والليمون',
      price: 40,
      prepTime: '10 دقيقة',
      category: 'Appetizers',
      categoryAr: 'مقبلات',
      isActive: true,
    },
    {
      title: 'Saraya Special Mandi',
      titleAr: 'مندي سرايا الخاص',
      description: 'Slow-cooked lamb with fragrant basmati rice and spicy sauce',
      descriptionAr: 'لحم مطهو ببطء مع أرز بسمتي عطري وصوص حار',
      price: 320,
      prepTime: '45 دقيقة',
      category: 'Main Courses',
      categoryAr: 'أطباق رئيسية',
      isActive: true,
    },
    {
      title: 'Mix Appetizer Platter',
      titleAr: 'طبق مقبلات مشكل',
      description: 'A selection of hummus, mutabal, tabbouleh, and warak enab',
      descriptionAr: 'تشكيلة من الحمص والمتبل والتبولة وورق العنب',
      price: 150,
      prepTime: '15 دقيقة',
      category: 'Appetizers',
      categoryAr: 'مقبلات',
      isActive: true,
    },
  ]

  for (const meal of meals) {
    const existing = await prisma.meal.findFirst({
      where: { 
        OR: [
          { titleAr: meal.titleAr },
          { title: meal.title }
        ]
      },
    })
    if (!existing) {
      await prisma.meal.create({ data: meal })
      console.log(`✅ Meal added: ${meal.titleAr} / ${meal.title}`)
    } else {
      console.log(`⏭️  Meal exists: ${meal.titleAr}`)
    }
  }

  // 3. Create sample promotions
  const orangeJuiceMeal = await prisma.meal.findFirst({ where: { titleAr: 'عصير برتقان طازج' } });

  const promotions = [
    {
      title: 'Family Offer',
      titleAr: 'عرض العائلة',
      description: 'Get 15% off on orders above 500 EGP',
      descriptionAr: 'خصم ١٥٪ على الطلبات فوق ٥٠٠ جنيه',
      bannerImageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4',
      price: 0,
      buttonTextAr: 'تصفح المنيو',
      isActive: true,
    },
    {
      title: 'Summer Drink',
      titleAr: 'مشروب الصيف',
      description: 'Buy one orange juice, get one free',
      descriptionAr: 'اشتري عصير برتقال واحصل على الثاني مجاناً',
      bannerImageUrl: 'https://images.unsplash.com/photo-1536939459926-301728717817',
      price: 30,
      mealId: orangeJuiceMeal?.id,
      buttonTextAr: 'اطلب العرض',
      isActive: true,
    },
  ]

  for (const promo of promotions) {
    const existing = await prisma.promotion.findFirst({
      where: { titleAr: promo.titleAr },
    })
    if (!existing) {
      await prisma.promotion.create({ data: promo })
      console.log(`✅ Promotion added: ${promo.titleAr}`)
    } else {
      console.log(`⏭️  Promotion exists: ${promo.titleAr}`)
    }
  }

  // 4. Create sample add-ons
  // Get the first meal to link addons to (since AddOn requires mealId)
  const firstMeal = await prisma.meal.findFirst();
  
  const addOns = [
    { title: 'Extra Cheese', titleAr: 'جبنة زيادة', price: 20, mealId: firstMeal?.id },
    { title: 'Spicy Sauce', titleAr: 'صوص حار', price: 10, mealId: firstMeal?.id },
    { title: 'Garlic Dip', titleAr: 'تومية', price: 15, mealId: firstMeal?.id },
    { title: 'French Fries', titleAr: 'بطاطس محمرة', price: 40, mealId: firstMeal?.id },
  ]

  if (firstMeal) {
    for (const addOn of addOns) {
      const existing = await prisma.addOn.findFirst({
        where: { titleAr: addOn.titleAr, mealId: firstMeal.id },
      })
      if (!existing) {
        await prisma.addOn.create({ data: addOn })
        console.log(`✅ Add-on added: ${addOn.titleAr}`)
      } else {
        console.log(`⏭️  Add-on exists: ${addOn.titleAr}`)
      }
    }
  }

  console.log('\n' + '='.repeat(30))
  console.log('🎉 Seeding completed successfully!')
  console.log('📧 Admin Username: admin')
  console.log('🔑 Admin Password: saraya2024')
  console.log('='.repeat(30))
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...\n')

  // ─── 1. Admin & Staff ──────────────────────────────────────
  const adminPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.admin.upsert({
    where: { username: 'admin' },
    update: { password: adminPassword },
    create: { username: 'admin', password: adminPassword },
  })
  console.log('✅ Admin:', admin.username)

  const staff = [
    { username: 'waiter1', password: await bcrypt.hash('waiter123', 12), role: 'WAITER' },
    { username: 'waiter2', password: await bcrypt.hash('waiter123', 12), role: 'WAITER' },
    { username: 'waiter3', password: await bcrypt.hash('waiter123', 12), role: 'WAITER' },
    { username: 'cashier1', password: await bcrypt.hash('cashier123', 12), role: 'CASHIER' },
    { username: 'cashier2', password: await bcrypt.hash('cashier123', 12), role: 'CASHIER' },
    { username: 'kitchen1', password: await bcrypt.hash('kitchen123', 12), role: 'KITCHEN' },
    { username: 'kitchen2', password: await bcrypt.hash('kitchen123', 12), role: 'KITCHEN' },
    { username: 'barista1', password: await bcrypt.hash('barista123', 12), role: 'BARISTA' },
  ]
  for (const s of staff) {
    await prisma.admin.upsert({
      where: { username: s.username },
      update: { password: s.password },
      create: s,
    })
    console.log('✅ Staff:', s.username)
  }

  // ─── 2. Categories ────────────────────────────────────────
  const categories = [
    { name: 'مشويات', icon: '🔥', sortOrder: 1 },
    { name: 'طواجن', icon: '🥘', sortOrder: 2 },
    { name: 'أطباق رئيسية', icon: '🍽️', sortOrder: 3 },
    { name: 'ساندويتشات', icon: '🥪', sortOrder: 4 },
    { name: 'مقبلات', icon: '🥗', sortOrder: 5 },
    { name: 'سلطات', icon: '🥬', sortOrder: 6 },
    { name: 'حساء', icon: '🍲', sortOrder: 7 },
    { name: 'حلويات', icon: '🍮', sortOrder: 8 },
    { name: 'مشروبات ساخنة', icon: '☕', sortOrder: 9 },
    { name: 'مشروبات باردة', icon: '🧊', sortOrder: 10 },
  ]

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: { icon: cat.icon, sortOrder: cat.sortOrder },
      create: cat,
    })
    console.log('✅ Category:', cat.name)
  }

  // ─── 3. Tables ────────────────────────────────────────────
  const tables = [
    { number: 1, name: 'طاولة 1 - شباك', seats: 2, area: 'صالة رئيسية', secretCode: 'A1B2C3' },
    { number: 2, name: 'طاولة 2', seats: 4, area: 'صالة رئيسية', secretCode: 'D4E5F6' },
    { number: 3, name: 'طاولة 3', seats: 4, area: 'صالة رئيسية', secretCode: 'G7H8I9' },
    { number: 4, name: 'طاولة 4 - ركن', seats: 6, area: 'صالة رئيسية', secretCode: 'J0K1L2' },
    { number: 5, name: 'طاولة 5 - VIP', seats: 8, area: 'VIP', secretCode: 'M3N4O5' },
    { number: 6, name: 'طاولة 6', seats: 4, area: 'صالة رئيسية', secretCode: 'P6Q7R8' },
    { number: 7, name: 'طاولة 7 - تراس', seats: 4, area: 'تراس', secretCode: 'S9T0U1' },
    { number: 8, name: 'طاولة 8 - تراس', seats: 6, area: 'تراس', secretCode: 'V2W3X4' },
    { number: 9, name: 'طاولة 9 - عيلة', seats: 10, area: 'صالة عائلية', secretCode: 'Y5Z6A7' },
    { number: 10, name: 'طاولة 10 - عيلة', seats: 10, area: 'صالة عائلية', secretCode: 'B8C9D0' },
  ]

  for (const t of tables) {
    await prisma.restaurantTable.upsert({
      where: { number: t.number },
      update: { name: t.name, seats: t.seats, area: t.area, secretCode: t.secretCode },
      create: t,
    })
    console.log('✅ Table:', t.number)
  }

  // ─── 4. Meals ──────────────────────────────────────────────
  const meals = [
    // ═══ مشويات ═══
    { title: 'Mixed Grill Platter', titleAr: 'مشويات مشكلة', description: 'A generous platter of kebab, kofta, and lamb chops served with rice and grilled tomatoes', descriptionAr: 'طبق سخي من الكباب والكفتة وريش الغنم مع أرز وطماطم مشوية', price: 280, prepTime: '30 دقيقة', category: 'مشويات', categoryAr: 'مشويات', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Lamb Kofta', titleAr: 'كفتة لحم', description: 'Juicy spiced lamb kofta grilled to perfection', descriptionAr: 'كفتة لحم شهية بالتوابل مشوية للكمال', price: 130, prepTime: '20 دقيقة', category: 'مشويات', categoryAr: 'مشويات', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Lamb Kebab', titleAr: 'كباب لحم', description: 'Tender lamb kebab cubes with bell peppers and onions', descriptionAr: 'كباب لحم طري مع فلفل وبصل', price: 140, prepTime: '25 دقيقة', category: 'مشويات', categoryAr: 'مشويات', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Chicken Kebab', titleAr: 'كباب فراخ', description: 'Marinated chicken kebab with special spices', descriptionAr: 'كباب فراخ متبل بتوابل خاصة', price: 120, prepTime: '20 دقيقة', category: 'مشويات', categoryAr: 'مشويات', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Grilled Lamb Chops', titleAr: 'ريش غنم مشوية', description: 'Premium lamb chops with rosemary and garlic', descriptionAr: 'ريش غنم فاخرة بإكليل الجبل والثوم', price: 220, prepTime: '25 دقيقة', category: 'مشويات', categoryAr: 'مشويات', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Grilled Chicken Quarter', titleAr: 'ربع فرخة مشوية', description: 'Whole quarter chicken marinated overnight', descriptionAr: 'ربع فرخة كاملة متبل من الليل', price: 95, prepTime: '25 دقيقة', category: 'مشويات', categoryAr: 'مشويات', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Shish Tawook', titleAr: 'شيش طاووق', description: 'Turkish-style marinated chicken breast skewers', descriptionAr: 'أسياخ صدور فراخ متبلة على الطريقة التركية', price: 115, prepTime: '20 دقيقة', category: 'مشويات', categoryAr: 'مشويات', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Swordfish Steak', titleAr: 'ستيك سمك سيف', description: 'Grilled swordfish with lemon butter sauce', descriptionAr: 'سمك سيف مشوي بصوص الليمون والزبدة', price: 180, prepTime: '20 دقيقة', category: 'مشويات', categoryAr: 'مشويات', preparationArea: 'KITCHEN', isActive: true },

    // ═══ طواجن ═══
    { title: 'Chicken Tajine', titleAr: 'طاجن فراخ', description: 'Traditional Egyptian chicken tajine with potatoes and tomato sauce', descriptionAr: 'طاجن فراخ مصري تقليدي بالبطاطس والصوص', price: 120, prepTime: '30 دقيقة', category: 'طواجن', categoryAr: 'طواجن', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Meat Tajine with Okra', titleAr: 'طاجن لحم بالبامية', description: 'Tender beef cubes with okra in rich tomato sauce', descriptionAr: 'لحم مكعبات بالبامية في صوص طماطم غني', price: 130, prepTime: '35 دقيقة', category: 'طواجن', categoryAr: 'طواجن', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Macaroni Bechamel', titleAr: 'مكرونة بشاميل', description: 'Creamy baked macaroni with minced meat and bechamel', descriptionAr: 'مكرونة بالفرن مع اللحمة المفرومة والبشاميل', price: 85, prepTime: '25 دقيقة', category: 'طواجن', categoryAr: 'طواجن', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Stuffed Peppers', titleAr: 'فلفل محشي', description: 'Bell peppers stuffed with rice and minced meat', descriptionAr: 'فلفل محشي بالأرز واللحمة المفرومة', price: 90, prepTime: '30 دقيقة', category: 'طواجن', categoryAr: 'طواجن', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Moussaka', titleAr: 'مسقعة', description: 'Eggplant casserole with meat sauce and bechamel', descriptionAr: 'مسقعة باذنجان باللحمة والبشاميل', price: 80, prepTime: '25 دقيقة', category: 'طواجن', categoryAr: 'طواجن', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Meat Tagine with Prunes', titleAr: 'طاجن لحم بالبرقوق', description: 'Moroccan-style lamb with prunes and almonds', descriptionAr: 'لحم على الطريقة المغربية بالبرقوق واللوز', price: 150, prepTime: '35 دقيقة', category: 'طواجن', categoryAr: 'طواجن', preparationArea: 'KITCHEN', isActive: true },

    // ═══ أطباق رئيسية ═══
    { title: 'Saraya Special Mandi', titleAr: 'مندي سرايا الخاص', description: 'Slow-cooked lamb with fragrant basmati rice and spicy sauce', descriptionAr: 'لحم مطهو ببطء مع أرز بسمتي عطري وصوص حار', price: 320, prepTime: '45 دقيقة', category: 'أطباق رئيسية', categoryAr: 'أطباق رئيسية', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Mansaf', titleAr: 'منسف', description: 'Traditional lamb mansaf with rice and jameed sauce', descriptionAr: 'منسف لحم تقليدي بالأرز والجميد', price: 200, prepTime: '40 دقيقة', category: 'أطباق رئيسية', categoryAr: 'أطباق رئيسية', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Koshari', titleAr: 'كشري', description: 'Egyptian classic with rice, lentils, pasta and special sauce', descriptionAr: 'الكشري المصري بالأرز والعدس والمكرونة والصوص الخاص', price: 55, prepTime: '15 دقيقة', category: 'أطباق رئيسية', categoryAr: 'أطباق رئيسية', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Grilled Fish with Rice', titleAr: 'سمك مشوي بالأرز', description: 'Fresh grilled sea bass with saffron rice', descriptionAr: 'سمك باس مشوي طازج بأرز بالزعفران', price: 185, prepTime: '25 دقيقة', category: 'أطباق رئيسية', categoryAr: 'أطباق رئيسية', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Chicken Mulukhiyah', titleAr: 'ملوخية فراخ', description: 'Egyptian mulukhiyah with rabbit or chicken and rice', descriptionAr: 'ملوخية مصرية بالفراخ والأرز', price: 110, prepTime: '25 دقيقة', category: 'أطباق رئيسية', categoryAr: 'أطباق رئيسية', preparationArea: 'KITCHEN', isActive: true },
    { title: "Rozz Me'ammar", titleAr: 'رز معمر', description: 'Baked rice with cream and chicken in clay pot', descriptionAr: 'أرز بالفرن بالقشطة والفراخ في طاجن فخار', price: 100, prepTime: '30 دقيقة', category: 'أطباق رئيسية', categoryAr: 'أطباق رئيسية', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Hawawshi', titleAr: 'حواوشي', description: 'Egyptian-style meat-stuffed bread baked in oven', descriptionAr: 'عيش محشي باللحمة المفرومة بالفرن', price: 75, prepTime: '20 دقيقة', category: 'أطباق رئيسية', categoryAr: 'أطباق رئيسية', preparationArea: 'KITCHEN', isActive: true },

    // ═══ ساندويتشات ═══
    { title: 'Chicken Shawarma Wrap', titleAr: 'راب شاورما فراخ', description: 'Tender chicken shawarma with garlic sauce in Arabic bread', descriptionAr: 'شاورما فراخ طري بالتومية في عيش عربي', price: 75, prepTime: '15 دقيقة', category: 'ساندويتشات', categoryAr: 'ساندويتشات', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Meat Shawarma Wrap', titleAr: 'راب شاورما لحمة', description: 'Juicy meat shawarma with tahini and pickles', descriptionAr: 'شاورما لحمة بالطحينة والمخلل', price: 85, prepTime: '15 دقيقة', category: 'ساندويتشات', categoryAr: 'ساندويتشات', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Club Sandwich', titleAr: 'كلوب ساندويتش', description: 'Triple-decker with chicken, bacon, lettuce and mayo', descriptionAr: 'ساندويتش ثلاثي بالفراخ والخس والمايونيز', price: 90, prepTime: '15 دقيقة', category: 'ساندويتشات', categoryAr: 'ساندويتشات', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Falafel Sandwich', titleAr: 'ساندويتش فلافل', description: 'Crispy falafel with tahini and fresh vegetables', descriptionAr: 'فلافل مقرمشة بالطحينة والخضار الطازجة', price: 40, prepTime: '10 دقيقة', category: 'ساندويتشات', categoryAr: 'ساندويتشات', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Foul Sandwich', titleAr: 'ساندويتش فول', description: 'Traditional Egyptian fava beans with tahini and cumin', descriptionAr: 'فول مدمس بالطحينة والكمون', price: 30, prepTime: '5 دقيقة', category: 'ساندويتشات', categoryAr: 'ساندويتشات', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Burger Saraya', titleAr: 'برجر سرايا', description: 'Angus beef patty with cheddar, caramelized onions and special sauce', descriptionAr: 'برجر لحم أنجوس بالشيدر والبصل المكرمل والصوص الخاص', price: 110, prepTime: '15 دقيقة', category: 'ساندويتشات', categoryAr: 'ساندويتشات', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Grilled Cheese Panini', titleAr: 'باني ني جبنة مشوية', description: 'Three-cheese panini with mozzarella, cheddar and gouda', descriptionAr: 'باني ني بثلاث أنواع جبنة: موزاريلا وشيدر وجودة', price: 65, prepTime: '10 دقيقة', category: 'ساندويتشات', categoryAr: 'ساندويتشات', preparationArea: 'KITCHEN', isActive: true },

    // ═══ مقبلات ═══
    { title: 'Hummus', titleAr: 'حمص', description: 'Creamy chickpea dip with tahini and olive oil', descriptionAr: 'حمص كريمي بالطحينة وزيت الزيتون', price: 45, prepTime: '5 دقيقة', category: 'مقبلات', categoryAr: 'مقبلات', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Mutabal', titleAr: 'متبل', description: 'Smoky eggplant dip with tahini and pomegranate', descriptionAr: 'متبل باذنجان مدخن بالطحينة والرمان', price: 45, prepTime: '5 دقيقة', category: 'مقبلات', categoryAr: 'مقبلات', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Falafel Plate', titleAr: 'طبق فلافل', description: 'Crispy falafel with tahini sauce', descriptionAr: 'فلافل مقرمشة بصوص الطحينة', price: 55, prepTime: '10 دقيقة', category: 'مقبلات', categoryAr: 'مقبلات', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Mix Appetizer Platter', titleAr: 'طبق مقبلات مشكل', description: 'Selection of hummus, mutabal, tabbouleh, and vine leaves', descriptionAr: 'تشكيلة من الحمص والمتبل والتبولة وورق العنب', price: 150, prepTime: '15 دقيقة', category: 'مقبلات', categoryAr: 'مقبلات', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Vine Leaves', titleAr: 'ورق عنب', description: 'Stuffed grape leaves with rice and herbs', descriptionAr: 'ورق عنب محشي بالأرز والأعشاب', price: 60, prepTime: '10 دقيقة', category: 'مقبلات', categoryAr: 'مقبلات', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Sambousek', titleAr: 'سمبوسك', description: 'Crispy pastries filled with minced meat or cheese', descriptionAr: 'فطائر مقرمشة محشية باللحمة أو الجبنة', price: 50, prepTime: '10 دقيقة', category: 'مقبلات', categoryAr: 'مقبلات', preparationArea: 'KITCHEN', isActive: true },
    { title: 'French Fries', titleAr: 'بطاطس محمرة', description: 'Crispy golden fries with ketchup and mayo', descriptionAr: 'بطاطس مقرمشة ذهبية بالكاتشب والمايو', price: 40, prepTime: '10 دقيقة', category: 'مقبلات', categoryAr: 'مقبلات', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Garlic Dip', titleAr: 'تومية', description: 'Creamy garlic sauce - a must with grills', descriptionAr: 'صوص التومية الكريمي - لازم مع المشويات', price: 25, prepTime: '3 دقيقة', category: 'مقبلات', categoryAr: 'مقبلات', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Pickles Plate', titleAr: 'طبق مخلل', description: 'Assorted Egyptian pickles', descriptionAr: 'تشكيلة مخللات مصرية', price: 25, prepTime: '3 دقيقة', category: 'مقبلات', categoryAr: 'مقبلات', preparationArea: 'KITCHEN', isActive: true },

    // ═══ سلطات ═══
    { title: 'Tabbouleh', titleAr: 'تبولة', description: 'Fresh parsley and bulgur salad with lemon dressing', descriptionAr: 'سلطة بقدونس وبرغل طازجة بالليمون', price: 40, prepTime: '10 دقيقة', category: 'سلطات', categoryAr: 'سلطات', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Fattoush', titleAr: 'فتوش', description: 'Mixed vegetables with toasted bread and sumac dressing', descriptionAr: 'خضار مشكلة بالعيش المحمص والسماق', price: 40, prepTime: '10 دقيقة', category: 'سلطات', categoryAr: 'سلطات', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Caesar Salad', titleAr: 'سلطة سيزر', description: 'Romaine lettuce with parmesan, croutons and caesar dressing', descriptionAr: 'خس رومين بالبارميزان والكروتون وصوص سيزر', price: 60, prepTime: '10 دقيقة', category: 'سلطات', categoryAr: 'سلطات', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Green Salad', titleAr: 'سلطة خضراء', description: 'Fresh mixed greens with olive oil and lemon', descriptionAr: 'خضار ورقية طازجة بزيت الزيتون والليمون', price: 30, prepTime: '5 دقيقة', category: 'سلطات', categoryAr: 'سلطات', preparationArea: 'KITCHEN', isActive: true },

    // ═══ حساء ═══
    { title: 'Lentil Soup', titleAr: 'شوربة عدس', description: 'Creamy red lentil soup with lemon and croutons', descriptionAr: 'شوربة عدس بسيطة بالليمون والكروتون', price: 35, prepTime: '10 دقيقة', category: 'حساء', categoryAr: 'حساء', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Chicken Soup', titleAr: 'شوربة فراخ', description: 'Comforting chicken broth with vegetables', descriptionAr: 'شوربة فراخ دافئة بالخضار', price: 40, prepTime: '10 دقيقة', category: 'حساء', categoryAr: 'حساء', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Cream of Mushroom', titleAr: 'شوربة مشروم', description: 'Rich and creamy mushroom soup', descriptionAr: 'شوربة مشروم كريمية غنية', price: 45, prepTime: '10 دقيقة', category: 'حساء', categoryAr: 'حساء', preparationArea: 'KITCHEN', isActive: true },

    // ═══ حلويات ═══
    { title: 'Kunafa', titleAr: 'كنافة', description: 'Traditional sweet cheese kunafa with sugar syrup', descriptionAr: 'كنافة بالجبنة التقليدية بالشربت', price: 65, prepTime: '15 دقيقة', category: 'حلويات', categoryAr: 'حلويات', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Um Ali', titleAr: 'أم علي', description: 'Egyptian bread pudding with cream, nuts and raisins', descriptionAr: 'أم علي بالقشطة والمكسرات والزبيب', price: 55, prepTime: '15 دقيقة', category: 'حلويات', categoryAr: 'حلويات', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Basbousa', titleAr: 'بسبوسة', description: 'Sweet semolina cake with coconut and syrup', descriptionAr: 'بسبوسة بجوز الهند والشربت', price: 35, prepTime: '10 دقيقة', category: 'حلويات', categoryAr: 'حلويات', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Rice Pudding', titleAr: 'أرز باللبن', description: 'Creamy rice pudding with cinnamon and vanilla', descriptionAr: 'أرز باللبن كريمي بالقرفة والفانيليا', price: 30, prepTime: '10 دقيقة', category: 'حلويات', categoryAr: 'حلويات', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Baklava', titleAr: 'بقلاوة', description: 'Layers of phyllo with pistachios and honey syrup', descriptionAr: 'طبقات عجين بالفستق وشربت العسل', price: 50, prepTime: '10 دقيقة', category: 'حلويات', categoryAr: 'حلويات', preparationArea: 'KITCHEN', isActive: true },
    { title: 'Chocolate Lava Cake', titleAr: 'كيك الشوكولاتة السايحة', description: 'Warm chocolate cake with molten center and vanilla ice cream', descriptionAr: 'كيك شوكولاتة دافئ بالم_center السايح وآيس كريم فانيليا', price: 75, prepTime: '15 دقيقة', category: 'حلويات', categoryAr: 'حلويات', preparationArea: 'KITCHEN', isActive: true },

    // ═══ مشروبات ساخنة ═══
    { title: 'Turkish Coffee', titleAr: 'قهوة تركية', description: 'Traditional Turkish coffee with cardamom', descriptionAr: 'قهوة تركية تقليدية بالهيل', price: 25, prepTime: '5 دقيقة', category: 'مشروبات ساخنة', categoryAr: 'مشروبات ساخنة', preparationArea: 'BARISTA', isActive: true },
    { title: 'Espresso', titleAr: 'إسبريسو', description: 'Double shot espresso', descriptionAr: 'إسبريسو دبل شوت', price: 30, prepTime: '3 دقيقة', category: 'مشروبات ساخنة', categoryAr: 'مشروبات ساخنة', preparationArea: 'BARISTA', isActive: true },
    { title: 'Cappuccino', titleAr: 'كابتشينو', description: 'Rich espresso with steamed milk foam', descriptionAr: 'إسبريسو غني برغوة الحليب', price: 40, prepTime: '5 دقيقة', category: 'مشروبات ساخنة', categoryAr: 'مشروبات ساخنة', preparationArea: 'BARISTA', isActive: true },
    { title: 'Latte', titleAr: 'لاتيه', description: 'Smooth espresso with steamed milk', descriptionAr: 'إسبريسو ناعم بالحليب المبخر', price: 45, prepTime: '5 دقيقة', category: 'مشروبات ساخنة', categoryAr: 'مشروبات ساخنة', preparationArea: 'BARISTA', isActive: true },
    { title: 'Hot Chocolate', titleAr: 'شوكولاتة ساخنة', description: 'Rich Belgian chocolate with marshmallows', descriptionAr: 'شوكولاتة بلجيكية غنية بالمارشميلو', price: 45, prepTime: '5 دقيقة', category: 'مشروبات ساخنة', categoryAr: 'مشروبات ساخنة', preparationArea: 'BARISTA', isActive: true },
    { title: 'Tea', titleAr: 'شاي', description: 'Egyptian tea with mint', descriptionAr: 'شاي مصري بالنعناع', price: 15, prepTime: '3 دقيقة', category: 'مشروبات ساخنة', categoryAr: 'مشروبات ساخنة', preparationArea: 'BARISTA', isActive: true },
    { title: 'Sahlab', titleAr: 'سحلب', description: 'Warm creamy milk drink with cinnamon and coconut', descriptionAr: 'مشروب حليب دافئ كريمي بالقرفة وجوز الهند', price: 30, prepTime: '5 دقيقة', category: 'مشروبات ساخنة', categoryAr: 'مشروبات ساخنة', preparationArea: 'BARISTA', isActive: true },
    { title: 'Herbal Tea', titleAr: 'يانسون', description: 'Anise seed tea - soothing and warm', descriptionAr: 'شاي يانسون دافئ ومهدئ', price: 15, prepTime: '5 دقيقة', category: 'مشروبات ساخنة', categoryAr: 'مشروبات ساخنة', preparationArea: 'BARISTA', isActive: true },

    // ═══ مشروبات باردة ═══
    { title: 'Fresh Orange Juice', titleAr: 'عصير برتقان طازج', description: 'Freshly squeezed orange juice', descriptionAr: 'عصير برتقان طازج معصور', price: 30, prepTime: '5 دقيقة', category: 'مشروبات باردة', categoryAr: 'مشروبات باردة', preparationArea: 'BARISTA', isActive: true },
    { title: 'Lemon with Mint', titleAr: 'ليمون بالنعناع', description: 'Fresh lemon juice with mint and ice', descriptionAr: 'عصير ليمون طازج بالنعناع والثلج', price: 25, prepTime: '5 دقيقة', category: 'مشروبات باردة', categoryAr: 'مشروبات باردة', preparationArea: 'BARISTA', isActive: true },
    { title: 'Mango Juice', titleAr: 'عصير مانجو', description: 'Sweet Egyptian mango juice', descriptionAr: 'عصير مانجو مصري حلو', price: 30, prepTime: '5 دقيقة', category: 'مشروبات باردة', categoryAr: 'مشروبات باردة', preparationArea: 'BARISTA', isActive: true },
    { title: 'Strawberry Smoothie', titleAr: 'سموذي فراولة', description: 'Blended strawberries with yogurt and honey', descriptionAr: 'فراولة مخلوطة بالزبادي والعسل', price: 40, prepTime: '5 دقيقة', category: 'مشروبات باردة', categoryAr: 'مشروبات باردة', preparationArea: 'BARISTA', isActive: true },
    { title: 'Iced Latte', titleAr: 'آيس لاتيه', description: 'Cold espresso with milk over ice', descriptionAr: 'إسبريسو بارد بالحليب على الثلج', price: 45, prepTime: '5 دقيقة', category: 'مشروبات باردة', categoryAr: 'مشروبات باردة', preparationArea: 'BARISTA', isActive: true },
    { title: 'Coca Cola', titleAr: 'كوكاكولا', description: 'Cold Coca Cola can', descriptionAr: 'كان كوكاكولا باردة', price: 15, prepTime: '1 دقيقة', category: 'مشروبات باردة', categoryAr: 'مشروبات باردة', preparationArea: 'BARISTA', isActive: true },
    { title: 'Sprite', titleAr: 'سبرايت', description: 'Cold Sprite can', descriptionAr: 'كان سبرايت باردة', price: 15, prepTime: '1 دقيقة', category: 'مشروبات باردة', categoryAr: 'مشروبات باردة', preparationArea: 'BARISTA', isActive: true },
    { title: 'Water', titleAr: 'مياه', description: 'Mineral water bottle', descriptionAr: 'زجاجة مياه معدنية', price: 10, prepTime: '1 دقيقة', category: 'مشروبات باردة', categoryAr: 'مشروبات باردة', preparationArea: 'BARISTA', isActive: true },
    { title: 'Hibiscus', titleAr: 'كركديه', description: 'Traditional Egyptian hibiscus drink - cold or hot', descriptionAr: 'مشروب الكركديه المصري التقليدي', price: 20, prepTime: '3 دقيقة', category: 'مشروبات باردة', categoryAr: 'مشروبات باردة', preparationArea: 'BARISTA', isActive: true },
    { title: 'Tamarind', titleAr: 'تمر هندي', description: 'Sweet and tangy tamarind drink', descriptionAr: 'مشروب التمر الهندي الحلو والمنعش', price: 20, prepTime: '3 دقيقة', category: 'مشروبات باردة', categoryAr: 'مشروبات باردة', preparationArea: 'BARISTA', isActive: true },
    { title: 'Sobia', titleAr: 'سوبيا', description: 'Coconut and rice drink - Ramadan special', descriptionAr: 'مشروب جوز الهند بالأرز - رمضاني', price: 20, prepTime: '3 دقيقة', category: 'مشروبات باردة', categoryAr: 'مشروبات باردة', preparationArea: 'BARISTA', isActive: true },
  ]

  // Create all meals
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

  // ─── 5. Add-ons for various meals ──────────────────────────
  // Get some meals to attach add-ons to
  const allMeals = await prisma.meal.findMany()
  const grillsMeals = allMeals.filter(m => m.category === 'مشويات')
  const sandwichMeals = allMeals.filter(m => m.category === 'ساندويتشات')
  const mainMeals = allMeals.filter(m => m.category === 'أطباق رئيسية')
  const beverageMeals = allMeals.filter(m => m.category === 'مشروبات ساخنة' || m.category === 'مشروبات باردة')

  const addOnDefinitions = [
    // مشويات إضافات
    { title: 'Extra Rice', titleAr: 'أرز زيادة', price: 20, mealFilter: grillsMeals },
    { title: 'Garlic Dip', titleAr: 'تومية', price: 15, mealFilter: grillsMeals },
    { title: 'Grilled Tomato', titleAr: 'طماطم مشوية', price: 10, mealFilter: grillsMeals },
    { title: 'Extra Spicy', titleAr: 'حار زيادة', price: 5, mealFilter: grillsMeals },
    // ساندويتشات إضافات
    { title: 'Extra Cheese', titleAr: 'جبنة زيادة', price: 20, mealFilter: sandwichMeals },
    { title: 'French Fries Side', titleAr: 'بطاطس جانبية', price: 40, mealFilter: sandwichMeals },
    { title: 'Spicy Sauce', titleAr: 'صوص حار', price: 10, mealFilter: sandwichMeals },
    // أطباق رئيسية
    { title: 'Extra Bread', titleAr: 'عيش زيادة', price: 10, mealFilter: mainMeals },
    { title: 'Extra Sauce', titleAr: 'صوص زيادة', price: 10, mealFilter: mainMeals },
    // مشروبات
    { title: 'Whipped Cream', titleAr: 'كريمة', price: 10, mealFilter: beverageMeals },
    { title: 'Extra Shot', titleAr: 'شوت زيادة', price: 15, mealFilter: beverageMeals.filter(m => m.category === 'مشروبات ساخنة') },
  ]

  let addOnCount = 0
  for (const addOnDef of addOnDefinitions) {
    for (const meal of addOnDef.mealFilter) {
      const existing = await prisma.addOn.findFirst({
        where: { titleAr: addOnDef.titleAr, mealId: meal.id },
      })
      if (!existing) {
        await prisma.addOn.create({
          data: {
            title: addOnDef.title,
            titleAr: addOnDef.titleAr,
            price: addOnDef.price,
            mealId: meal.id,
          },
        })
        addOnCount++
      }
    }
  }
  console.log(`✅ Add-ons created: ${addOnCount}`)

  // ─── 6. Promotions ─────────────────────────────────────────
  const promotions = [
    {
      title: 'Family Grill Feast',
      titleAr: 'وليمة المشويات العائلية',
      description: 'Mixed grill platter + 4 drinks + 2 appetizers at a special price! Save 20%',
      descriptionAr: 'مشويات مشكلة + ٤ مشروبات + ٢ مقبلات بسعر خاص! وفّر ٢٠٪',
      bannerImageUrl: 'https://res.cloudinary.com/dfcvxkbij/image/upload/v1780647723/saraya/qsok701nowz',
      price: 380,
      oldPrice: 470,
      discount: 20,
      buttonText: 'Order Now',
      buttonTextAr: 'اطلب دلوقتي',
      buttonLink: '',
      isActive: true,
    },
    {
      title: 'Summer Drinks BOGO',
      titleAr: 'مشروبات الصيف - اشتري واحصل على الثاني مجاناً',
      description: 'Buy any cold drink and get another one free! Limited time offer',
      descriptionAr: 'اشتري أي مشروب بارد واحصل على التاني مجاناً! عرض لفترة محدودة',
      bannerImageUrl: 'https://res.cloudinary.com/dfcvxkbij/image/upload/v1780647127/saraya/q9dphtgn676',
      price: 30,
      oldPrice: 60,
      discount: 50,
      buttonText: 'Order Now',
      buttonTextAr: 'اطلب دلوقتي',
      buttonLink: '',
      isActive: true,
    },
    {
      title: 'Lunch Deal',
      titleAr: 'عرض الغداء',
      description: 'Any main course + soup + drink for only 120 EGP instead of 165 EGP',
      descriptionAr: 'أي طبق رئيسي + حساء + مشروب بـ ١٢٠ ج.م بدل ١٦٥ ج.م',
      bannerImageUrl: 'https://res.cloudinary.com/dfcvxkbij/image/upload/v1780647723/saraya/qsok701nowz',
      price: 120,
      oldPrice: 165,
      discount: 27,
      buttonText: 'Order Now',
      buttonTextAr: 'اطلب دلوقتي',
      buttonLink: '',
      isActive: true,
    },
    {
      title: 'Kunafa & Coffee',
      titleAr: 'كنافة وقهوة',
      description: 'Traditional kunafa with Turkish coffee - the perfect combo for 70 EGP',
      descriptionAr: 'كنافة تقليدية مع قهوة تركية - الثنائي المثالي بـ ٧٠ ج.م',
      bannerImageUrl: 'https://res.cloudinary.com/dfcvxkbij/image/upload/v1780647127/saraya/q9dphtgn676',
      price: 70,
      oldPrice: 90,
      discount: 22,
      buttonText: 'Order Now',
      buttonTextAr: 'اطلب دلوقتي',
      buttonLink: '',
      isActive: true,
    },
  ]

  for (const promo of promotions) {
    const existing = await prisma.promotion.findFirst({
      where: { titleAr: promo.titleAr },
    })
    if (!existing) {
      await prisma.promotion.create({ data: promo })
      console.log(`✅ Promotion: ${promo.titleAr}`)
    } else {
      console.log(`⏭️  Promotion exists: ${promo.titleAr}`)
    }
  }

  // ─── 7. Store Settings ────────────────────────────────────
  await prisma.storeSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      takingOrders: true,
      message: 'المطعم مغلق حالياً، لا يمكن استقبال الطلبات',
    },
  })
  console.log('✅ Store Settings')

  console.log('\n' + '='.repeat(40))
  console.log('🎉 Seeding completed successfully!')
  console.log('📧 Admin: admin / admin123')
  console.log('👨‍🍳 Waiter: waiter1 / waiter123')
  console.log('💰 Cashier: cashier1 / cashier123')
  console.log('🔥 Kitchen: kitchen1 / kitchen123')
  console.log('☕ Barista: barista1 / barista123')
  console.log('='.repeat(40))
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

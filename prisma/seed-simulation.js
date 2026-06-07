/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// ─── Helper: random int between min and max ─────────────────────────
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// ─── Helper: pick random element from array ─────────────────────────
function pick(arr) {
  return arr[rand(0, arr.length - 1)]
}

// ─── Helper: generate table code ────────────────────────────────────
function makeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => pick(chars)).join('')
}

// ─── Helper: create a Date for a specific hour on simulation day ────
function simTime(hour, minute = 0, second = 0) {
  const d = new Date('2026-06-06T00:00:00.000Z') // Saturday, peak day
  d.setHours(hour, minute, second, rand(0, 999))
  return d
}

// ─── Menu data ──────────────────────────────────────────────────────
const MEALS_DATA = [
  // مشويات
  { title: 'Mixed Grill Platter',     titleAr: 'مشويات مشكلة',      price: 250, category: 'مشويات',     prep: '25 دقيقة', area: 'KITCHEN' },
  { title: 'Lamb Kofta',              titleAr: 'كفتة لحم',           price: 120, category: 'مشويات',     prep: '20 دقيقة', area: 'KITCHEN' },
  { title: 'Shish Tawook',            titleAr: 'شيش طاووق',          price: 135, category: 'مشويات',     prep: '20 دقيقة', area: 'KITCHEN' },
  { title: 'Lamb Chops (Rack)',       titleAr: 'ريش غنم',            price: 280, category: 'مشويات',     prep: '25 دقيقة', area: 'KITCHEN' },
  // ساندويتشات
  { title: 'Chicken Shawarma',        titleAr: 'شاورما فراخ',        price: 75,  category: 'ساندويتشات', prep: '15 دقيقة', area: 'KITCHEN' },
  { title: 'Meat Shawarma',           titleAr: 'شاورما لحم',         price: 85,  category: 'ساندويتشات', prep: '15 دقيقة', area: 'KITCHEN' },
  { title: 'Grilled Chicken Burger',  titleAr: 'برجر دجاج مشوي',     price: 95,  category: 'ساندويتشات', prep: '15 دقيقة', area: 'KITCHEN' },
  // مقبلات
  { title: 'Hummus',                  titleAr: 'حمص',                price: 45,  category: 'مقبلات',     prep: '5 دقيقة',  area: 'KITCHEN' },
  { title: 'Mutabal',                 titleAr: 'متبل',               price: 50,  category: 'مقبلات',     prep: '5 دقيقة',  area: 'KITCHEN' },
  { title: 'Falafel Plate',           titleAr: 'طبق فلافل',          price: 55,  category: 'مقبلات',     prep: '10 دقيقة', area: 'KITCHEN' },
  { title: 'Mix Appetizer Platter',   titleAr: 'طبق مقبلات مشكل',    price: 150, category: 'مقبلات',     prep: '15 دقيقة', area: 'KITCHEN' },
  { title: 'Warak Enab',              titleAr: 'ورق عنب',            price: 60,  category: 'مقبلات',     prep: '10 دقيقة', area: 'KITCHEN' },
  // أطباق رئيسية
  { title: 'Mansaf',                  titleAr: 'منسف',               price: 180, category: 'أطباق رئيسية', prep: '30 دقيقة', area: 'KITCHEN' },
  { title: 'Maklouba',                titleAr: 'مقلوبة',             price: 160, category: 'أطباق رئيسية', prep: '30 دقيقة', area: 'KITCHEN' },
  { title: 'Mandi Rice with Chicken', titleAr: 'مندي دجاج',           price: 140, category: 'أطباق رئيسية', prep: '30 دقيقة', area: 'KITCHEN' },
  { title: 'Saraya Special Mandi',    titleAr: 'مندي سرايا الخاص',    price: 320, category: 'أطباق رئيسية', prep: '45 دقيقة', area: 'KITCHEN' },
  // حلويات
  { title: 'Kunafa',                  titleAr: 'كنافة',              price: 65,  category: 'حلويات',     prep: '15 دقيقة', area: 'KITCHEN' },
  { title: 'Om Ali',                  titleAr: 'أم علي',             price: 55,  category: 'حلويات',     prep: '15 دقيقة', area: 'KITCHEN' },
  { title: 'Baklava',                 titleAr: 'بقلاوة',             price: 70,  category: 'حلويات',     prep: '10 دقيقة', area: 'KITCHEN' },
  { title: 'Rice Pudding',            titleAr: 'أرز بلبن',           price: 40,  category: 'حلويات',     prep: '10 دقيقة', area: 'KITCHEN' },
  // مشروبات — بار
  { title: 'Fresh Orange Juice',      titleAr: 'عصير برتقال طازج',   price: 35,  category: 'مشروبات',    prep: '5 دقيقة',  area: 'BARISTA' },
  { title: 'Fresh Lemon Mint',        titleAr: 'ليمون بالنعناع',     price: 30,  category: 'مشروبات',    prep: '5 دقيقة',  area: 'BARISTA' },
  { title: 'Turkish Coffee',          titleAr: 'قهوة تركية',         price: 25,  category: 'مشروبات',    prep: '5 دقيقة',  area: 'BARISTA' },
  { title: 'Soft Drink',              titleAr: 'مشروب غازي',         price: 15,  category: 'مشروبات',    prep: '2 دقيقة',  area: 'BARISTA' },
  { title: 'Milk Shake',              titleAr: 'ميلك شيك',           price: 50,  category: 'مشروبات',    prep: '8 دقيقة',  area: 'BARISTA' },
  { title: 'Hot Tea',                 titleAr: 'شاي ساخن',           price: 15,  category: 'مشروبات',    prep: '3 دقيقة',  area: 'BARISTA' },
]

const ADDONS_DATA = [
  { title: 'Extra Cheese',  titleAr: 'جبنة زيادة',  price: 20 },
  { title: 'Spicy Sauce',   titleAr: 'صوص حار',     price: 10 },
  { title: 'Garlic Dip',    titleAr: 'تومية',        price: 15 },
  { title: 'French Fries',  titleAr: 'بطاطس محمرة',  price: 40 },
  { title: 'Extra Meat',    titleAr: 'لحم زيادة',    price: 50 },
  { title: 'Extra Chicken', titleAr: 'دجاج زيادة',   price: 35 },
  { title: 'Extra Rice',    titleAr: 'أرز زيادة',    price: 20 },
]

const STAFF_DATA = [
  { username: 'admin',   password: 'saraya2024', role: 'ADMIN' },
  { username: 'waiter1', password: 'waiter123',  role: 'WAITER' },
  { username: 'waiter2', password: 'waiter123',  role: 'WAITER' },
  { username: 'waiter3', password: 'waiter123',  role: 'WAITER' },
  { username: 'cashier1',password: 'cashier123', role: 'CASHIER' },
  { username: 'cashier2',password: 'cashier123', role: 'CASHIER' },
  { username: 'kitchen1',password: 'kitchen123', role: 'KITCHEN' },
  { username: 'kitchen2',password: 'kitchen123', role: 'KITCHEN' },
  { username: 'barista1',password: 'barista123', role: 'BARISTA' },
]

const EXPENSE_CATEGORIES = ['مواد خام', 'رواتب', 'إيجار', 'صيانة', 'كهرباء ومياه', 'أخرى']

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=' .repeat(50))
  console.log('  محاكاة يوم عمل كامل - مطعم سرايا العرب')
  console.log('=' .repeat(50))

  // ─── 1. إعداد الموظفين ────────────────────────────────────────────────
  console.log('\n--- الموظفين ---')
  const staff = {}
  for (const s of STAFF_DATA) {
    const created = await prisma.admin.upsert({
      where: { username: s.username },
      update: { isActive: true },
      create: { username: s.username, password: s.password, role: s.role },
    })
    staff[s.username] = created
    console.log(`  ${s.role}: ${s.username}`)
  }

  // ─── 2. إعداد التصنيفات ────────────────────────────────────────────────
  console.log('\n--- التصنيفات ---')
  const catNames = ['مشويات', 'مقبلات', 'ساندويتشات', 'حلويات', 'مشروبات', 'أطباق رئيسية']
  for (const name of catNames) {
    await prisma.category.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, sortOrder: catNames.indexOf(name) },
    })
    console.log(`  تصنيف: ${name}`)
  }

  // ─── 3. إعداد الوجبات + الإضافات ──────────────────────────────────────
  console.log('\n--- قائمة الطعام ---')
  const meals = {}
  for (const m of MEALS_DATA) {
    // البحث بالاسم العربي
    let meal = await prisma.meal.findFirst({ where: { titleAr: m.titleAr } })
    if (!meal) {
      meal = await prisma.meal.create({
        data: {
          title: m.title, titleAr: m.titleAr, price: m.price,
          category: m.category, categoryAr: m.category,
          prepTime: m.prep, preparationArea: m.area,
          description: '', descriptionAr: '',
          isActive: true,
        },
      })
      console.log(`  + ${m.titleAr} (${m.price} ج.م)`)
    } else {
      console.log(`  موجود: ${m.titleAr}`)
    }
    meals[m.titleAr] = meal

    // إضافة الإضافات لهذه الوجبة
    for (const a of ADDONS_DATA) {
      const exists = await prisma.addOn.findFirst({
        where: { mealId: meal.id, titleAr: a.titleAr },
      })
      if (!exists) {
        await prisma.addOn.create({
          data: { mealId: meal.id, title: a.title, titleAr: a.titleAr, price: a.price, isActive: true },
        })
      }
    }
  }

  const mealList = Object.values(meals)

  // ─── 4. إعداد الطاولات ────────────────────────────────────────────────
  console.log('\n--- الطاولات ---')
  const tables = []
  const areas = ['صالة رئيسية', 'VIP', 'تراس', 'صالة خاصة']
  for (let i = 1; i <= 20; i++) {
    const area = i <= 8 ? areas[0] : i <= 12 ? areas[1] : i <= 16 ? areas[2] : areas[3]
    const name = i <= 8 ? `طاولة ${i}` : i <= 12 ? `VIP ${i - 8}` : i <= 16 ? `تراس ${i - 16}` : `خاصة ${i - 20}`
    const table = await prisma.restaurantTable.upsert({
      where: { number: i },
      update: { isActive: true, area, name },
      create: { number: i, name, secretCode: makeCode(), seats: i % 2 === 0 ? 6 : 4, area, isActive: true },
    })
    tables.push(table)
  }
  console.log(`  ${tables.length} طاولة`)

  // ─── 5. عروض ──────────────────────────────────────────────────────────
  console.log('\n--- العروض ---')
  const promo1 = await prisma.promotion.upsert({
    where: { id: 'sim-promo-family' },
    update: { isActive: true },
    create: {
      id: 'sim-promo-family',
      title: 'Family Offer', titleAr: 'عرض العائلة',
      description: 'Get 20% off on orders above 600 EGP',
      descriptionAr: 'خصم ٢٠٪ على الطلبات فوق ٦٠٠ جنيه',
      bannerImageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
      price: 0, oldPrice: 0, discount: 20,
      buttonTextAr: 'اطلب الآن', isActive: true,
    },
  })
  console.log('  عرض العائلة')

  // ─── 6. شيفت العمل ────────────────────────────────────────────────────
  console.log('\n--- شيفت العمل ---')

  // نلغي أي شيفت مفتوح حالي
  await prisma.shift.updateMany({
    where: { status: 'OPEN' },
    data: { status: 'CLOSED', endedAt: new Date(), endedBy: 'system' },
  })

  // الشيفت يبدأ الساعة 9 صباحاً
  const shiftStart = simTime(9, 0, 0)
  const shift = await prisma.shift.create({
    data: {
      status: 'OPEN',
      startedBy: 'admin',
      startedAt: shiftStart,
      notes: 'محاكاة يوم عمل كامل -高峰 (Peak Day)',
    },
  })
  console.log(`  بدأ الشيفت: ${shiftStart.toISOString()}`)

  // ─── 7. توليد الطلبات ─────────────────────────────────────────────────
  console.log('\n--- الطلبات ---')

  // نمط الذروة: 10-11 صباحاً + 13-15 ظهراً + 20-23 ليلاً
  // ساعات الذروة: 13-15 (الغداء), 20-23 (العشاء)
  // ساعات متوسطة: 10-12, 16-18
  // أوقات هادئة: 9, 19

  const PEAK_HOURS = [13, 14, 15, 20, 21, 22]
  const MID_HOURS  = [10, 11, 12, 16, 17, 18]
  const SLOW_HOURS = [9, 19]

  // نجمع كل ساعات اليوم
  const allHours = [...SLOW_HOURS, ...MID_HOURS, ...PEAK_HOURS].sort((a, b) => a - b)

  let totalOrders = 0
  let dineInCount = 0
  let takeawayCount = 0
  let deliveryCount = 0

  const statusFlow = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'READY_TO_PAY', 'DELIVERED']
  const customerNames = [
    'أحمد علي', 'محمد حسن', 'سارة خالد', 'نور إبراهيم', 'عمر يوسف',
    'ليلى محمود', 'خالد عبدالله', 'مريم سامي', 'يوسف كمال', 'هدى رشيد',
    'عبدالرحمن نور', 'دينا شريف', 'إبراهيم فتحي', 'رنا جمال', 'كريم سعيد',
    'حسن مرسي', 'أمل عادل', 'مصطفى كريم', 'شيماء طارق', 'علي أكرم',
    'ندى سامح', 'زياد لطفي', 'حليمة عمر', 'محمد صلاح', 'فاطمة الزهراء',
  ]
  const phones = [
    '01001112223', '01234567890', '01122334455', '01055667788', '01511223344',
    '01099887766', '01233445566', '01177889900', '01022334455', '01555667788',
    '01211223344', '01144556677', '01033445566', '01577889900', '01012345678',
  ]

  // لكل ساعة في اليوم، نحدد عدد الطلبات حسب الذروة
  for (const hour of allHours) {
    let numOrders
    if (PEAK_HOURS.includes(hour)) {
      numOrders = rand(10, 16)  // ذروة: 10-16 طلب في الساعة
    } else if (MID_HOURS.includes(hour)) {
      numOrders = rand(4, 8)    // متوسط: 4-8 طلبات
    } else {
      numOrders = rand(1, 3)    // هادئ: 1-3 طلبات
    }

    const minuteStep = Math.floor(60 / numOrders)

    for (let i = 0; i < numOrders; i++) {
      const minute = i * minuteStep + rand(0, minuteStep - 1)
      const orderTime = simTime(hour, Math.min(59, minute))

      // نوع الطلب
      const typeRoll = Math.random()
      let orderType
      if (typeRoll < 0.55) { orderType = 'DINE_IN'; dineInCount++ }
      else if (typeRoll < 0.80) { orderType = 'TAKEAWAY'; takeawayCount++ }
      else { orderType = 'DELIVERY'; deliveryCount++ }

      // اختيار العميل
      const customerIdx = rand(0, customerNames.length - 1)
      const customerName = customerNames[customerIdx]
      const customerPhone = phones[rand(0, phones.length - 1)]

      // اختيار الطاولة (لطلبات DINE_IN)
      const table = orderType === 'DINE_IN' ? pick(tables) : null

      // اختيار من 1-5 أصناف
      const numItems = rand(1, 6)
      const orderItems = []
      let subtotal = 0

      // نجيب الإضافات لكل وجبة
      const allAddons = await prisma.addOn.findMany({ where: { isActive: true } })
      const selectedMeals = []
      for (let j = 0; j < numItems; j++) {
        const meal = pick(mealList)
        selectedMeals.push(meal)
        const qty = rand(1, 3)
        const mealAddons = allAddons.filter(a => a.mealId === meal.id).slice(0, rand(0, 2))
        const addOnTotal = mealAddons.reduce((sum, a) => sum + a.price, 0)
        const itemTotal = (meal.price + addOnTotal) * qty
        subtotal += itemTotal

        orderItems.push({
          mealId: meal.id,
          mealTitle: meal.title,
          mealTitleAr: meal.titleAr,
          price: meal.price,
          quantity: qty,
          preparationArea: meal.preparationArea,
          category: meal.category,
          imageUrl: meal.imageUrl || '',
          addOns: JSON.stringify(mealAddons.map(a => ({ id: a.id, title: a.title, titleAr: a.titleAr, price: a.price }))),
        })
      }

      const serviceCharge = orderType === 'DINE_IN' ? Math.round(subtotal * 0.12 * 100) / 100 : 0
      const deliveryFee = orderType === 'DELIVERY' ? 25 : 0
      const total = subtotal + serviceCharge + deliveryFee

      // تحديد حالة الطلب بناءً على الوقت (الطلبات القديمة منجزة)
      const now = Date.now()
      const orderAge = now - orderTime.getTime()
      // الطلبات الأقدم من 3 ساعات تكون منجزة (DELIVERED) أو ملغية
      let status
      let kitchenStatus = 'PENDING'
      let baristaStatus = 'PENDING'
      let kitchenAccess = false

      if (orderAge > 3 * 60 * 60 * 1000) {
        // طلبات قديمة
        if (Math.random() < 0.92) {
          status = 'DELIVERED'
          kitchenStatus = 'DELIVERED'
          baristaStatus = 'DELIVERED'
          kitchenAccess = true
        } else {
          status = 'CANCELLED'
          kitchenStatus = 'CANCELLED'
          baristaStatus = 'CANCELLED'
          kitchenAccess = true
        }
      } else if (orderAge > 1.5 * 60 * 60 * 1000) {
        // قبل ساعة ونصف
        if (Math.random() < 0.5) {
          status = 'DELIVERED'
          kitchenStatus = 'DELIVERED'
          baristaStatus = 'DELIVERED'
          kitchenAccess = true
        } else {
          status = 'READY'
          kitchenStatus = 'READY'
          baristaStatus = 'READY'
          kitchenAccess = true
        }
      } else if (orderAge > 45 * 60 * 1000) {
        // قبل 45 دقيقة
        const r = Math.random()
        if (r < 0.3) { status = 'DELIVERED'; kitchenStatus = 'DELIVERED'; baristaStatus = 'DELIVERED'; kitchenAccess = true }
        else if (r < 0.6) { status = 'READY'; kitchenStatus = 'READY'; baristaStatus = 'READY'; kitchenAccess = true }
        else if (r < 0.85) { status = 'PREPARING'; kitchenStatus = 'PREPARING'; baristaStatus = 'PREPARING'; kitchenAccess = true }
        else { status = 'CONFIRMED'; kitchenStatus = 'CONFIRMED'; baristaStatus = 'CONFIRMED'; kitchenAccess = true }
      } else if (orderAge > 15 * 60 * 1000) {
        const r = Math.random()
        if (r < 0.3) { status = 'READY'; kitchenStatus = 'READY'; baristaStatus = 'READY'; kitchenAccess = true }
        else if (r < 0.6) { status = 'PREPARING'; kitchenStatus = 'PREPARING'; baristaStatus = 'PREPARING'; kitchenAccess = true }
        else { status = 'CONFIRMED'; kitchenStatus = 'CONFIRMED'; baristaStatus = 'CONFIRMED'; kitchenAccess = true }
      } else {
        // طلبات حديثة جداً
        if (Math.random() < 0.4) {
          status = 'PENDING'
          kitchenStatus = 'PENDING'
          baristaStatus = 'PENDING'
          kitchenAccess = false
        } else {
          status = 'CONFIRMED'
          kitchenStatus = 'CONFIRMED'
          baristaStatus = 'CONFIRMED'
          kitchenAccess = true
        }
      }

      // بعض الطلبات يتم إلغاؤها
      if (Math.random() < 0.03) {
        status = 'CANCELLED'
        kitchenStatus = 'CANCELLED'
        baristaStatus = 'CANCELLED'
        kitchenAccess = false
      }

      // للطلبات الداخلية: بعضها يكون READY_TO_PAY (بانتظار الدفع)
      if (orderType === 'DINE_IN' && status === 'DELIVERED' && Math.random() < 0.3) {
        status = 'READY_TO_PAY'
        kitchenStatus = 'READY'
        baristaStatus = 'READY'
        kitchenAccess = true
      }

      const hasKitchen = orderItems.some(i => i.preparationArea === 'KITCHEN')
      const hasBarista = orderItems.some(i => i.preparationArea === 'BARISTA')

      // إنشاء الطلب — نستخدم عداد متزايد لتجنب تعارض unique constraint
      const simOrderNumber = 2000 + totalOrders + 1
      try {
        const order = await prisma.order.create({
          data: {
            orderNumber: simOrderNumber,
            type: orderType,
            status,
            customerName,
            customerPhone,
            deliveryAddress: orderType === 'DELIVERY' ? `${customerName} - ${rand(1, 50)} شارع النصر، ${pick(['المهندسين', 'مدينة نصر', 'الزمالك', 'مصر الجديدة', 'المعادي'])}` : '',
            tableNumber: table ? String(table.number) : '',
            pickupTime: orderType === 'TAKEWAY' ? `${hour}:${String(minute + 20).padStart(2, '0')}` : '',
            subtotal,
            serviceCharge,
            deliveryFee,
            total,
            kitchenAccess,
            kitchenStatus: hasKitchen ? kitchenStatus : 'PENDING',
            baristaStatus: hasBarista ? baristaStatus : 'PENDING',
            notes: Math.random() < 0.2 ? pick(['بدون بصل', 'حار جداً', 'بدون ملح', 'صوص زيادة', 'استعجال من فضلك', '']) : '',
            shiftId: shift.id,
            createdAt: orderTime,
            updatedAt: status === 'DELIVERED' || status === 'CANCELLED'
              ? new Date(orderTime.getTime() + rand(30, 90) * 60 * 1000)
              : new Date(),
            items: { create: orderItems },
          },
        })
        totalOrders++
        if (totalOrders <= 5 || totalOrders % 20 === 0) {
          console.log(`  طلب #${order.id.slice(0, 6)}... | ${orderType} | ${status} | ${total.toFixed(0)} ج.م`)
        }
      } catch (err) {
        console.error(`  خطأ في الطلب #${totalOrders}: ${err?.code} - ${err?.message}`)
        if (err?.code === 'P2002') {
          totalOrders++
        }
      }
    }
  }

  // ─── 8. المصروفات ────────────────────────────────────────────────────
  console.log('\n--- المصروفات ---')
  const expenses = [
    { category: 'مواد خام', description: 'توريد خضروات وفواكه طازجة', amount: 1850 },
    { category: 'مواد خام', description: 'توريد لحوم ودواجن', amount: 4200 },
    { category: 'مواد خام', description: 'توريد بهارات وتوابل', amount: 320 },
    { category: 'مواد خام', description: 'مشروبات غازية وعصائر', amount: 520 },
    { category: 'صيانة', description: 'تصليح ثلاجة المطبخ', amount: 750 },
    { category: 'كهرباء ومياه', description: 'فاتورة كهرباء', amount: 1200 },
    { category: 'أخرى', description: 'منظفات ومستلزمات نظافة', amount: 280 },
    { category: 'أخرى', description: 'أكياس وعلب تغليف سفري', amount: 190 },
  ]

  let totalExpenses = 0
  for (const exp of expenses) {
    const expTime = simTime(rand(10, 14), rand(0, 59))
    await prisma.expense.create({
      data: {
        category: exp.category,
        description: exp.description,
        amount: exp.amount,
        shiftId: shift.id,
        createdBy: 'admin',
        createdAt: expTime,
      },
    })
    totalExpenses += exp.amount
    console.log(`  ${exp.description}: ${exp.amount} ج.م`)
  }

  // ─── 9. إجماليات الشيفت ──────────────────────────────────────────────
  const shiftOrders = await prisma.order.findMany({ where: { shiftId: shift.id } })
  const deliveredOrders = shiftOrders.filter(o => o.status === 'DELIVERED')
  const totalRevenue = deliveredOrders.reduce((sum, o) => sum + o.total, 0)

  await prisma.shift.update({
    where: { id: shift.id },
    data: {
      totalRevenue,
      totalExpenses,
      netRevenue: totalRevenue - totalExpenses,
    },
  })

  // ─── 10. التقرير النهائي ─────────────────────────────────────────────
  const cancelledOrders = shiftOrders.filter(o => o.status === 'CANCELLED')
  const pendingOrders = shiftOrders.filter(o => o.status === 'PENDING')
  const preparingOrders = shiftOrders.filter(o => o.status === 'PREPARING' || o.status === 'CONFIRMED')
  const readyOrders = shiftOrders.filter(o => o.status === 'READY' || o.status === 'READY_TO_PAY')

  console.log('\n' + '=' .repeat(50))
  console.log('  تقرير نهاية المحاكاة')
  console.log('=' .repeat(50))
  console.log(`  إجمالي الطلبات:        ${totalOrders}`)
  console.log(`  صالة (DINE_IN):        ${dineInCount}`)
  console.log(`  سفري (TAKEAWAY):       ${takeawayCount}`)
  console.log(`  توصيل (DELIVERY):      ${deliveryCount}`)
  console.log(`  مكتملة:                ${deliveredOrders.length}`)
  console.log(`  ملغية:                 ${cancelledOrders.length}`)
  console.log(`  قيد التحضير:           ${preparingOrders.length}`)
  console.log(`  جاهزة:                 ${readyOrders.length}`)
  console.log(`  معلقة (جديد):          ${pendingOrders.length}`)
  console.log(`  إجمالي الإيرادات:      ${totalRevenue.toFixed(2)} ج.م`)
  console.log(`  إجمالي المصروفات:      ${totalExpenses.toFixed(2)} ج.م`)
  console.log(`  صافي الإيرادات:        ${(totalRevenue - totalExpenses).toFixed(2)} ج.م`)
  console.log(`  عدد الموظفين:          ${STAFF_DATA.length}`)
  console.log(`  عدد الطاولات:          ${tables.length}`)
  console.log(`  عدد الأصناف:           ${mealList.length}`)
  console.log('=' .repeat(50))
  console.log('  تمت المحاكاة بنجاح!')
  console.log('=' .repeat(50))
}

main()
  .catch((e) => {
    console.error(' خطأ:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

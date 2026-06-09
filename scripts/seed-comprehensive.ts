import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const pick = <T>(arr: T[]): T => arr[rand(0, arr.length - 1)]

const CUSTOMERS = [
  'أحمد', 'محمد', 'علي', 'خالد', 'محمود', 'إبراهيم', 'يوسف', 'حسن', 'عمر', 'سامي',
  'كريم', 'مصطفى', 'نادر', 'هاني', 'عمرو', 'شادي', 'تامر', 'أيمن', 'أشرف', 'وائل',
  'مينا', 'بيتر', 'جورج', 'كيرلس', 'مارك', 'لؤي', 'زياد', 'آدم', 'ياسين', 'عبدالله',
]
const PHONES = Array.from({ length: 100 }, (_, i) => `0100${String(10000 + i).padStart(6, '0')}`)
const AREAS = ['المهندسين', 'الزمالك', 'مصر الجديدة', 'المعادي', 'الدقي', 'مدينة نصر']
const STREETS = ['شارع الهرم', 'ش النيل', 'شارع فيصل', 'شارع عباس العقاد', 'ش جسر السويس']

const EXPENSE_CATEGORIES = ['خامات', 'رواتب', 'فواتير', 'صيانة', 'تسويق', 'عام', 'سلف العماله', 'تحميلات', 'مشتريات', 'مستلزمات']
const EXPENSE_DESC: Record<string, string[]> = {
  خامات: ['لحمة طازة', 'دجاج', 'خضروات', 'زيت طهي', 'أرز'],
  رواتب: ['عامل نظافة', 'شيف', 'سواق'],
  فواتير: ['كهرباء', 'مياه', 'غاز', 'نت'],
  صيانة: ['مكيف', 'ثلاجة', 'شواية', 'سباكة'],
  تسويق: ['بوست فيسبوك', 'إعلان', 'بروشورات'],
  عام: ['نثريات', 'مستلزمات', 'هدايا'],
  مشتريات: ['دجاج طازج', 'لحم مفروم', 'خضروات', 'فلاتر زيت'],
  مستلزمات: ['منظفات', 'أكواب', 'أطباق', 'قفازات'],
}

interface Meal { id: string; title: string; titleAr: string; price: number; category: string; preparationArea: string; imageUrl: string }
interface Tbl { number: number }

function weightedType(): 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' {
  const r = Math.random()
  return r < 0.50 ? 'DINE_IN' : r < 0.78 ? 'TAKEAWAY' : 'DELIVERY'
}

function buildItems(meals: Meal[], type: string) {
  const count = rand(1, 3)
  const pool = type === 'DINE_IN' ? meals : meals.filter(m => m.preparationArea !== 'HALL')
  const items = []
  for (let j = 0; j < count; j++) {
    const meal = pick(pool)
    const qty = rand(1, 3)
    items.push({
      mealId: meal.id,
      mealTitle: meal.title,
      mealTitleAr: meal.titleAr,
      price: meal.price,
      quantity: qty,
      preparationArea: meal.preparationArea,
      addOns: '[]',
      category: meal.category,
      imageUrl: meal.imageUrl || '',
      isPromotion: false,
      lastAddedQuantity: qty,
      addedQuantity: qty,
    })
  }
  return items
}

function custFields(type: string, tables: Tbl[]) {
  const name = pick(CUSTOMERS); const phone = pick(PHONES)
  if (type === 'DINE_IN') return { customerName: name, customerPhone: phone, tableNumber: String(pick(tables).number), deliveryAddress: '', pickupTime: '' }
  if (type === 'TAKEAWAY') return { customerName: name, customerPhone: phone, tableNumber: '', deliveryAddress: '', pickupTime: `${String(rand(10, 22)).padStart(2, '0')}:${String(rand(0, 59)).padStart(2, '0')}` }
  return { customerName: name, customerPhone: phone, tableNumber: '', deliveryAddress: `${pick(STREETS)}، ${pick(AREAS)}`, pickupTime: '' }
}

function genId(): string {
  const t = Date.now().toString(36)
  const r = Math.random().toString(36).slice(2, 8)
  return `sim_${t}_${r}`
}

async function main() {
  console.log('=== COMPREHENSIVE MONTH SIM — May 2026 ===\n')

  const [meals, tables, staff] = await Promise.all([
    prisma.meal.findMany({ where: { isActive: true } }) as Promise<Meal[]>,
    prisma.restaurantTable.findMany({ where: { isActive: true }, select: { number: true } }),
    prisma.admin.findMany({ select: { username: true, role: true } }),
  ])
  const allMeals = meals
  const cashiers = staff.filter(s => s.role === 'CASHIER').map(s => s.username)
  const allUsernames = staff.map(s => s.username)
  console.log(`  ${allMeals.length} meals, ${tables.length} tables, ${staff.length} staff\n`)

  // Clear
  console.log('Clearing...')
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.expense.deleteMany()
  await prisma.shift.deleteMany()
  console.log('  Done\n')

  const startDate = new Date('2026-05-01')
  let totalShifts = 0, totalOrders = 0, totalItems = 0, totalExp = 0

  for (let day = 0; day < 30; day++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + day)
    const isWeekend = date.getDay() === 5 || date.getDay() === 6
    const dayStr = date.toISOString().slice(0, 10)

    // Morning shift 07:30–15:30
    const mS = new Date(date); mS.setHours(7, 30, 0, 0)
    const mE = new Date(date); mE.setHours(15, 30, 0, 0)
    const morningCount = isWeekend ? rand(7, 14) : rand(4, 10)
    const eCount = isWeekend ? rand(9, 18) : rand(6, 13)

    // Create morning shift
    const { id: sid1 } = await prisma.shift.create({
      data: {
        status: 'CLOSED', startedBy: pick(cashiers), startedAt: mS, endedAt: mE,
        endedBy: pick(allUsernames), notes: isWeekend ? 'وردية صباحية (مزدحمة)' : 'وردية صباحية',
        totalRevenue: 0, totalExpenses: 0, netRevenue: 0,
      },
      select: { id: true },
    })
    totalShifts++

    // Create morning orders + items using batch
    let mRev = 0; let mExp = 0
    const batch1 = []
    for (let o = 0; o < morningCount; o++) {
      const isCx = Math.random() < 0.08
      const type = weightedType()
      const items = buildItems(allMeals, type)
      const sub = items.reduce((s, i) => s + i.price * i.quantity, 0)
      const sc = type === 'DINE_IN' ? Math.round(sub * 0.12 * 100) / 100 : 0
      const df = type === 'DELIVERY' ? 25 : 0
      const total = sub + sc + df
      const status = isCx ? 'CANCELLED' : 'DELIVERED'
      if (!isCx) mRev += total
      const hasKitchen = items.some(i => i.preparationArea === 'KITCHEN')
      const hasBarista = items.some(i => i.preparationArea === 'BARISTA')
      const cust = custFields(type, tables)
      const ot = new Date(mS); ot.setMinutes(ot.getMinutes() + rand(5, 475))
      const oid = genId()

      batch1.push(
        prisma.order.create({
          data: {
            id: oid, shiftId: sid1, orderNumber: o + 1,
            type, status,
            customerName: cust.customerName, customerPhone: cust.customerPhone,
            deliveryAddress: cust.deliveryAddress, tableNumber: cust.tableNumber,
            pickupTime: cust.pickupTime,
            subtotal: sub, serviceCharge: sc, deliveryFee: df, total,
            kitchenAccess: hasKitchen || hasBarista,
            kitchenStatus: hasKitchen ? status : undefined,
            baristaStatus: hasBarista ? status : undefined,
            createdAt: ot, updatedAt: ot,
            items: { createMany: { data: items.map(it => ({ ...it, createdAt: ot, updatedAt: ot })) } },
          },
        })
      )
      totalOrders++; totalItems += items.length
    }

    // Morning expenses
    for (let e = 0; e < rand(0, 2); e++) {
      const cat = pick(EXPENSE_CATEGORIES)
      const amount = cat === 'رواتب' ? rand(500, 3000) : rand(20, 500)
      const et = new Date(mS); et.setMinutes(et.getMinutes() + rand(60, 480))
      batch1.push(
        prisma.expense.create({
          data: { description: pick(EXPENSE_DESC[cat] || ['مصروف']), amount, category: cat, shiftId: sid1, createdBy: pick(allUsernames), createdAt: et },
        })
      )
      mExp += amount; totalExp++
    }

    batch1.push(
      prisma.shift.update({ where: { id: sid1 }, data: { totalRevenue: mRev, totalExpenses: mExp, netRevenue: mRev - mExp } })
    )
    await prisma.$transaction(batch1)

    // Evening shift 15:30–23:59
    const eS = new Date(date); eS.setHours(15, 30, 0, 0)
    const eE = new Date(date); eE.setHours(23, 59, 0, 0)
    const { id: sid2 } = await prisma.shift.create({
      data: {
        status: 'CLOSED', startedBy: pick(cashiers), startedAt: eS, endedAt: eE,
        endedBy: pick(allUsernames), notes: isWeekend ? 'وردية مسائية (مزدحمة)' : 'وردية مسائية',
        totalRevenue: 0, totalExpenses: 0, netRevenue: 0,
      },
      select: { id: true },
    })
    totalShifts++

    let eRev = 0; let eExp = 0
    const batch2 = []
    for (let o = 0; o < eCount; o++) {
      const isCx = Math.random() < 0.08
      const type = Math.random() < 0.6 ? 'DINE_IN' : weightedType()
      const items = buildItems(allMeals, type)
      const sub = items.reduce((s, i) => s + i.price * i.quantity, 0)
      const sc = type === 'DINE_IN' ? Math.round(sub * 0.12 * 100) / 100 : 0
      const df = type === 'DELIVERY' ? 25 : 0
      const total = sub + sc + df
      const status = isCx ? 'CANCELLED' : 'DELIVERED'
      if (!isCx) eRev += total
      const hasKitchen = items.some(i => i.preparationArea === 'KITCHEN')
      const hasBarista = items.some(i => i.preparationArea === 'BARISTA')
      const cust = custFields(type, tables)
      const ot = new Date(eS); ot.setMinutes(ot.getMinutes() + rand(5, 505))
      const oid = genId()

      batch2.push(
        prisma.order.create({
          data: {
            id: oid, shiftId: sid2, orderNumber: o + 1,
            type, status,
            customerName: cust.customerName, customerPhone: cust.customerPhone,
            deliveryAddress: cust.deliveryAddress, tableNumber: cust.tableNumber,
            pickupTime: cust.pickupTime,
            subtotal: sub, serviceCharge: sc, deliveryFee: df, total,
            kitchenAccess: hasKitchen || hasBarista,
            kitchenStatus: hasKitchen ? status : undefined,
            baristaStatus: hasBarista ? status : undefined,
            createdAt: ot, updatedAt: ot,
            items: { createMany: { data: items.map(it => ({ ...it, createdAt: ot, updatedAt: ot })) } },
          },
        })
      )
      totalOrders++; totalItems += items.length
    }

    for (let e = 0; e < rand(0, 3); e++) {
      const cat = pick(EXPENSE_CATEGORIES)
      const amount = rand(20, 500)
      const et = new Date(eS); et.setMinutes(et.getMinutes() + rand(60, 480))
      batch2.push(
        prisma.expense.create({
          data: { description: pick(EXPENSE_DESC[cat] || ['مصروف']), amount, category: cat, shiftId: sid2, createdBy: pick(allUsernames), createdAt: et },
        })
      )
      eExp += amount; totalExp++
    }

    batch2.push(
      prisma.shift.update({ where: { id: sid2 }, data: { totalRevenue: eRev, totalExpenses: eExp, netRevenue: eRev - eExp } })
    )
    await prisma.$transaction(batch2)

    console.log(`  ${dayStr}: ${morningCount}M + ${eCount}E = ${morningCount + eCount} orders`)
  }

  // ─── Admin Monthly Expenses ──────────────────────────────
  const adminExps = [
    { d: 'إيجار المحل - مايو 2026', a: 25000, c: 'إيجار', day: 5 },
    { d: 'رواتب الموظفين - مايو 2026', a: 45000, c: 'رواتب', day: 28 },
    { d: 'فاتورة كهرباء - مايو', a: 5500, c: 'فواتير', day: 15 },
    { d: 'فاتورة مياه - مايو', a: 1200, c: 'فواتير', day: 15 },
    { d: 'صيانة معدات مطبخ', a: 3000, c: 'صيانة', day: 10 },
    { d: 'توريدات مشروبات', a: 8000, c: 'مشتريات', day: 12 },
    { d: 'توريدات مخزن', a: 6000, c: 'مشتريات', day: 20 },
    { d: 'حملة تسويق - مايو', a: 4000, c: 'تسويق', day: 8 },
    { d: 'نت وإنترنت - مايو', a: 550, c: 'فواتير', day: 1 },
    { d: 'صيانة مكيفات', a: 2000, c: 'صيانة', day: 22 },
  ]
  for (const exp of adminExps) {
    const d = new Date('2026-05-01'); d.setDate(exp.day); d.setHours(10, 0, 0, 0)
    await prisma.expense.create({ data: { description: exp.d, amount: exp.a, category: exp.c, createdBy: 'admin', createdAt: d } })
  }
  const adminTotal = adminExps.reduce((s, e) => s + e.a, 0)

  // ─── Summary ─────────────────────────────────────────────
  const agg = await prisma.shift.aggregate({ _sum: { totalRevenue: true, totalExpenses: true, netRevenue: true } })
  const byType = await prisma.order.groupBy({ by: ['type'], _count: true })
  const byStatus = await prisma.order.groupBy({ by: ['status'], _count: true })

  console.log(`\n=============== SUMMARY ===============`)
  console.log(`  Shifts:       ${totalShifts}`)
  console.log(`  Orders:       ${totalOrders}`)
  for (const s of byStatus) console.log(`    ${s.status}: ${s._count}`)
  console.log(`  Order Items:  ${totalItems}`)
  console.log(`  Shift Exp:    ${totalExp}`)
  console.log(`  Admin Exp:    ${adminExps.length} (${adminTotal.toLocaleString()} ج.م)`)
  console.log(`  Total Rev:    ${agg._sum.totalRevenue?.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} ج.م`)
  console.log(`  Total S-Exp:  ${agg._sum.totalExpenses?.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} ج.م`)
  console.log(`  Net Rev:      ${agg._sum.netRevenue?.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} ج.م`)
  console.log(`\n  Order Types:`)
  for (const t of byType) {
    const label: Record<string, string> = { DINE_IN: 'صالة', TAKEAWAY: 'تيك أواي', DELIVERY: 'دليفري' }
    console.log(`    ${label[t.type] || t.type}: ${t._count}`)
  }
  console.log(`========================================\n`)
  console.log('✅ Done — refresh the app to see the data.')

  await prisma.$disconnect()
}

main().catch(e => { console.error('FATAL:', e); process.exit(1) })

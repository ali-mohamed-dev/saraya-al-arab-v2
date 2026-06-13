// Simulation: 150 orders in a full work day
// Uses Prisma directly to bypass rate limiting (simulation only)
import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'

const prisma = new PrismaClient()
const MEALS = JSON.parse(readFileSync('meals.json', 'utf8'))
const TABLES = JSON.parse(readFileSync('tables.json', 'utf8'))

const sleep = ms => new Promise(r => setTimeout(r, ms))
const pick = arr => arr[Math.floor(Math.random() * arr.length)]
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

const STATUS_CHAIN = ['CONFIRMED', 'PREPARING', 'READY', 'READY_TO_PAY', 'DELIVERED']

const CUSTOMERS = ['أحمد', 'محمد', 'علي', 'خالد', 'محمود', 'إبراهيم', 'يوسف', 'حسن', 'عمر', 'سامي',
  'كريم', 'مصطفى', 'نادر', 'هاني', 'عمرو', 'شادي', 'تامر', 'أيمن', 'أشرف', 'وائل',
  'مينا', 'بيتر', 'جورج', 'كيرلس', 'مارك', 'لؤي', 'زياد', 'آدم', 'ياسين', 'عبدالله']

const PHONES = Array.from({ length: 80 }, (_, i) => `0100${String(10000 + i).padStart(6, '0')}`)

function orderType(i) {
  if (i < 90) return 'DINE_IN'
  if (i < 127) return 'TAKEAWAY'
  return 'DELIVERY'
}

function buildItems(type) {
  const count = Math.random() < 0.3 ? randInt(2, 4) : randInt(1, 2)
  const pool = type === 'DINE_IN' ? MEALS : MEALS.filter(m => m.preparationArea !== 'HALL')
  const items = []
  for (let j = 0; j < count; j++) {
    const meal = pick(pool)
    items.push({
      mealId: meal.id,
      mealTitle: meal.title,
      mealTitleAr: meal.titleAr,
      price: meal.price,
      quantity: randInt(1, 3),
      preparationArea: meal.preparationArea || 'KITCHEN',
      addOns: '[]',
      category: meal.category || '',
      imageUrl: meal.imageUrl || '',
    })
  }
  return items
}

async function simulate() {
  console.log('══════════════════════════════════════════')
  console.log('  SIMULATION: 150 ORDERS - FULL WORK DAY')
  console.log('══════════════════════════════════════════\n')

  // Clean up any leftovers from previous simulation runs
  const simShifts = await prisma.shift.findMany({ where: { startedBy: 'simulation' }, select: { id: true } })
  const simShiftIds = simShifts.map(s => s.id)
  if (simShiftIds.length > 0) {
    const simOrders = await prisma.order.findMany({ where: { shiftId: { in: simShiftIds } }, select: { id: true } })
    const simOrderIds = simOrders.map(o => o.id)
    if (simOrderIds.length > 0) {
      await prisma.orderItem.deleteMany({ where: { orderId: { in: simOrderIds } } })
      await prisma.order.deleteMany({ where: { id: { in: simOrderIds } } })
    }
    await prisma.expense.deleteMany({ where: { shiftId: { in: simShiftIds } } })
    await prisma.shift.deleteMany({ where: { id: { in: simShiftIds } } })
    console.log(`  Cleaned ${simShiftIds.length} previous simulation shifts`)
  }

  // 1. Create shift
  console.log('[1/5] Opening shift...')
  const shift = await prisma.shift.create({
    data: { status: 'OPEN', startedBy: 'simulation', startedAt: new Date() },
  })
  console.log(`  ✅ Shift: ${shift.id}\n`)

  // 2. Create 150 orders
  console.log('[2/5] Creating 150 orders...')
  const orders = []
  for (let i = 0; i < 150; i++) {
    const type = orderType(i)
    const items = buildItems(type)

    const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0)
    const serviceCharge = Math.round(subtotal * 0.1 * 100) / 100
    const total = subtotal + serviceCharge

    // Generate order number (scoped to shift)
    const maxOrder = await prisma.order.findFirst({
      where: { shiftId: shift.id },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    })
    const orderNumber = maxOrder ? maxOrder.orderNumber + 1 : 1

    const orderData = {
      orderNumber,
      type,
      status: 'PENDING',
      customerName: pick(CUSTOMERS),
      customerPhone: type !== 'DINE_IN' ? pick(PHONES) : '',
      deliveryAddress: type === 'DELIVERY' ? `${pick(['شارع الهرم', 'ش النيل', 'شارع فيصل', 'شارع عباس العقاد', 'ش جسر السويس'])}، ${pick(['المهندسين', 'الزمالك', 'مصر الجديدة', 'المعادي', 'الدقي', 'مدينة نصر'])}` : '',
      tableNumber: type === 'DINE_IN' ? String(pick(TABLES).number) : '',
      pickupTime: type === 'TAKEAWAY' ? `${String(randInt(10, 22)).padStart(2, '0')}:${String(randInt(0, 59)).padStart(2, '0')}` : '',
      subtotal,
      serviceCharge,
      total,
      shiftId: shift.id,
      items: { create: items },
    }

    const order = await prisma.order.create({
      data: orderData,
      include: { items: true },
    })
    orders.push(order)
    console.log(`  [${i + 1}/150] #${orderNumber} ${type} — ${total} ج.م (${items.length} items)`)
    await sleep(randInt(30, 100))
  }
  console.log(`\n  ✅ ${orders.length} orders created\n`)

  // 3. Advance through statuses with realistic timing
  console.log('[3/5] Advancing order statuses...')
  const deliveryTimes = []
  for (const status of STATUS_CHAIN) {
    const eligible = orders.filter(o => o.status !== 'CANCELLED' && o.status !== 'DELIVERED')
    const advancing = eligible.filter(() => Math.random() < 0.97)

    for (const order of advancing) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status,
          kitchenAccess: status === 'CONFIRMED' ? true : undefined,
          kitchenStatus: status === 'DELIVERED' || status === 'CANCELLED' ? status : undefined,
          baristaStatus: status === 'DELIVERED' || status === 'CANCELLED' ? status : undefined,
        },
      })
      order.status = status
      if (status === 'DELIVERED') deliveryTimes.push(Date.now())
    }
    console.log(`  ${status}: ${advancing.length} progressed`)
    await sleep(randInt(100, 300))
  }

  // Cancel 2-3 orders
  const toCancel = orders.filter(o => o.status !== 'DELIVERED').slice(0, randInt(2, 3))
  for (const order of toCancel) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED', kitchenStatus: 'CANCELLED', baristaStatus: 'CANCELLED' },
    })
    order.status = 'CANCELLED'
    console.log(`  CANCELLED #${order.orderNumber}`)
  }

  const delivered = orders.filter(o => o.status === 'DELIVERED').length
  const cancelled = orders.filter(o => o.status === 'CANCELLED').length
  const totalRev = orders.filter(o => o.status === 'DELIVERED').reduce((s, o) => s + o.total, 0)
  console.log(`\n  Final: ${delivered} delivered, ${cancelled} cancelled, ${orders.length - delivered - cancelled} stuck`)
  console.log(`  Revenue from delivered: ${totalRev.toFixed(2)} ج.م\n`)

  // 4. Create expenses
  console.log('[4/5] Creating expenses...')
  const expenses = [
    { description: 'مواد تنظيف', amount: 150, category: 'مستلزمات' },
    { description: 'أكواب ورقية', amount: 200, category: 'مستلزمات' },
    { description: 'دجاج طازج', amount: 850, category: 'مشتريات' },
    { description: 'خضروات وفواكه', amount: 600, category: 'مشتريات' },
    { description: 'زيت طهي', amount: 350, category: 'مشتريات' },
    { description: 'أرز', amount: 400, category: 'مشتريات' },
    { description: 'توابيل', amount: 120, category: 'مشتريات' },
    { description: 'مياة معدنية', amount: 180, category: 'مستلزمات' },
    { description: 'غاز', amount: 300, category: 'فواتير' },
    { description: 'كهرباء', amount: 450, category: 'فواتير' },
    { description: 'صيانة مكيف', amount: 250, category: 'صيانة' },
    { description: 'مرتب عامل', amount: 3000, category: 'مرتبات' },
    { description: 'مرتب شيف', amount: 4500, category: 'مرتبات' },
    { description: 'نت وانترنت', amount: 350, category: 'فواتير' },
    { description: 'إيجار المحل', amount: 8000, category: 'إيجار' },
  ]
  for (const exp of expenses) {
    await prisma.expense.create({
      data: { ...exp, shiftId: shift.id, createdBy: 'simulation' },
    })
    console.log(`  ${exp.description}: ${exp.amount} ج.م (${exp.category})`)
  }
  const totalExp = expenses.reduce((s, e) => s + e.amount, 0)
  console.log(`  Total expenses: ${totalExp} ج.م\n`)

  // 5. Close shift (update totals, don't delete orders — keep for verification)
  console.log('[5/5] Closing shift...')
  const netRevenue = totalRev - totalExp
  await prisma.shift.update({
    where: { id: shift.id },
    data: {
      status: 'CLOSED',
      endedAt: new Date(),
      endedBy: 'simulation',
      notes: 'محاكاة يوم عمل كامل - 150 طلب',
      totalRevenue: totalRev,
      totalExpenses: totalExp,
      netRevenue,
    },
  })
  console.log(`  ✅ Shift closed\n`)

  // Summary
  console.log('══════════════════════════════════════════')
  console.log('  SIMULATION COMPLETE')
  console.log('══════════════════════════════════════════')
  console.log(`  Orders:     ${orders.length}`)
  console.log(`  Delivered:  ${delivered}`)
  console.log(`  Cancelled:  ${cancelled}`)
  console.log(`  Revenue:    ${totalRev.toFixed(2)} ج.م`)
  console.log(`  Expenses:   ${totalExp.toFixed(2)} ج.م`)
  console.log(`  Net:        ${netRevenue.toFixed(2)} ج.م`)
  console.log(`  Shift ID:   ${shift.id}`)
  console.log('══════════════════════════════════════════')
  console.log('\nData preserved in DB for inspection.\n')

  await prisma.$disconnect()
}

simulate().catch(e => { console.error('FATAL:', e); process.exit(1) })

const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

;(async () => {
  // Clean previous test data (shift & orders)
  const old = await p.shift.findMany({ where: { startedBy: { in: ['testing', 'simulation'] } }, select: { id: true } })
  for (const s of old) {
    await p.orderItem.deleteMany({ where: { order: { shiftId: s.id } } })
    await p.order.deleteMany({ where: { shiftId: s.id } })
    await p.expense.deleteMany({ where: { shiftId: s.id } })
    await p.shift.delete({ where: { id: s.id } })
  }

  // Create shift
  const shift = await p.shift.create({
    data: { status: 'OPEN', startedBy: 'testing', startedAt: new Date(), notes: 'Full test shift' },
  })
  console.log('Shift:', shift.id)
  const sid = shift.id

  // Get meals
  const meals = await p.meal.findMany({ where: { isActive: true }, take: 8 })
  if (meals.length < 4) {
    console.log('ERROR: Need at least 4 active meals in DB')
    process.exit(1)
  }
  const m = (i) => meals[i % meals.length]

  // Helper
  let orderNum = 0
  const createOrder = async (status, type, overrides = {}) => {
    orderNum++
    const meal1 = m(orderNum)
    const meal2 = m(orderNum + 2)
    const items = [
      { mealId: meal1.id, mealTitle: meal1.title, mealTitleAr: meal1.titleAr, price: meal1.price, quantity: 1, preparationArea: meal1.preparationArea },
    ]
    if (orderNum % 3 !== 0) {
      items.push({ mealId: meal2.id, mealTitle: meal2.title, mealTitleAr: meal2.titleAr, price: meal2.price, quantity: 1, preparationArea: meal2.preparationArea })
    }
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
    const sc = type === 'DINE_IN' ? Math.round(subtotal * 0.12 * 100) / 100 : 0
    const total = subtotal + sc
    const kitchenOK = items.some(i => i.preparationArea === 'KITCHEN') ? status === 'DELIVERED' || status === 'CANCELLED' ? status : ['CONFIRMED', 'PREPARING', 'READY', 'READY_TO_PAY'].includes(status) ? status : 'PENDING' : undefined
    const baristaOK = items.some(i => i.preparationArea === 'BARISTA') ? kitchenOK : undefined
    return p.order.create({
      data: {
        shiftId: sid,
        orderNumber: orderNum,
        status,
        type,
        customerName: overrides.customerName || `عميل ${orderNum}`,
        customerPhone: overrides.customerPhone || `0100${String(orderNum).padStart(7, '0')}`,
        tableNumber: overrides.tableNumber,
        deliveryAddress: type === 'DELIVERY' ? `شارع ${orderNum}, مدينة نصر` : undefined,
        kitchenAccess: ['CONFIRMED', 'PREPARING', 'READY', 'READY_TO_PAY'].includes(status),
        kitchenStatus: kitchenOK,
        baristaStatus: baristaOK,
        subtotal,
        serviceCharge: sc,
        total,
        items: { create: items },
      },
    })
  }

  // ── Orders for Cashier ──
  await createOrder('READY_TO_PAY', 'DINE_IN', { tableNumber: '3' })  // #1
  await createOrder('READY_TO_PAY', 'TAKEAWAY')                      // #2
  await createOrder('READY_TO_PAY', 'DELIVERY')                      // #3
  await createOrder('READY_TO_PAY', 'DINE_IN', { tableNumber: '5' }) // #4
  await createOrder('READY_TO_PAY', 'TAKEAWAY')                      // #5
  await createOrder('READY', 'DINE_IN', { tableNumber: '3' })       // #6 — same table as #1

  // ── Orders for Waiter ──
  await createOrder('PENDING', 'DINE_IN', { tableNumber: '7' })     // #7
  await createOrder('PENDING', 'TAKEAWAY')                          // #8
  await createOrder('PENDING', 'DELIVERY')                          // #9
  await createOrder('CONFIRMED', 'DINE_IN', { tableNumber: '2' })  // #10
  await createOrder('PREPARING', 'DINE_IN', { tableNumber: '1' })  // #11

  // ── Orders for Kitchen ──
  await createOrder('CONFIRMED', 'TAKEAWAY')                        // #12
  await createOrder('PREPARING', 'DINE_IN', { tableNumber: '4' })  // #13
  await createOrder('PREPARING', 'DELIVERY')                        // #14

  // ── Orders for Barista ──
  // Need a meal with BARISTA area
  const baristaMeal = meals.find(m => m.preparationArea === 'BARISTA')
  if (baristaMeal) {
    orderNum++
    await p.order.create({
      data: {
        shiftId: sid,
        orderNumber: orderNum,
        status: 'CONFIRMED',
        type: 'TAKEAWAY',
        customerName: `عميل ${orderNum}`,
        customerPhone: `0100${String(orderNum).padStart(7, '0')}`,
        kitchenAccess: true,
        baristaAccess: true,
        kitchenStatus: 'CONFIRMED',
        baristaStatus: 'CONFIRMED',
        subtotal: baristaMeal.price,
        serviceCharge: 0,
        total: baristaMeal.price,
        items: { create: [{ mealId: baristaMeal.id, mealTitle: baristaMeal.title, mealTitleAr: baristaMeal.titleAr, price: baristaMeal.price, quantity: 2, preparationArea: 'BARISTA' }] },
      },
    })
    // #15 — barista order
    orderNum++
    await p.order.create({
      data: {
        shiftId: sid,
        orderNumber: orderNum,
        status: 'PREPARING',
        type: 'DELIVERY',
        customerName: `عميل ${orderNum}`,
        customerPhone: `0100${String(orderNum).padStart(7, '0')}`,
        deliveryAddress: 'شارع النيل',
        kitchenAccess: true,
        baristaAccess: true,
        kitchenStatus: 'PREPARING',
        baristaStatus: 'PREPARING',
        subtotal: baristaMeal.price * 3,
        serviceCharge: 0,
        total: baristaMeal.price * 3,
        items: { create: [{ mealId: baristaMeal.id, mealTitle: baristaMeal.title, mealTitleAr: baristaMeal.titleAr, price: baristaMeal.price, quantity: 3, preparationArea: 'BARISTA' }] },
      },
    })
    // #16 — barista preparing
  }

  // ── Delivered orders ──
  await createOrder('DELIVERED', 'DINE_IN', { tableNumber: '6' })   // #17
  await createOrder('DELIVERED', 'TAKEAWAY')                         // #18
  await createOrder('DELIVERED', 'DELIVERY')                         // #19
  await createOrder('DELIVERED', 'DINE_IN', { tableNumber: '8' })   // #20

  // ── Cancelled orders ──
  await createOrder('CANCELLED', 'TAKEAWAY')                         // #21

  // ── Expenses ──
  const exps = [
    ['مواد تنظيف', 150, 'مستلزمات'],
    ['دجاج طازج', 850, 'مشتريات'],
    ['زيت طهي', 350, 'مشتريات'],
    ['كهرباء', 450, 'فواتير'],
  ]
  for (const [d, a, c] of exps) {
    await p.expense.create({ data: { description: d, amount: a, category: c, shiftId: sid, createdBy: 'testing' } })
  }

  // ── Summary ──
  const totalOrders = await p.order.count({ where: { shiftId: sid } })
  const byStatus = {}
  for (const o of await p.order.findMany({ where: { shiftId: sid }, select: { status: true } })) {
    byStatus[o.status] = (byStatus[o.status] || 0) + 1
  }
  console.log(`\nTotal orders: ${totalOrders}`)
  console.log('By status:', JSON.stringify(byStatus))
  console.log('Expenses: 4')
  console.log(`\nDone. Open http://localhost:3000`)
  await p.$disconnect()
})()

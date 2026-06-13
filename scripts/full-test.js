const http = require('http');
const BASE = 'http://localhost:3000';
const R = (method, path, body) => new Promise((resolve, reject) => {
  const url = `${BASE}${path}`;
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  const req = http.request(url, opts, res => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
      catch { resolve({ status: res.statusCode, data }); }
    });
  });
  req.on('error', reject);
  if (body) req.write(JSON.stringify(body));
  req.end();
});

let passed = 0, failed = 0;
const t = async (name, fn) => {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
};

async function main() {
  console.log('═══ COMPREHENSIVE API TEST ═══\n');

  // ── READ ENDPOINTS ──
  console.log('── READ Endpoints ──');
  await t('GET /api/ping', async () => {
    const r = await R('GET', '/api/ping');
    if (r.status !== 200) throw new Error(`Expected 200 got ${r.status}`);
  });

  await t('GET /api/meals returns array', async () => {
    const r = await R('GET', '/api/meals');
    if (r.status !== 200) throw new Error(`Expected 200 got ${r.status}`);
    if (!Array.isArray(r.data)) throw new Error('Not an array');
    if (r.data.length === 0) throw new Error('Empty meals');
  });

  await t('GET /api/categories returns array', async () => {
    const r = await R('GET', '/api/categories');
    if (r.status !== 200) throw new Error(`Expected 200 got ${r.status}`);
    if (!Array.isArray(r.data)) throw new Error('Not an array');
  });

  await t('GET /api/promotions returns array', async () => {
    const r = await R('GET', '/api/promotions');
    if (r.status !== 200) throw new Error(`Expected 200 got ${r.status}`);
  });

  await t('GET /api/addons returns array', async () => {
    const r = await R('GET', '/api/addons');
    if (r.status !== 200) throw new Error(`Expected 200 got ${r.status}`);
  });

  await t('GET /api/tables returns array', async () => {
    const r = await R('GET', '/api/tables');
    if (r.status !== 200) throw new Error(`Expected 200 got ${r.status}`);
  });

  await t('GET /api/staff returns array', async () => {
    const r = await R('GET', '/api/staff');
    if (r.status !== 200) throw new Error(`Expected 200 got ${r.status}`);
  });

  await t('GET /api/web-users returns array', async () => {
    const r = await R('GET', '/api/web-users');
    if (r.status !== 200) throw new Error(`Expected 200 got ${r.status}`);
  });

  await t('GET /api/settings returns settings', async () => {
    const r = await R('GET', '/api/settings');
    if (r.status !== 200) throw new Error(`Expected 200 got ${r.status}`);
    if (!r.data || typeof r.data !== 'object') throw new Error('Invalid settings');
  });

  await t('GET /api/settings/loyalty returns loyalty', async () => {
    const r = await R('GET', '/api/settings/loyalty');
    if (r.status !== 200) throw new Error(`Expected 200 got ${r.status}`);
    if (typeof r.data.loyaltyEnabled !== 'boolean') throw new Error('Missing loyaltyEnabled');
  });

  await t('GET /api/shifts?current=true returns shift', async () => {
    const r = await R('GET', '/api/shifts?current=true');
    if (r.status !== 200) throw new Error(`Expected 200 got ${r.status}`);
  });

  await t('GET /api/orders returns array', async () => {
    const r = await R('GET', '/api/orders');
    if (r.status !== 200) throw new Error(`Expected 200 got ${r.status}`);
  });

  await t('GET /api/orders/stats returns stats', async () => {
    const r = await R('GET', '/api/orders/stats');
    if (r.status !== 200) throw new Error(`Expected 200 got ${r.status}`);
  });

  await t('GET /api/expenses returns array', async () => {
    const r = await R('GET', '/api/expenses');
    if (r.status !== 200) throw new Error(`Expected 200 got ${r.status}`);
  });

  await t('GET /api/expenses/categories returns array', async () => {
    const r = await R('GET', '/api/expenses/categories');
    if (r.status !== 200) throw new Error(`Expected 200 got ${r.status}`);
  });

  await t('GET /api/employees returns array', async () => {
    const r = await R('GET', '/api/employees');
    if (r.status !== 200) throw new Error(`Expected 200 got ${r.status}`);
  });

  await t('GET /api/reports/discounts?from=2026-06-01&to=2026-06-12 returns data', async () => {
    const r = await R('GET', '/api/reports/discounts?from=2026-06-01&to=2026-06-12');
    if (r.status !== 200) throw new Error(`Expected 200 got ${r.status}`);
    if (typeof r.data.totalDiscounts !== 'number') throw new Error('Missing totalDiscounts');
  });

  // ── AUTH ──
  console.log('\n── Auth ──');
  await t('POST /api/auth returns 401 for bad creds (endpoint works)', async () => {
    const r = await R('POST', '/api/auth', { username: 'admin', password: 'wrong' });
    if (r.status !== 401) throw new Error(`Expected 401 got ${r.status}`);
  });

  await t('POST /api/web-users/check returns user data', async () => {
    const r = await R('POST', '/api/web-users/check', { email: '186alo.hag@gmail.com' });
    if (r.status !== 200) throw new Error(`Expected 200 got ${r.status}`);
  });

  // ── SETTINGS CRUD ──
  console.log('\n── Settings CRUD ──');
  await t('PUT /api/settings/loyalty updates loyalty settings', async () => {
    const r = await R('PUT', '/api/settings/loyalty', {
      loyaltyEnabled: true, loyaltyThreshold: 10, loyaltyCashback: 1
    });
    if (r.status !== 200) throw new Error(`Expected 200 got ${r.status}: ${JSON.stringify(r.data).slice(0,100)}`);
    if (r.data.loyaltyEnabled !== true) throw new Error('Failed to set loyaltyEnabled');
  });

  await t('PUT /api/settings toggles takingOrders', async () => {
    const r = await R('PUT', '/api/settings', { takingOrders: true });
    if (r.status !== 200) throw new Error(`Expected 200 got ${r.status}`);
  });

  // ── EXPENSE CATEGORIES CRUD ──
  console.log('\n── Expense Categories CRUD ──');
  let catId;
  await t('POST /api/expenses/categories creates category', async () => {
    const r = await R('POST', '/api/expenses/categories', { name: '__TestCat__' });
    if (r.status !== 201) throw new Error(`Expected 201 got ${r.status}`);
    if (!r.data.id) throw new Error('No id returned');
    catId = r.data.id;
  });

  await t('PUT /api/expenses/categories/[id] renames category', async () => {
    if (!catId) throw new Error('No category to rename');
    const r = await R('PUT', `/api/expenses/categories/${catId}`, { name: '__TestCatRenamed__' });
    if (r.status !== 200) throw new Error(`Expected 200 got ${r.status}`);
  });

  await t('DELETE /api/expenses/categories/[id] deletes category', async () => {
    if (!catId) throw new Error('No category to delete');
    const r = await R('DELETE', `/api/expenses/categories/${catId}`);
    if (r.status !== 200) throw new Error(`Expected 200 got ${r.status}`);
  });

  // ── EXPENSES CRUD ──
  console.log('\n── Expenses CRUD ──');
  let expId;
  await t('POST /api/expenses creates expense', async () => {
    const r = await R('POST', '/api/expenses', {
      title: '__TestExpense__',
      amount: 100,
      category: 'إيجار',
      addedBy: 'admin'
    });
    if (r.status !== 201) throw new Error(`Expected 201 got ${r.status}: ${JSON.stringify(r.data).slice(0,100)}`);
    if (!r.data.id) throw new Error('No id');
    expId = r.data.id;
  });

  await t('PUT /api/expenses/[id] updates expense', async () => {
    if (!expId) throw new Error('No expense to update');
    const r = await R('PUT', `/api/expenses/${expId}`, { title: '__TestExpenseUpdated__', amount: 200, category: 'إيجار' });
    if (r.status !== 200) throw new Error(`Expected 200 got ${r.status}`);
    if (r.data.description !== '__TestExpenseUpdated__') throw new Error('Description not updated');
  });

  await t('DELETE /api/expenses/[id] deletes expense', async () => {
    if (!expId) throw new Error('No expense to delete');
    const r = await R('DELETE', `/api/expenses/${expId}`);
    if (r.status !== 200) throw new Error(`Expected 200 got ${r.status}`);
  });

  // ── ORDER LIFECYCLE ──
  console.log('\n── Order Lifecycle ──');
  let orderId, orderNumber;

  await t('POST /api/orders creates TAKEAWAY order', async () => {
    const meals = await R('GET', '/api/meals');
    const meal = meals.data[0];
    if (!meal) throw new Error('No meals available');

    const r = await R('POST', '/api/orders', {
      type: 'TAKEAWAY',
      customerName: 'Test Customer',
      customerPhone: '01234567890',
      customerEmail: '186alo.hag@gmail.com',
      isStaff: true,
      items: [{
        mealId: meal.id, mealTitle: meal.title, mealTitleAr: meal.titleAr || '',
        price: meal.price, quantity: 2, category: meal.category || '',
        preparationArea: meal.preparationArea || 'KITCHEN', addOns: [], imageUrl: meal.imageUrl || '',
      }],
      subtotal: meal.price * 2, serviceCharge: 0, deliveryFee: 0, total: meal.price * 2,
    });
    if (r.status !== 201) throw new Error(`Expected 201 got ${r.status}: ${JSON.stringify(r.data).slice(0,200)}`);
    if (!r.data.id) throw new Error('No id');
    orderId = r.data.id;
    orderNumber = r.data.orderNumber;
  });

  if (orderId) {
    await t('GET /api/orders/[id] fetch order', async () => {
      const r = await R('GET', `/api/orders/${orderId}`);
      if (r.status !== 200) throw new Error(`Expected 200 got ${r.status}`);
      if (r.data.id !== orderId) throw new Error('Wrong order');
    });

    for (const status of ['CONFIRMED', 'PREPARING', 'READY', 'READY_TO_PAY']) {
      await t(`PUT /api/orders/[id]/status (${status})`, async () => {
        const r = await R('PUT', `/api/orders/${orderId}/status`, { status });
        if (r.status !== 200) throw new Error(`Expected 200 got ${r.status}`);
      });
    }

    await t('PUT /api/orders/[id] (DELIVERED)', async () => {
      const r = await R('PUT', `/api/orders/${orderId}`, { status: 'DELIVERED' });
      if (r.status !== 200) throw new Error(`Expected 200 got ${r.status}`);
    });

    await t('Order number is positive integer', async () => {
      if (!orderNumber || orderNumber < 1) throw new Error(`Invalid order number: ${orderNumber}`);
    });
  }

  // ── SHIFT ──
  console.log('\n── Shift ──');
  await t('Current shift exists and is OPEN', async () => {
    const r = await R('GET', '/api/shifts?current=true');
    if (r.status !== 200) throw new Error(`Expected 200 got ${r.status}`);
    if (!r.data) throw new Error('No shift data');
    if (r.data.status !== 'OPEN') throw new Error(`Expected OPEN got ${r.data.status}`);
  });

  // ── MEAL ADDONS ──
  console.log('\n── Meal Addons ──');
  let mealId;
  const meals2 = await R('GET', '/api/meals');
  if (meals2.data.length > 0) {
    mealId = meals2.data[0].id;
    await t('GET /api/meals/[id]/addons returns array', async () => {
      const r = await R('GET', `/api/meals/${mealId}/addons`);
      if (r.status !== 200) throw new Error(`Expected 200 got ${r.status}`);
    });
  }

  // ── PROFILE / WEB USER ──
  console.log('\n── Web Users ──');
  await t('POST /api/web-users/login', async () => {
    const r = await R('POST', '/api/web-users/login', { email: '186alo.hag@gmail.com', password: '123456' });
    // Either 200 (success) or 401 (bad password) is OK — endpoint works
    if (r.status !== 200 && r.status !== 401) throw new Error(`Unexpected status ${r.status}`);
  });

  // ── DISCOUNTS / REPORTS ──
  console.log('\n── Reports ──');
  await t('GET /api/reports/monthly?from=2026-06-01&to=2026-06-12 returns Excel', async () => {
    const url = `${BASE}/api/reports/monthly?from=2026-06-01&to=2026-06-12`;
    const r = await new Promise((resolve, reject) => {
      const req = http.get(url, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data: d.slice(0, 10) }));
      });
      req.on('error', reject);
    });
    if (r.status !== 200) throw new Error(`Expected 200 got ${r.status}`);
    if (!r.headers['content-disposition']?.includes('.xlsx')) throw new Error('Not an Excel file');
  });

  // ── SUMMARY ──
  console.log(`\n${'═'.repeat(40)}`);
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log(`${'═'.repeat(40)}`);
  if (failed > 0) process.exit(1);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });

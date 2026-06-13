const http = require('http');
const BASE = 'http://localhost:3004';

function req(method, path, body, cookie) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (body) headers['Content-Length'] = Buffer.byteLength(body);
    if (cookie) headers['Cookie'] = cookie;
    const r = http.request({ hostname: 'localhost', port: 3004, path, method, headers }, (resp) => {
      const chunks = [];
      resp.on('data', c => chunks.push(c));
      resp.on('end', () => {
        try { resolve({ status: resp.statusCode, data: JSON.parse(Buffer.concat(chunks).toString()), headers: resp.headers }); }
        catch (e) { resolve({ status: resp.statusCode, data: Buffer.concat(chunks).toString() }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

async function main() {
  // 1. Login
  let r = await req('POST', '/api/auth', JSON.stringify({ username: 'admin', password: 'admin123' }));
  const setCookie = r.headers['set-cookie'] || [];
  const cookie = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
  console.log('Login:', r.status, 'Role:', r.data.role);

  // 2. Create DINE_IN order
  console.log('\n--- Creating DINE_IN order ---');
  const body = {
    type: 'DINE_IN',
    tableId: 'cmq1b1thg000hsyi0xbb3xb27',
    tableNumber: 1,
    customerName: 'TestDine',
    customerPhone: '01099999001',
    isStaff: true,
    customerEmail: '186alo.hag@gmail.com',
    items: [{
      mealId: 'cmq1b2w1o000rsyi0vlfh804o',
      mealTitle: 'Lamb Kebab',
      mealTitleAr: '',
      price: 299,
      quantity: 1,
      category: 'Grill',
      preparationArea: 'KITCHEN',
      addOns: [],
      imageUrl: '',
    }],
    subtotal: 299,
    serviceCharge: 0,
    deliveryFee: 0,
    total: 299,
  };
  r = await req('POST', '/api/orders', JSON.stringify(body), cookie);
  console.log('Status:', r.status);
  console.log('Response:', JSON.stringify(r.data, null, 2));

  if (r.status === 201) {
    const orderId = r.data.id;
    console.log('\n--- Transitioning to CONFIRMED ---');
    r = await req('PUT', `/api/orders/${orderId}/status`, JSON.stringify({ status: 'CONFIRMED' }), cookie);
    console.log('Status:', r.status);
    console.log('Response:', JSON.stringify(r.data, null, 2));
  }
}

main().catch(console.error);

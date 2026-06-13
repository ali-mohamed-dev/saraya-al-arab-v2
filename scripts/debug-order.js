const http = require('http');

const BASE = 'http://localhost:3004';

function req(method, path, body, cookie) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const opts = {
      hostname: 'localhost', port: 3004, path, method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (cookie) opts.headers['Cookie'] = cookie;
    if (body) opts.headers['Content-Length'] = Buffer.byteLength(body);
    const r = http.request(opts, (res) => {
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString());
          resolve({ status: res.statusCode, data, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: Buffer.concat(chunks).toString(), headers: res.headers });
        }
      });
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

async function main() {
  // 1. Login
  const login = await req('POST', '/api/auth', JSON.stringify({ username: 'admin', password: 'admin123' }));
  console.log('Login:', login.status, JSON.stringify(login.data));
  const setCookie = login.headers['set-cookie'] || [];
  const cookie = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
  console.log('Cookie:', cookie);

  // 2. Check meals
  const mealsR = await req('GET', '/api/meals', null, cookie);
  const meals = mealsR.data;
  if (!Array.isArray(meals) || meals.length === 0) {
    console.log('NO MEALS FOUND!');
    return;
  }
  const water = meals.find(m => m.title === 'Water');
  console.log('Water meal:', water ? `${water.id} price=${water.price}` : 'NOT FOUND');

  // 3. Try creating a simple order
  const orderBody = {
    type: 'TAKEAWAY',
    customerName: 'NodeTest',
    customerPhone: '01000000123',
    isStaff: true,
    items: [{
      mealId: water.id, mealTitle: water.title, mealTitleAr: '',
      price: water.price, quantity: 1, category: water.category || '',
      preparationArea: water.preparationArea || 'KITCHEN',
      addOns: [], imageUrl: water.imageUrl || '',
    }],
    subtotal: water.price,
    serviceCharge: 0,
    deliveryFee: 0,
    total: water.price,
  };

  console.log('\nCreating order...');
  const orderR = await req('POST', '/api/orders', JSON.stringify(orderBody), cookie);
  console.log('Order status:', orderR.status);
  console.log('Order data:', JSON.stringify(orderR.data, null, 2));
}

main().catch(console.error);

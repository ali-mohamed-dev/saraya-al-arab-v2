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
  // Login
  let r = await req('POST', '/api/auth', JSON.stringify({ username: 'admin', password: 'admin123' }));
  const cookie = (Array.isArray(r.headers['set-cookie']) ? r.headers['set-cookie'] : []).join('; ');

  // Get meals
  r = await req('GET', '/api/meals', null, cookie);
  const meals = r.data;
  console.log('Total meals:', meals.length);
  
  // Show first 5 with their IDs
  meals.slice(0, 5).forEach(m => {
    console.log(`  ${m.id} | "${m.title}" | price=${m.price} | area=${m.preparationArea}`);
  });
  
  // Check if our specific meal IDs exist
  const ids = [
    'cmq1b2gmw002asyi062bg3rrz', // Water
    'cmq1b215e0014syi0eoetko91', // Grilled Fish
    'cmq1b2b6z001vsyi0menhtefw', // Lava Cake
    'cmq1b2w1o000rsyi0vlfh804o', // Lamb Kebab
    'cmq1b2cds001ysyi01zq4cbpm', // Cappuccino
    'cmq1b2fm60027syi0r9f3h5rq', // Iced Latte
    'cmq1b22ic0018syi0jzf9kclr', // Chicken Wrap
    'cmq1b26fd001isyi0a7e3bclz', // French Fries
    'cmq1b1wwb000tsyi0um2cyyw7', // Lamb Chops
    'cmq1b28zg001psyi0dutdqgqw', // Chicken Soup
    'cmq1b27yf001msyi0brqzmvj2', // Caesar Salad
  ];
  console.log('\nChecking specific IDs:');
  ids.forEach(id => {
    const found = meals.find(m => m.id === id);
    console.log(`  ${id} => ${found ? 'FOUND: ' + found.title + ' $' + found.price : 'NOT FOUND'}`);
  });
}

main().catch(console.error);

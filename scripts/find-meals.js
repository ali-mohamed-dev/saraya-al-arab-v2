const http = require('http');
function req(method, path, body, cookie) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (body) headers['Content-Length'] = Buffer.byteLength(body);
    if (cookie) headers['Cookie'] = cookie;
    const r = http.request({ hostname: 'localhost', port: 3004, path, method, headers }, (resp) => {
      const chunks = [];
      resp.on('data', c => chunks.push(c));
      resp.on('end', () => {
        try { resolve({ s: resp.statusCode, d: JSON.parse(Buffer.concat(chunks).toString()) }); }
        catch (e) { resolve({ s: resp.statusCode, d: Buffer.concat(chunks).toString() }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

async function main() {
  let r = await req('POST', '/api/auth', JSON.stringify({ username: 'admin', password: 'admin123' }));
  const cookie = (Array.isArray(r.d.headers) ? r.d.headers['set-cookie'] : []).join('; ');
  // Actually above is wrong, let me use the headers correctly
  // The headers are on the response object... Let me check
}

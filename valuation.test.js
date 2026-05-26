/**
 * Basic integration test — runs without a real API key
 * Tests input validation, auth, and route structure
 */

const http = require('http');

process.env.NODE_ENV = 'development';
process.env.API_KEY = 'test-key';
process.env.ANTHROPIC_API_KEY = 'sk-ant-placeholder';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
process.env.PORT = '3099';

const app = require('../server');

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3099,
      path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, body }); }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

async function runTests() {
  console.log('\n── Horology API tests ──────────────────────────\n');
  let passed = 0, failed = 0;

  function assert(name, condition, detail = '') {
    if (condition) { console.log(`  ✓  ${name}`); passed++; }
    else { console.log(`  ✗  ${name}${detail ? ': ' + detail : ''}`); failed++; }
  }

  // Give server a moment to start
  await new Promise(r => setTimeout(r, 500));

  // 1. Health check
  const health = await request('/health');
  assert('Health check returns 200', health.status === 200);
  assert('Health check returns ok', health.body.status === 'ok');

  // 2. 404 for unknown routes
  const notFound = await request('/api/nonexistent');
  assert('Unknown route returns 404', notFound.status === 404);

  // 3. Auth guard — no token
  const noAuth = await request('/api/valuation', { method: 'POST', body: {} });
  assert('Valuation blocked without token', noAuth.status === 401);

  // 4. Auth guard — bad token
  const badAuth = await request('/api/valuation', {
    method: 'POST',
    headers: { Authorization: 'Bearer wrong-token' },
    body: {},
  });
  assert('Valuation blocked with wrong token', badAuth.status === 401);

  // 5. Validation — missing fields
  const missingFields = await request('/api/valuation', {
    method: 'POST',
    headers: { Authorization: 'Bearer test-key' },
    body: { brand: 'Rolex' }, // missing reference AND model
  });
  assert('Validation rejects missing reference/model', missingFields.status === 400);

  // 6. Validation — invalid condition
  const badCondition = await request('/api/valuation', {
    method: 'POST',
    headers: { Authorization: 'Bearer test-key' },
    body: {
      brand: 'Rolex', reference: '126610LN',
      condition: 'Perfect', // not in enum
      boxAndPapers: 'Full set (box + papers)',
    },
  });
  assert('Validation rejects invalid condition', badCondition.status === 400);

  // 7. Auth route
  const authRoute = await request('/api/auth/token', {
    method: 'POST',
    body: { email: 'test@test.com', password: 'password' },
  });
  assert('Auth route returns dev token', authRoute.status === 200);
  assert('Dev token value correct', authRoute.body.token === 'dev-token');

  // 8. History route (needs auth)
  const history = await request('/api/valuation/history', {
    headers: { Authorization: 'Bearer test-key' },
  });
  assert('History route returns 200 with auth', history.status === 200);

  console.log(`\n── Results: ${passed} passed, ${failed} failed ──────────\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test runner failed:', err);
  process.exit(1);
});

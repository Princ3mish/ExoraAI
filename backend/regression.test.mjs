/**
 * Regression test script for Exora AI backend
 * Run: node --env-file=.env regression.test.mjs
 */

const BASE = 'http://localhost:4000';
let passed = 0;
let failed = 0;
const results = [];

async function test(name, fn) {
  try {
    const result = await fn();
    results.push({ name, status: '✅ PASS', detail: result });
    passed++;
  } catch (err) {
    results.push({ name, status: '❌ FAIL', detail: err.message });
    failed++;
  }
}

async function post(path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${json.message || JSON.stringify(json)}`);
  return json;
}

async function get(path, token) {
  const res = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${json.message || JSON.stringify(json)}`);
  return json;
}

// ─── Run all tests ────────────────────────────────────────────────────────────

// 1. Health check
await test('Health check + DB connection', async () => {
  const r = await get('/health');
  if (r.status !== 'ok') throw new Error('Status not ok');
  if (r.database !== 'connected') throw new Error('DB not connected');
  return `DB: ${r.database}`;
});

// 2. Register
let token;
await test('POST /api/auth/register', async () => {
  try {
    const r = await post('/api/auth/register', {
      name: 'Regression Bot',
      email: 'regression@exora.ai',
      password: 'Regress@123',
      role: 'USER',
    });
    token = r.data.token;
    return `User: ${r.data.user.email}`;
  } catch (e) {
    // Already exists — login
    const r = await post('/api/auth/login', { email: 'regression@exora.ai', password: 'Regress@123' });
    token = r.data.token;
    return `User (existing login): ${r.data.user.email}`;
  }
});

// 3. GET /api/auth/me — check new Phase S1 fields
await test('GET /api/auth/me (S1 fields present)', async () => {
  const r = await get('/api/auth/me', token);
  const u = r.data.user;
  const missingFields = ['telegramLinked', 'credits', 'plan'].filter(f => u[f] === undefined);
  if (missingFields.length) throw new Error(`Missing fields: ${missingFields.join(', ')}`);
  return `telegramLinked=${u.telegramLinked}, credits=${u.credits}, plan=${u.plan}`;
});

// 4. GET /api/auth/telegram-token
let botUrl;
await test('GET /api/auth/telegram-token', async () => {
  const r = await get('/api/auth/telegram-token', token);
  if (!r.data.token || r.data.token.length !== 64) throw new Error('Token not 64 chars');
  if (!r.data.botUrl.startsWith('https://t.me/')) throw new Error('botUrl wrong format');
  if (!r.data.botUrlWeb) throw new Error('botUrlWeb missing');
  botUrl = r.data.botUrl;
  return `token=${r.data.token.slice(0,16)}... botUrl=${r.data.botUrl}`;
});

// 5. GET /api/auth/telegram-status
await test('GET /api/auth/telegram-status', async () => {
  const r = await get('/api/auth/telegram-status', token);
  if (typeof r.data.linked !== 'boolean') throw new Error('linked field not boolean');
  return `linked=${r.data.linked}`;
});

// 6. GET /api/meetings
await test('GET /api/meetings', async () => {
  const r = await get('/api/meetings', token);
  return `meetings: ${Array.isArray(r.data.meetings) ? r.data.meetings.length : 'N/A'} items`;
});

// 7. GET /api/users
await test('GET /api/users', async () => {
  const r = await get('/api/users', token);
  return `users: ${Array.isArray(r.data.users) ? r.data.users.length : JSON.stringify(r.data).slice(0,40)}`;
});

// 8. GET /api/availability
await test('GET /api/availability', async () => {
  const r = await get('/api/availability', token);
  return `ok: ${JSON.stringify(r).slice(0, 60)}`;
});

// 9. GET /api/events
await test('GET /api/events', async () => {
  const r = await get('/api/events', token);
  return `ok: ${JSON.stringify(r).slice(0, 60)}`;
});

// 10. GET /api/analytics/summary
await test('GET /api/analytics/summary', async () => {
  const r = await get('/api/analytics/summary', token);
  return `ok: ${JSON.stringify(r).slice(0, 60)}`;
});

// 11. GET /api/settings/integrations
await test('GET /api/settings/integrations', async () => {
  const r = await get('/api/settings/integrations', token);
  return `ok: ${JSON.stringify(r).slice(0, 60)}`;
});

// 12. GET /api/bot/session (authenticated — Phase S2 added auth)
await test('GET /api/bot/session (public)', async () => {
  const r = await get('/api/bot/session', token);
  return `ok: ${JSON.stringify(r).slice(0, 60)}`;
});

// 13. Unauthenticated request should 401
await test('Auth middleware blocks unauthenticated (401)', async () => {
  const res = await fetch(`${BASE}/api/auth/me`);
  const json = await res.json();
  if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  return 'Got 401 as expected';
});

// 14. Schema: BotSession userId field exists in DB
await test('BotSession.userId field exists in Prisma schema', async () => {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  const session = await prisma.botSession.findFirst({ select: { userId: true } });
  await prisma.$disconnect();
  return `userId field queryable (value=${session?.userId ?? 'null/none yet'})`;
});

// 15. User schema: new S1 fields exist
await test('User model has telegramId, telegramLinked, credits, plan', async () => {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  const user = await prisma.user.findFirst({
    select: { telegramId: true, telegramLinked: true, telegramLinkToken: true, telegramLinkExpiry: true, credits: true, plan: true }
  });
  await prisma.$disconnect();
  return `All new fields selectable. credits=${user?.credits}, plan=${user?.plan}`;
});

// ─── Print results ────────────────────────────────────────────────────────────

console.log('\n═══════════════════════════════════════════════════');
console.log('          EXORA AI — REGRESSION TEST REPORT');
console.log('═══════════════════════════════════════════════════\n');

for (const r of results) {
  console.log(`${r.status}  ${r.name}`);
  if (r.status.includes('FAIL')) {
    console.log(`         ↳ ${r.detail}`);
  } else {
    console.log(`         ↳ ${r.detail}`);
  }
}

console.log('\n───────────────────────────────────────────────────');
console.log(`  PASSED: ${passed}/${passed + failed}   FAILED: ${failed}/${passed + failed}`);
console.log('───────────────────────────────────────────────────\n');

if (failed > 0) process.exit(1);

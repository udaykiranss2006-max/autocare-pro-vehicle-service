/**
 * HTTP integration tests (requires `npm install`). Starts the real Express app on a random port
 * with a temporary data folder and calls it with fetch (Node 20+).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { useTempDataDir, writeData, testSettings } = require('./helpers');

const dir = useTempDataDir();
const { buildCatalog } = require('../scripts/catalogData');
writeData(dir, 'settings.json', testSettings());
writeData(dir, 'services.json', buildCatalog());
['users', 'vehicles', 'appointments', 'technicians', 'serviceRecords', 'reviews', 'notifications', 'sessions', 'contactMessages'].forEach((n) => writeData(dir, `${n}.json`, []));

const { createApp } = require('../src/app');
const { nowInTz, addDays } = require('../src/utils/time');
const repos = require('../src/repositories');
const bcrypt = require('bcryptjs');

let server;
let base;
const future = addDays(nowInTz('Asia/Kolkata').date, 3);

async function call(method, path, { token, body, cookie, headers = {} } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (_) { /* csv */ }
  return { status: res.status, body: json, text, headers: res.headers };
}

const customer = { fullName: 'Test Customer', email: 'cust@test.local', phone: '9876543210', password: 'Str0ng!Pass', confirmPassword: 'Str0ng!Pass', acceptTerms: true };
let custToken;
let adminToken;
let vehicleId;

test.before(async () => {
  await new Promise((resolve) => {
    server = createApp().listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}/api`;
  await repos.users.insertRecord({ fullName: 'Admin', email: 'admin@test.local', phone: '+919999999999', role: 'admin', active: true, mustChangePassword: false, passwordHash: await bcrypt.hash('Adm1n!Pass', 4), passwordVersion: 0 });
});
test.after(() => server.close());

test('health + 404 + error format', async () => {
  assert.equal((await call('GET', '/health')).status, 200);
  const nf = await call('GET', '/does-not-exist');
  assert.equal(nf.status, 404);
  assert.equal(nf.body.success, false);
  assert.ok(nf.body.error.code && nf.body.error.message);
});

test('register: validation, role injection ignored, duplicates rejected', async () => {
  const bad = await call('POST', '/auth/register', { body: { email: 'x' } });
  assert.equal(bad.status, 422);
  assert.ok(bad.body.error.details.email);
  const ok = await call('POST', '/auth/register', { body: { ...customer, role: 'admin' } });
  assert.equal(ok.status, 201);
  assert.equal(ok.body.data.user.role, 'customer');
  assert.equal(ok.body.data.user.passwordHash, undefined);
  const dup = await call('POST', '/auth/register', { body: customer });
  assert.equal(dup.status, 409);
});

test('login: invalid credentials rejected; valid login returns token + httpOnly refresh cookie', async () => {
  const bad = await call('POST', '/auth/login', { body: { email: customer.email, password: 'Wrong!Pass1' } });
  assert.equal(bad.status, 401);
  const ok = await call('POST', '/auth/login', { body: { email: customer.email, password: customer.password } });
  assert.equal(ok.status, 200);
  custToken = ok.body.data.accessToken;
  const cookie = ok.headers.get('set-cookie');
  assert.match(cookie, /acp_rt=/);
  assert.match(cookie, /HttpOnly/i);
  const me = await call('GET', '/auth/me', { token: custToken });
  assert.equal(me.body.data.user.email, customer.email);
  // refresh requires the app header and rotates the token
  const rt = cookie.split(';')[0];
  assert.equal((await call('POST', '/auth/refresh', { cookie: rt })).status, 403);
  const r1 = await call('POST', '/auth/refresh', { cookie: rt, headers: { 'X-Requested-With': 'AutoCarePro' } });
  assert.equal(r1.status, 200);
  const reuse = await call('POST', '/auth/refresh', { cookie: rt, headers: { 'X-Requested-With': 'AutoCarePro' } });
  assert.equal(reuse.status, 401, 'reused refresh token must be rejected');
  const adm = await call('POST', '/auth/login', { body: { email: 'admin@test.local', password: 'Adm1n!Pass' } });
  adminToken = adm.body.data.accessToken;
});

test('authorization: missing token 401, customer on admin endpoints 403, forged token 401', async () => {
  assert.equal((await call('GET', '/vehicles')).status, 401);
  assert.equal((await call('GET', '/dashboard/admin', { token: custToken })).status, 403);
  assert.equal((await call('GET', '/users', { token: custToken })).status, 403);
  assert.equal((await call('POST', '/services', { token: custToken, body: {} })).status, 403);
  assert.equal((await call('PATCH', '/users/x/role', { token: custToken, body: { role: 'admin' } })).status, 403);
  assert.equal((await call('GET', '/dashboard/admin', { token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.bad' })).status, 401);
  assert.equal((await call('GET', '/dashboard/admin', { token: adminToken })).status, 200);
});

test('vehicles + booking flow over HTTP, with conflict and ownership checks', async () => {
  const badVeh = await call('POST', '/vehicles', { token: custToken, body: { type: 'boat' } });
  assert.equal(badVeh.status, 422);
  const v = await call('POST', '/vehicles', { token: custToken, body: { type: 'car', brand: 'Test', model: 'X', registrationNumber: 'MH12AB1234', year: 2019, fuelType: 'diesel', odometer: 30000 } });
  assert.equal(v.status, 201);
  vehicleId = v.body.data.id;

  const slots = await call('GET', `/workshops/ws_test/availability?date=${future}`);
  assert.equal(slots.status, 200);
  assert.ok(slots.body.data.slots.length > 0);

  const booking = { vehicleId, serviceIds: ['svc_001'], workshopId: 'ws_test', date: future, time: '09:00', acceptPolicy: true, estimatedTotal: 1 };
  const created = await call('POST', '/appointments', { token: custToken, body: booking });
  assert.equal(created.status, 201);
  assert.ok(created.body.data.estimatedTotal > 1, 'client-supplied totals are ignored');

  // second customer tries the same full slot with their own vehicle
  await call('POST', '/auth/register', { body: { ...customer, email: 'other@test.local' } });
  const other = (await call('POST', '/auth/login', { body: { email: 'other@test.local', password: customer.password } })).body.data.accessToken;
  const ov = await call('POST', '/vehicles', { token: other, body: { type: 'car', brand: 'Other', model: 'Y', registrationNumber: 'MH12AB9999', year: 2019, fuelType: 'petrol', odometer: 1 } });
  const conflict = await call('POST', '/appointments', { token: other, body: { ...booking, vehicleId: ov.body.data.id } });
  assert.equal(conflict.status, 409);
  assert.equal(conflict.body.error.code, 'SLOT_UNAVAILABLE');

  // IDOR checks
  assert.equal((await call('GET', `/vehicles/${vehicleId}`, { token: other })).status, 404);
  assert.equal((await call('GET', `/appointments/${created.body.data.id}`, { token: other })).status, 404);
  const foreign = await call('POST', '/appointments', { token: other, body: { ...booking, time: '11:00' } });
  assert.equal(foreign.status, 422, 'cannot book with somebody else\'s vehicle');

  // customers cannot change status
  assert.equal((await call('PATCH', `/appointments/${created.body.data.id}/status`, { token: custToken, body: { status: 'confirmed' } })).status, 403);
  const confirmed = await call('PATCH', `/appointments/${created.body.data.id}/status`, { token: adminToken, body: { status: 'confirmed' } });
  assert.equal(confirmed.body.data.status, 'confirmed');

  const cancel = await call('PATCH', `/appointments/${created.body.data.id}/cancel`, { token: custToken, body: { reason: 'Change of plans' } });
  assert.equal(cancel.status, 200);
  assert.equal(cancel.body.data.status, 'cancelled');

  const notes = await call('GET', '/notifications', { token: custToken });
  assert.ok(notes.body.meta.unreadCount >= 2);
});

test('reports export CSV for admin only', async () => {
  assert.equal((await call('GET', '/reports/export?type=appointments', { token: custToken })).status, 403);
  const csv = await call('GET', `/reports/export?type=appointments&from=${addDays(future, -10)}&to=${addDays(future, 10)}`, { token: adminToken });
  assert.equal(csv.status, 200);
  assert.match(csv.text, /Reference,Date,Time/);
});

test('malformed JSON body returns 400, not a crash', async () => {
  const res = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad json' });
  assert.equal(res.status, 400);
});

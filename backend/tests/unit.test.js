/**
 * Unit/service-level tests. Run with:  npm test   (uses the built-in node:test runner)
 * These tests exercise JSON persistence, validation, availability, booking conflicts,
 * vehicle ownership (IDOR protection) and status-transition rules without HTTP.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { useTempDataDir, writeData, testSettings } = require('./helpers');

const dir = useTempDataDir();
const { buildCatalog } = require('../scripts/catalogData');
writeData(dir, 'settings.json', testSettings());
writeData(dir, 'services.json', buildCatalog());

const store = require('../src/repositories/jsonStore');
const repos = require('../src/repositories');
const { validate } = require('../src/validators/validate');
const schemas = require('../src/validators/schemas');
const workshopService = require('../src/services/workshopService');
const vehicleService = require('../src/services/vehicleService');
const appointmentService = require('../src/services/appointmentService');
const recordService = require('../src/services/serviceRecordService');
const reviewService = require('../src/services/reviewService');
const { nowInTz, addDays } = require('../src/utils/time');
const { toCsv } = require('../src/utils/csv');

const today = nowInTz('Asia/Kolkata').date;
const future = addDays(today, 2);

async function makeUser(role, name) {
  return repos.users.insertRecord({ fullName: name, email: `${name.toLowerCase().replace(/\s/g, '')}@test.local`, phone: '+919876543210', role, active: true, passwordHash: 'x', passwordVersion: 0 });
}

test('jsonStore: missing file returns empty array, settings returns object', async () => {
  assert.deepEqual(await store.readJsonFile('reviews.json'), []);
  fs.unlinkSync(path.join(dir, 'settings.json'));
  assert.deepEqual(await store.readJsonFile('settings.json'), {});
  writeData(dir, 'settings.json', testSettings());
});

test('jsonStore: empty file is treated as empty data', async () => {
  fs.writeFileSync(path.join(dir, 'contactMessages.json'), '   ');
  assert.deepEqual(await store.readJsonFile('contactMessages.json'), []);
});

test('jsonStore: concurrent inserts are serialized (no lost writes)', async () => {
  await Promise.all(Array.from({ length: 50 }, (_, i) => repos.contactMessages.insertRecord({ n: i })));
  const all = await repos.contactMessages.findAll();
  assert.equal(all.length, 50);
  assert.equal(new Set(all.map((m) => m.id)).size, 50);
});

test('jsonStore: malformed JSON recovers from .bak, otherwise fails safely', async () => {
  const file = path.join(dir, 'contactMessages.json');
  await repos.contactMessages.insertRecord({ n: 'extra' }); // creates .bak of previous version
  fs.writeFileSync(file, '{ this is not json');
  const recovered = await store.readJsonFile('contactMessages.json');
  assert.ok(Array.isArray(recovered) && recovered.length >= 50);
  fs.writeFileSync(file, '[broken');
  fs.writeFileSync(`${file}.bak`, 'also broken');
  await assert.rejects(store.readJsonFile('contactMessages.json'), (err) => err.status === 500 && err.code === 'STORAGE_CORRUPT');
  fs.writeFileSync(file, '[]');
});

test('jsonStore: wrong top-level shape is rejected', async () => {
  fs.writeFileSync(path.join(dir, 'reviews.json'), '{"not":"an array"}');
  fs.rmSync(path.join(dir, 'reviews.json.bak'), { force: true });
  await assert.rejects(store.readJsonFile('reviews.json'), (err) => err.code === 'STORAGE_CORRUPT');
  fs.writeFileSync(path.join(dir, 'reviews.json'), '[]');
});

test('jsonStore: rejects path traversal in file names', async () => {
  await assert.rejects(store.readJsonFile('../secrets.json'));
});

test('validation: registration schema rejects weak password, bad email/phone and strips unknown fields', () => {
  assert.throws(() => validate({ fullName: 'A', email: 'bad', phone: '123', password: 'weak', confirmPassword: 'weak', acceptTerms: false }, schemas.auth.register), (err) => {
    assert.equal(err.status, 422);
    for (const f of ['fullName', 'email', 'phone', 'password', 'acceptTerms']) assert.ok(err.details[f], `expected error for ${f}`);
    return true;
  });
  const ok = validate({ fullName: 'Asha Rao', email: 'ASHA@Example.com ', phone: '98765 43210', password: 'Str0ng!Pass', confirmPassword: 'Str0ng!Pass', acceptTerms: true, role: 'admin' }, schemas.auth.register);
  assert.equal(ok.email, 'asha@example.com');
  assert.equal(ok.phone, '+919876543210');
  assert.equal(ok.role, undefined, 'role must never be accepted from the client');
});

test('availability: closed dates, past dates and capacity are respected', () => {
  const s = testSettings();
  const ws = s.workshops[0];
  const past = workshopService.computeAvailability({ workshop: ws, date: addDays(today, -1), booking: s.booking, timezone: 'Asia/Kolkata', existing: [] });
  assert.equal(past.closed, true);
  const closed = workshopService.computeAvailability({ workshop: { ...ws, closedDates: [future] }, date: future, booking: s.booking, timezone: 'Asia/Kolkata', existing: [] });
  assert.equal(closed.closed, true);
  const open = workshopService.computeAvailability({ workshop: ws, date: future, booking: s.booking, timezone: 'Asia/Kolkata', existing: [{ id: 'a', workshopId: 'ws_test', date: future, time: '10:00', status: 'confirmed' }] });
  assert.equal(open.slots.length, 9);
  assert.equal(open.slots.find((x) => x.time === '10:00').available, false);
  assert.equal(open.slots.find((x) => x.time === '11:00').available, true);
  const tooFar = workshopService.computeAvailability({ workshop: ws, date: addDays(today, 90), booking: s.booking, timezone: 'Asia/Kolkata', existing: [] });
  assert.equal(tooFar.closed, true);
});

let customerA;
let customerB;
let vehicleA;

test('vehicles: registration number validated, duplicates rejected, ownership enforced', async () => {
  customerA = await makeUser('customer', 'Customer A');
  customerB = await makeUser('customer', 'Customer B');
  const base = { type: 'car', brand: 'Test', model: 'One', year: 2020, fuelType: 'petrol', odometer: 1000 };
  await assert.rejects(vehicleService.create(customerA, { ...base, registrationNumber: 'NOT A PLATE' }), (e) => e.status === 422);
  vehicleA = await vehicleService.create(customerA, { ...base, registrationNumber: 'ts 09 ea 1234' });
  assert.equal(vehicleA.registrationNumber, 'TS09EA1234');
  await vehicleService.create(customerA, { ...base, registrationNumber: '22BH1234AA' });
  await assert.rejects(vehicleService.create(customerB, { ...base, registrationNumber: 'TS09EA1234' }), (e) => e.status === 409);
  // IDOR: customer B cannot read, edit or delete customer A's vehicle
  await assert.rejects(vehicleService.get(customerB, vehicleA.id), (e) => e.status === 404);
  await assert.rejects(vehicleService.update(customerB, vehicleA.id, { ...base, registrationNumber: 'TS09EA1234' }), (e) => e.status === 404);
  await assert.rejects(vehicleService.remove(customerB, vehicleA.id), (e) => e.status === 404);
  const listB = await vehicleService.list(customerB, {});
  assert.equal(listB.items.length, 0);
});

let appt;

test('booking: server computes price, rejects unsupported vehicle types and foreign vehicles', async () => {
  await assert.rejects(
    appointmentService.create(customerB, { vehicleId: vehicleA.id, serviceIds: ['svc_001'], workshopId: 'ws_test', date: future, time: '10:00', acceptPolicy: true }),
    (e) => e.status === 422,
  );
  const est = await appointmentService.estimate({ vehicleId: vehicleA.id, serviceIds: ['svc_001', 'svc_017'] }, customerA);
  assert.equal(est.items.length, 2);
  assert.ok(est.total > est.subtotal, 'GST must be added');
  appt = await appointmentService.create(customerA, { vehicleId: vehicleA.id, serviceIds: ['svc_001'], workshopId: 'ws_test', date: future, time: '10:00', acceptPolicy: true });
  assert.equal(appt.status, 'pending');
  assert.match(appt.reference, /^ACP-\d{8}-[A-Z2-9]{6}$/);
});

test('booking: slot capacity is enforced (conflicting appointment rejected)', async () => {
  const other = await vehicleService.create(customerB, { type: 'car', brand: 'B', model: 'Two', year: 2021, fuelType: 'diesel', odometer: 5, registrationNumber: 'KA01AB1234' });
  await assert.rejects(
    appointmentService.create(customerB, { vehicleId: other.id, serviceIds: ['svc_001'], workshopId: 'ws_test', date: future, time: '10:00', acceptPolicy: true }),
    (e) => e.status === 409 && e.code === 'SLOT_UNAVAILABLE',
  );
  // simultaneous requests for one remaining slot: exactly one succeeds
  const v1 = await vehicleService.create(customerB, { type: 'car', brand: 'B', model: 'Three', year: 2021, fuelType: 'diesel', odometer: 5, registrationNumber: 'KA01AB1235' });
  const results = await Promise.allSettled([
    appointmentService.create(customerB, { vehicleId: other.id, serviceIds: ['svc_003'], workshopId: 'ws_test', date: future, time: '12:00', acceptPolicy: true }),
    appointmentService.create(customerB, { vehicleId: v1.id, serviceIds: ['svc_003'], workshopId: 'ws_test', date: future, time: '12:00', acceptPolicy: true }),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(results.filter((r) => r.status === 'rejected' && r.reason.code === 'SLOT_UNAVAILABLE').length, 1);
});

test('booking: past dates and out-of-hours times are rejected', async () => {
  await assert.rejects(
    appointmentService.create(customerA, { vehicleId: vehicleA.id, serviceIds: ['svc_003'], workshopId: 'ws_test', date: addDays(today, -1), time: '10:00', acceptPolicy: true }),
    (e) => e.status === 409,
  );
  await assert.rejects(
    appointmentService.create(customerA, { vehicleId: vehicleA.id, serviceIds: ['svc_003'], workshopId: 'ws_test', date: addDays(today, 4), time: '21:00', acceptPolicy: true }),
    (e) => e.status === 409,
  );
});

test('appointments: customers only see their own; status rules enforced by role', async () => {
  await assert.rejects(appointmentService.get(customerB, appt.id), (e) => e.status === 404);
  await assert.rejects(appointmentService.updateStatus(customerA, appt.id, { status: 'confirmed' }), (e) => e.status === 404 || e.status === 403);
  const admin = await makeUser('admin', 'Admin User');
  const techUser = await makeUser('technician', 'Tech User');
  const tech = await repos.technicians.insertRecord({ name: 'Tech User', workshopId: 'ws_test', specializations: [], active: true, userId: techUser.id });
  await assert.rejects(appointmentService.updateStatus(admin, appt.id, { status: 'completed' }), (e) => e.code === 'INVALID_TRANSITION');
  await appointmentService.updateStatus(admin, appt.id, { status: 'confirmed' });
  // unassigned technician cannot see the job
  await assert.rejects(appointmentService.get(techUser, appt.id), (e) => e.status === 404);
  await appointmentService.update(admin, appt.id, { technicianId: tech.id });
  await assert.rejects(appointmentService.updateStatus(techUser, appt.id, { status: 'checked_in' }), (e) => e.code === 'INVALID_TRANSITION');
  await appointmentService.updateStatus(admin, appt.id, { status: 'checked_in' });
  await appointmentService.updateStatus(techUser, appt.id, { status: 'in_progress' });
  // cannot complete without recorded work
  await assert.rejects(appointmentService.updateStatus(techUser, appt.id, { status: 'completed' }), (e) => e.status === 422);
  await recordService.getForAppointment(techUser, appt.id);
  await assert.rejects(recordService.updateForAppointment(techUser, appt.id, { discount: { type: 'flat', value: 100 } }), (e) => e.status === 403);
  const rec = await recordService.updateForAppointment(techUser, appt.id, { labourItems: [{ description: 'Service', hours: 2, rate: 500 }], parts: [{ name: 'Oil', quantity: 1, unitPrice: 1000 }] });
  assert.equal(rec.subtotal, 2000);
  assert.equal(rec.total, 2360);
  const done = await appointmentService.updateStatus(techUser, appt.id, { status: 'completed' });
  assert.equal(done.status, 'completed');
  const last = done.statusHistory[done.statusHistory.length - 1];
  assert.equal(last.byUserId, techUser.id);
  assert.ok(last.at);
  const finalRec = await repos.serviceRecords.findOne((r) => r.appointmentId === appt.id);
  assert.match(finalRec.invoice.number, /^INV-\d{4}-\d{6}$/);
  assert.equal(finalRec.invoice.paymentStatus, 'unpaid');
  // customer B cannot read customer A's invoice
  await assert.rejects(recordService.invoice(customerB, finalRec.id), (e) => e.status === 404);
  const inv = await recordService.invoice(customerA, finalRec.id);
  assert.equal(inv.record.total, 2360);
  // payment: customer cannot record; demo payments are labelled
  await assert.rejects(recordService.recordPayment(customerA, finalRec.id, { method: 'cash', amount: 10 }), (e) => e.status === 403);
  await assert.rejects(recordService.recordPayment(admin, finalRec.id, { method: 'cash', amount: 99999 }), (e) => e.status === 422);
  const paid = await recordService.recordPayment(admin, finalRec.id, { method: 'cash', amount: 2360 });
  assert.equal(paid.invoice.paymentStatus, 'paid');
});

test('reviews: only completed appointments, one review per appointment', async () => {
  await assert.rejects(reviewService.create(customerB, { appointmentId: appt.id, rating: 5, comment: 'Great service' }), (e) => e.status === 404);
  const r = await reviewService.create(customerA, { appointmentId: appt.id, rating: 5, comment: 'Great service' });
  assert.equal(r.status, 'pending');
  await assert.rejects(reviewService.create(customerA, { appointmentId: appt.id, rating: 4, comment: 'Again' }), (e) => e.status === 409);
  const pub = await reviewService.publicList({});
  assert.equal(pub.items.length, 0, 'unmoderated reviews are not public');
});

test('cancel: completed appointments cannot be cancelled', async () => {
  await assert.rejects(appointmentService.cancel(customerA, appt.id, { reason: 'Changed plans' }), (e) => e.status === 400);
});

test('csv: formula injection is neutralised', () => {
  const csv = toCsv([{ a: '=HYPERLINK("x")', b: 'plain, text' }], [{ label: 'A', key: 'a' }, { label: 'B', key: 'b' }]);
  assert.ok(csv.includes(`"'=HYPERLINK(""x"")"`));
  assert.ok(csv.includes('"plain, text"'));
});

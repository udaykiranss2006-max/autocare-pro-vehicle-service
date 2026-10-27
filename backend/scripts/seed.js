/**
 * Initializes the JSON data files.
 *   npm run seed          -> creates missing/empty files, never overwrites existing data
 *   npm run seed:reset    -> DELETES all data and recreates sample data (asks for --yes confirmation)
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { env } = require('../src/config/env');
const defaults = require('../src/config/defaultSettings');
const { buildCatalog } = require('./catalogData');
const { passwordStrength } = require('../src/validators/schemas');
const { newId } = require('../src/utils/id');
const { nowInTz, addDays, toIso } = require('../src/utils/time');

const reset = process.argv.includes('--reset');
const confirmed = process.argv.includes('--yes');
const FILES = ['users', 'vehicles', 'services', 'appointments', 'technicians', 'serviceRecords', 'reviews', 'notifications', 'settings', 'sessions', 'contactMessages'];

const file = (n) => path.join(env.dataDir, `${n}.json`);
const isEmpty = (n) => {
  if (!fs.existsSync(file(n))) return true;
  const raw = fs.readFileSync(file(n), 'utf8').trim();
  if (!raw) return true;
  try {
    const d = JSON.parse(raw);
    return Array.isArray(d) ? d.length === 0 : Object.keys(d).length === 0;
  } catch (_) {
    console.error(`  ! ${n}.json contains invalid JSON. Fix it or run "npm run seed:reset -- --yes".`);
    process.exit(1);
  }
  return false;
};
const read = (n) => (isEmpty(n) ? (n === 'settings' ? {} : []) : JSON.parse(fs.readFileSync(file(n), 'utf8')));
const write = (n, data) => {
  const tmp = `${file(n)}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file(n));
};

async function main() {
  if (reset && !confirmed) {
    console.log('\n  This will ERASE all AutoCare Pro data in', env.dataDir);
    console.log('  Re-run with:  npm run seed:reset -- --yes\n');
    process.exit(1);
  }
  fs.mkdirSync(env.dataDir, { recursive: true });
  console.log(`Seeding data in ${env.dataDir}${reset ? ' (RESET)' : ''}`);
  if (reset) FILES.forEach((n) => fs.existsSync(file(n)) && fs.unlinkSync(file(n)));

  const now = new Date().toISOString();

  if (isEmpty('settings')) {
    const settings = JSON.parse(JSON.stringify(defaults));
    settings.offers = [
      { id: 'off_monsoon', kind: 'offer', title: 'Monsoon Safety Check', description: 'Sample offer: 15% off brake inspection, tyre inspection and battery health checks.', code: 'MONSOON15', discountPercent: 15, packagePrice: null, serviceIds: ['svc_017', 'svc_022', 'svc_028'], validUntil: null, active: true, createdAt: now },
      { id: 'off_first', kind: 'offer', title: 'First Service Welcome', description: 'Sample offer: 10% off your first periodic maintenance service.', code: 'WELCOME10', discountPercent: 10, packagePrice: null, serviceIds: ['svc_001'], validUntil: null, active: true, createdAt: now },
      { id: 'pkg_care', kind: 'package', title: 'Complete Care Package', description: 'Sample package: periodic service + wheel alignment + balancing + exterior wash.', code: '', discountPercent: 0, packagePrice: 4999, serviceIds: ['svc_001', 'svc_024', 'svc_023', 'svc_040'], validUntil: null, active: true, createdAt: now },
      { id: 'pkg_summer', kind: 'package', title: 'Summer AC Package', description: 'Sample package: AC inspection, gas refill and cabin cooling maintenance.', code: '', discountPercent: 0, packagePrice: 3299, serviceIds: ['svc_035', 'svc_036', 'svc_039'], validUntil: null, active: true, createdAt: now },
    ];
    write('settings', settings);
    console.log('  + settings.json (sample business details, workshops, offers)');
  } else console.log('  = settings.json kept');

  if (isEmpty('services')) {
    write('services', buildCatalog());
    console.log('  + services.json (sample catalog with sample INR estimates)');
  } else console.log('  = services.json kept');

  if (isEmpty('technicians')) {
    const t = (id, name, specializations, workshopId, experienceYears) => ({ id, name, phone: '', email: '', specializations, workshopId, experienceYears, active: true, userId: null, isSample: true, createdAt: now, updatedAt: now });
    write('technicians', [
      t('tec_001', 'Sample Technician - Engine', ['Engine', 'Diagnostics', 'Transmission'], 'ws_main', 8),
      t('tec_002', 'Sample Technician - Brakes & Tyres', ['Brakes', 'Tyres', 'Suspension'], 'ws_main', 5),
      t('tec_003', 'Sample Technician - Electrical & AC', ['Electrical', 'Battery', 'Air Conditioning'], 'ws_express', 6),
      t('tec_004', 'Sample Technician - Bodywork', ['Dent & Paint', 'Detailing'], 'ws_express', 4),
    ]);
    console.log('  + technicians.json (sample technician profiles)');
  } else console.log('  = technicians.json kept');

  ['vehicles', 'appointments', 'serviceRecords', 'reviews', 'notifications', 'sessions', 'contactMessages', 'users'].forEach((n) => {
    if (!fs.existsSync(file(n)) || !fs.readFileSync(file(n), 'utf8').trim()) {
      write(n, []);
      console.log(`  + ${n}.json (empty)`);
    }
  });

  const users = read('users');
  const rounds = env.bcryptRounds;

  // ---------- initial administrator ----------
  if (!users.some((u) => u.role === 'admin')) {
    const email = (process.env.SEED_ADMIN_EMAIL || '').trim().toLowerCase();
    const password = process.env.SEED_ADMIN_PASSWORD || '';
    const weak = passwordStrength(password);
    if (!email || !password) {
      console.log('  ! No admin created: set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in backend/.env and run "npm run seed" again.');
    } else if (weak) {
      console.log(`  ! No admin created: SEED_ADMIN_PASSWORD is too weak (${weak}).`);
    } else {
      users.push({ id: newId('usr'), fullName: process.env.SEED_ADMIN_NAME || 'System Administrator', email, phone: '+910000000000', address: '', role: 'admin', active: true, mustChangePassword: true, passwordHash: await bcrypt.hash(password, rounds), passwordVersion: 0, createdAt: now, updatedAt: now });
      console.log(`  + admin account ${email} (must change password at first login)`);
    }
  } else console.log('  = admin account already exists');

  // ---------- optional demo accounts + demo data ----------
  const demoPw = process.env.SEED_DEMO_PASSWORD || '';
  if (demoPw && env.isProd) console.log('  ! Demo accounts are never created when NODE_ENV=production.');
  else if (demoPw && passwordStrength(demoPw)) console.log(`  ! Demo accounts skipped: SEED_DEMO_PASSWORD is too weak (${passwordStrength(demoPw)}).`);
  else if (demoPw && !users.some((u) => u.email === 'customer@autocarepro.local')) {
    const hash = await bcrypt.hash(demoPw, rounds);
    const mk = (fullName, email, role, phone) => ({ id: newId('usr'), fullName, email, phone, address: role === 'customer' ? 'Sample address for demo customer' : '', role, active: true, mustChangePassword: false, passwordHash: hash, passwordVersion: 0, isDemo: true, createdAt: now, updatedAt: now });
    const advisor = mk('Demo Service Advisor', 'advisor@autocarepro.local', 'advisor', '+919000000001');
    const tech = mk('Demo Technician', 'technician@autocarepro.local', 'technician', '+919000000002');
    const customer = mk('Demo Customer', 'customer@autocarepro.local', 'customer', '+919000000003');
    users.push(advisor, tech, customer);

    const technicians = read('technicians');
    const t1 = technicians.find((t) => t.id === 'tec_001');
    if (t1 && !t1.userId) {
      t1.userId = tech.id;
      t1.name = 'Demo Technician';
      write('technicians', technicians);
    }

    const vehicles = read('vehicles');
    const v1 = { id: newId('veh'), ownerId: customer.id, type: 'car', brand: 'Sample Brand', model: 'Hatchback', registrationNumber: 'TS09EA1234', year: 2020, fuelType: 'petrol', odometer: 42000, vin: '', notes: 'Demo vehicle', createdAt: now, updatedAt: now };
    const v2 = { id: newId('veh'), ownerId: customer.id, type: 'motorcycle', brand: 'Sample Moto', model: 'Commuter 125', registrationNumber: 'TS10AB4321', year: 2022, fuelType: 'petrol', odometer: 9000, vin: '', notes: '', createdAt: now, updatedAt: now };
    vehicles.push(v1, v2);
    write('vehicles', vehicles);

    const catalog = read('services');
    const tz = defaults.business.timezone;
    const today = nowInTz(tz).date;
    const svc = (id, factor = 1) => {
      const s = catalog.find((c) => c.id === id);
      return { serviceId: s.id, name: s.name, category: s.category, bookingMode: s.bookingMode, durationMinutes: s.durationMinutes, price: Math.round((s.priceFrom * factor) / 10) * 10 };
    };
    const snap = (v) => ({ type: v.type, brand: v.brand, model: v.model, registrationNumber: v.registrationNumber, year: v.year, fuelType: v.fuelType, odometer: v.odometer });
    const est = (items) => {
      const subtotal = items.reduce((s, i) => s + i.price, 0);
      const tax = Math.round(subtotal * 18) / 100;
      return { subtotal, discount: 0, offer: null, taxPercent: 18, tax, total: Math.round((subtotal + tax) * 100) / 100 };
    };
    const hist = (status, note, by = customer) => ({ status, at: now, byUserId: by.id, byName: by.fullName, byRole: by.role, note });
    const appt = (ref, v, items, date, time, status, extra = {}) => {
      const e = est(items);
      return {
        id: newId('apt'), reference: ref, customerId: customer.id, customerSnapshot: { fullName: customer.fullName, email: customer.email, phone: customer.phone },
        vehicleId: v.id, vehicleSnapshot: snap(v), services: items, workshopId: 'ws_main', workshopName: defaults.workshops[0].name, date, time,
        scheduledAt: toIso(date, time, tz), estimatedDurationMinutes: items.reduce((s, i) => s + i.durationMinutes, 0), estimate: e, estimatedTotal: e.total,
        requiresInspection: items.some((i) => i.bookingMode !== 'direct'), problemCategory: 'Routine service', problemDescription: '',
        pickup: { pickupRequested: false, dropRequested: false, address: '', contactPhone: customer.phone, status: 'not_requested' },
        status, statusHistory: [hist('pending', 'Booking request submitted')], advisorId: null, advisorName: null, technicianId: null, technicianName: null,
        estimatedCompletionAt: null, customerNotes: '', internalNotes: [], cancellation: null, rescheduleCount: 0, reminderSentAt: null, isDemo: true, policyAcceptedAt: now, createdAt: now, updatedAt: now, ...extra,
      };
    };
    const pastDate = addDays(today, -20);
    const completed = appt(`ACP-${pastDate.replace(/-/g, '')}-DEMO01`, v1, [svc('svc_001'), svc('svc_023')], pastDate, '10:00', 'completed', {
      advisorId: advisor.id, advisorName: advisor.fullName, technicianId: 'tec_001', technicianName: 'Demo Technician', completedAt: toIso(pastDate, '16:00', tz),
      statusHistory: [hist('pending', 'Booking request submitted'), hist('confirmed', '', advisor), hist('checked_in', '', advisor), hist('in_progress', '', tech), hist('completed', 'Demo data', tech)],
    });
    const upcomingDate = addDays(today, 3);
    const confirmed = appt(`ACP-${upcomingDate.replace(/-/g, '')}-DEMO02`, v1, [svc('svc_036')], upcomingDate, '11:00', 'confirmed', {
      advisorId: advisor.id, advisorName: advisor.fullName, technicianId: 'tec_001', technicianName: 'Demo Technician',
      statusHistory: [hist('pending', 'Booking request submitted'), hist('confirmed', 'Demo data', advisor)],
    });
    const pendingDate = addDays(today, 5);
    const pending = appt(`ACP-${pendingDate.replace(/-/g, '')}-DEMO03`, v2, [svc('svc_003', 0.5), svc('svc_017', 0.5)], pendingDate, '15:00', 'pending');
    const appointments = read('appointments');
    appointments.push(completed, confirmed, pending);
    write('appointments', appointments);

    const labour = [{ description: 'Periodic service labour', hours: 2, rate: 600, amount: 1200 }, { description: 'Wheel balancing (4 wheels)', hours: 0.5, rate: 600, amount: 300 }];
    const parts = [{ name: 'Engine oil 5W-30 (3.5 L) - sample', partNumber: 'SAMPLE-OIL', quantity: 1, unitPrice: 1650, amount: 1650 }, { name: 'Oil filter - sample', partNumber: 'SAMPLE-OF', quantity: 1, unitPrice: 350, amount: 350 }, { name: 'Balancing weights', partNumber: '', quantity: 4, unitPrice: 40, amount: 160 }];
    const labourTotal = 1500;
    const partsTotal = 2160;
    const subtotal = labourTotal + partsTotal;
    const taxAmount = Math.round(subtotal * 18) / 100;
    const total = Math.round((subtotal + taxAmount) * 100) / 100;
    const settings = read('settings');
    settings.counters = { invoice: (settings.counters?.invoice || 0) + 1 };
    write('settings', settings);
    const records = read('serviceRecords');
    records.push({
      id: newId('rec'), appointmentId: completed.id, appointmentRef: completed.reference, customerId: customer.id, vehicleId: v1.id, vehicleSnapshot: snap(v1), workshopId: 'ws_main',
      technicianId: 'tec_001', technicianName: 'Demo Technician', servicesPerformed: completed.services.map((s) => ({ serviceId: s.serviceId, name: s.name })),
      checklist: [{ label: 'Engine oil and filter change', done: true }, { label: 'Wheel balancing', done: true }, { label: 'Final quality check and road test', done: true }],
      labourItems: labour, parts, labourTotal, partsTotal, subtotal, discount: { type: 'flat', value: 0, amount: 0 }, taxPercent: 18, taxAmount, total,
      technicianNotes: 'Demo record. Front brake pads at 40% - recheck at next service.', odometerAtService: 42000, nextServiceDate: addDays(today, 160), nextServiceOdometer: 52000,
      status: 'finalized', completedAt: toIso(pastDate, '16:00', tz), finalizedBy: { userId: tech.id, name: tech.fullName, role: 'technician' }, maintenanceReminderSentAt: null, isDemo: true,
      invoice: { number: `INV-${new Date().getFullYear()}-${String(settings.counters.invoice).padStart(6, '0')}`, issuedAt: toIso(pastDate, '16:00', tz), paymentStatus: 'unpaid', amountPaid: 0, amountReceived: 0, balance: total, payments: [] },
      createdAt: now, updatedAt: now,
    });
    write('serviceRecords', records);
    console.log('  + demo accounts: customer@ / advisor@ / technician@autocarepro.local (password = SEED_DEMO_PASSWORD)');
    console.log('  + demo vehicles, 3 demo appointments, 1 demo invoice (all marked isDemo)');
  }

  write('users', users);
  console.log('Done.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

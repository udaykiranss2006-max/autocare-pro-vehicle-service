const { serviceRecords, appointments, services, vehicles, settings, users, mutateJsonFile } = require('../repositories');
const ApiError = require('../utils/ApiError');
const { newId } = require('../utils/id');
const { round2 } = require('../utils/money');
const { paginate, includesText } = require('../utils/pagination');
const { WORK_STATUSES, MANAGER_ROLES } = require('../config/constants');
const appointmentService = require('./appointmentService');
const notificationService = require('./notificationService');

const isManager = (u) => MANAGER_ROLES.includes(u.role);

function computeTotals(record, gstPercent) {
  const labourItems = (record.labourItems || []).map((l) => ({ ...l, amount: round2(l.hours * l.rate) }));
  const parts = (record.parts || []).map((p) => ({ ...p, amount: round2(p.quantity * p.unitPrice) }));
  const labourTotal = round2(labourItems.reduce((s, l) => s + l.amount, 0));
  const partsTotal = round2(parts.reduce((s, p) => s + p.amount, 0));
  const subtotal = round2(labourTotal + partsTotal);
  const d = record.discount || { type: 'flat', value: 0 };
  let discountAmount = d.type === 'percent' ? round2((subtotal * Math.min(d.value, 100)) / 100) : round2(d.value || 0);
  discountAmount = Math.min(discountAmount, subtotal);
  const taxable = round2(subtotal - discountAmount);
  const taxAmount = round2((taxable * gstPercent) / 100);
  return { labourItems, parts, labourTotal, partsTotal, subtotal, discount: { ...d, amount: discountAmount }, taxPercent: gstPercent, taxAmount, total: round2(taxable + taxAmount) };
}

async function buildDraft(appt) {
  const catalog = await services.findAll();
  const s = await settings.get();
  const checklist = [];
  appt.services.forEach((svc) => {
    const full = catalog.find((c) => c.id === svc.serviceId);
    (full?.inclusions || [svc.name]).slice(0, 5).forEach((label) => checklist.push({ label: `${svc.name}: ${label}`, done: false }));
  });
  checklist.push({ label: 'Final quality check and road test', done: false });
  const now = new Date().toISOString();
  return {
    id: newId('rec'),
    appointmentId: appt.id,
    appointmentRef: appt.reference,
    customerId: appt.customerId,
    vehicleId: appt.vehicleId,
    vehicleSnapshot: appt.vehicleSnapshot,
    workshopId: appt.workshopId,
    technicianId: appt.technicianId,
    technicianName: appt.technicianName,
    servicesPerformed: appt.services.map((x) => ({ serviceId: x.serviceId, name: x.name })),
    checklist,
    ...computeTotals({ labourItems: [], parts: [], discount: { type: 'flat', value: 0 } }, s.tax.gstPercent),
    technicianNotes: '',
    odometerAtService: appt.vehicleSnapshot.odometer || 0,
    nextServiceDate: null,
    nextServiceOdometer: null,
    status: 'draft',
    invoice: null,
    completedAt: null,
    maintenanceReminderSentAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Staff: get (or lazily create) the work record of an appointment that is in the workshop. */
async function getForAppointment(user, appointmentId) {
  const appt = await appointmentService.getAccessible(user, appointmentId);
  let record = await serviceRecords.findOne((r) => r.appointmentId === appointmentId);
  if (user.role === 'customer') {
    if (!record || record.status !== 'finalized') throw ApiError.notFound('No service record yet');
    return record;
  }
  if (!record) {
    if (!WORK_STATUSES.includes(appt.status)) return null;
    const draft = await buildDraft(appt);
    record = await mutateJsonFile('serviceRecords.json', (list) => {
      const existing = list.find((r) => r.appointmentId === appointmentId);
      if (existing) return existing;
      list.push(draft);
      return draft;
    });
  }
  return record;
}

async function updateForAppointment(user, appointmentId, data) {
  if (user.role === 'customer') throw ApiError.forbidden();
  const appt = await appointmentService.getAccessible(user, appointmentId);
  if (!WORK_STATUSES.includes(appt.status)) throw ApiError.badRequest('Work can only be recorded while the vehicle is checked in or in progress');
  if (data.discount !== undefined && !isManager(user)) throw ApiError.forbidden('Only service advisors or admins can apply discounts');
  const record = await getForAppointment(user, appointmentId);
  if (record.status === 'finalized') throw ApiError.badRequest('This record has been finalized');
  const s = await settings.get();
  const merged = { ...record, ...data };
  const totals = computeTotals(merged, s.tax.gstPercent);
  return serviceRecords.updateRecord(record.id, { ...data, ...totals, technicianId: appt.technicianId, technicianName: appt.technicianName });
}

async function nextInvoiceNumber() {
  const year = new Date().getFullYear();
  return settings.update((s) => {
    s.counters = s.counters || { invoice: 0 };
    s.counters.invoice = (s.counters.invoice || 0) + 1;
    return `INV-${year}-${String(s.counters.invoice).padStart(6, '0')}`;
  });
}

/** Called when an appointment moves to Completed. */
async function finalizeForAppointment(user, appt) {
  const record = await serviceRecords.findOne((r) => r.appointmentId === appt.id);
  if (!record || (!record.labourItems.length && !record.parts.length)) {
    throw ApiError.validation({ serviceRecord: 'Record the completed work (labour and/or parts) before marking the service as completed' }, 'Work record is incomplete');
  }
  if (record.status === 'finalized') return record;
  const s = await settings.get();
  const number = await nextInvoiceNumber();
  const now = new Date().toISOString();
  const totals = computeTotals(record, s.tax.gstPercent);
  const finalized = await serviceRecords.updateRecord(record.id, {
    ...totals,
    status: 'finalized',
    completedAt: now,
    finalizedBy: { userId: user.id, name: user.fullName, role: user.role },
    invoice: { number, issuedAt: now, paymentStatus: 'unpaid', amountPaid: 0, balance: totals.total, payments: [] },
  });
  const vehicle = await vehicles.findById(appt.vehicleId);
  if (vehicle && record.odometerAtService > (vehicle.odometer || 0)) await vehicles.updateRecord(vehicle.id, { odometer: record.odometerAtService });
  return finalized;
}

async function scopeFilter(user) {
  if (isManager(user)) return () => true;
  if (user.role === 'customer') return (r) => r.customerId === user.id && r.status === 'finalized';
  const profile = await appointmentService.technicianProfileFor(user);
  return (r) => Boolean(profile) && r.technicianId === profile.id;
}

async function list(user, query) {
  const filter = await scopeFilter(user);
  let items = await serviceRecords.findAll(filter);
  if (query.status) items = items.filter((r) => r.status === query.status);
  if (query.vehicleId) items = items.filter((r) => r.vehicleId === query.vehicleId);
  if (query.paymentStatus) items = items.filter((r) => r.invoice && r.invoice.paymentStatus === query.paymentStatus);
  if (query.from) items = items.filter((r) => (r.completedAt || r.createdAt).slice(0, 10) >= query.from);
  if (query.to) items = items.filter((r) => (r.completedAt || r.createdAt).slice(0, 10) <= query.to);
  if (query.search) items = items.filter((r) => includesText([r.appointmentRef, r.invoice?.number, r.vehicleSnapshot.registrationNumber, r.vehicleSnapshot.brand, r.vehicleSnapshot.model], query.search));
  items.sort((a, b) => (b.completedAt || b.createdAt).localeCompare(a.completedAt || a.createdAt));
  if (isManager(user)) {
    const people = Object.fromEntries((await users.findAll((u) => u.role === 'customer')).map((u) => [u.id, u.fullName]));
    items = items.map((r) => ({ ...r, customerName: people[r.customerId] || '' }));
  }
  return paginate(items, query, 100);
}

async function get(user, id) {
  const filter = await scopeFilter(user);
  const record = await serviceRecords.findById(id);
  if (!record || !filter(record)) throw ApiError.notFound('Service record not found');
  return record;
}

/** Full invoice payload for printing. */
async function invoice(user, id) {
  const record = await get(user, id);
  if (record.status !== 'finalized' || !record.invoice) throw ApiError.notFound('Invoice not available yet');
  const s = await settings.get();
  const appt = await appointments.findById(record.appointmentId);
  const customer = await users.findById(record.customerId);
  const workshop = s.workshops.find((w) => w.id === record.workshopId);
  return {
    record,
    appointment: appt ? { reference: appt.reference, date: appt.date, time: appt.time, services: appt.services, estimate: appt.estimate } : null,
    customer: customer ? { fullName: customer.fullName, email: customer.email, phone: customer.phone, address: customer.address } : null,
    business: s.business,
    workshop: workshop ? { name: workshop.name, address: workshop.address, phone: workshop.phone } : null,
    tax: s.tax,
    paymentNote: s.payment.note,
  };
}

async function recordPayment(user, id, { method, amount, reference, note }) {
  if (!isManager(user)) throw ApiError.forbidden('Only advisors or admins can record payments');
  const s = await settings.get();
  if (method === 'demo' && !s.payment.demoModeEnabled) throw ApiError.badRequest('Demo payment mode is disabled');
  const updated = await serviceRecords.updateRecord(id, (r) => {
    if (r.status !== 'finalized' || !r.invoice) throw ApiError.badRequest('Invoice not issued yet');
    const balance = round2(r.total - (r.invoice.amountPaid || 0));
    if (balance <= 0) throw ApiError.badRequest('This invoice is already fully paid');
    if (amount > balance + 0.001) throw ApiError.validation({ amount: `Amount cannot exceed the outstanding balance of Rs ${balance}` });
    const payment = {
      id: newId('pay'),
      method,
      amount: round2(amount),
      reference: reference || '',
      note: note || '',
      isDemo: method === 'demo',
      verification: method === 'demo' ? 'DEMO - no real money was received' : 'Recorded by staff at the counter',
      recordedBy: { userId: user.id, name: user.fullName },
      recordedAt: new Date().toISOString(),
    };
    const payments = [...r.invoice.payments, payment];
    const realPaid = round2(payments.filter((p) => !p.isDemo).reduce((t, p) => t + p.amount, 0));
    const allPaid = round2(payments.reduce((t, p) => t + p.amount, 0));
    const newBalance = round2(r.total - allPaid);
    let paymentStatus = 'partially_paid';
    if (newBalance <= 0) paymentStatus = payments.some((p) => p.isDemo) ? 'paid_demo' : 'paid';
    return { invoice: { ...r.invoice, payments, amountPaid: allPaid, amountReceived: realPaid, balance: Math.max(0, newBalance), paymentStatus } };
  });
  if (!updated) throw ApiError.notFound('Service record not found');
  await notificationService.notify(updated.customerId, {
    type: 'payment',
    title: method === 'demo' ? 'Demo payment recorded' : 'Payment recorded',
    message: `${method === 'demo' ? '[DEMO] ' : ''}Rs ${amount} recorded against invoice ${updated.invoice.number}.`,
    link: `/customer/invoices/${updated.id}`,
  });
  return updated;
}

module.exports = { computeTotals, getForAppointment, updateForAppointment, finalizeForAppointment, list, get, invoice, recordPayment };

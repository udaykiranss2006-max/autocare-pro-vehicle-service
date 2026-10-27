const { vehicles, appointments, serviceRecords, users, mutateJsonFile } = require('../repositories');
const ApiError = require('../utils/ApiError');
const { newId } = require('../utils/id');
const { paginate, includesText } = require('../utils/pagination');
const { ACTIVE_STATUSES, STAFF_ROLES } = require('../config/constants');
const settingsService = require('./settingsService');

const isStaff = (user) => STAFF_ROLES.includes(user.role);

/** Returns the vehicle if the user may access it; 404 otherwise (avoids leaking existence). */
async function getAccessible(user, id) {
  const v = await vehicles.findById(id);
  if (!v || (!isStaff(user) && v.ownerId !== user.id)) throw ApiError.notFound('Vehicle not found');
  return v;
}

async function list(user, query) {
  let items = await vehicles.findAll((v) => isStaff(user) || v.ownerId === user.id);
  if (query.type) items = items.filter((v) => v.type === query.type);
  if (isStaff(user) && query.ownerId) items = items.filter((v) => v.ownerId === query.ownerId);
  if (query.search) items = items.filter((v) => includesText([v.brand, v.model, v.registrationNumber, v.ownerName], query.search));
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (isStaff(user)) {
    const owners = Object.fromEntries((await users.findAll()).map((u) => [u.id, u]));
    items = items.map((v) => ({ ...v, ownerName: owners[v.ownerId]?.fullName || 'Unknown', ownerEmail: owners[v.ownerId]?.email || '' }));
  }
  return paginate(items, query, 100);
}

async function create(user, data) {
  const registrationNumber = await settingsService.checkRegistrationNumber(data.registrationNumber);
  return mutateJsonFile('vehicles.json', (list) => {
    if (list.some((v) => v.registrationNumber === registrationNumber)) {
      throw ApiError.conflict('A vehicle with this registration number is already registered.', 'DUPLICATE_VEHICLE');
    }
    const now = new Date().toISOString();
    const record = { id: newId('veh'), ownerId: user.id, ...data, registrationNumber, createdAt: now, updatedAt: now };
    list.push(record);
    return record;
  });
}

async function update(user, id, data) {
  const existing = await getAccessible(user, id);
  if (user.role === 'technician') throw ApiError.forbidden();
  const registrationNumber = await settingsService.checkRegistrationNumber(data.registrationNumber);
  return mutateJsonFile('vehicles.json', (list) => {
    if (list.some((v) => v.registrationNumber === registrationNumber && v.id !== id)) {
      throw ApiError.conflict('Another vehicle with this registration number already exists.', 'DUPLICATE_VEHICLE');
    }
    const idx = list.findIndex((v) => v.id === id);
    list[idx] = { ...existing, ...data, registrationNumber, id, ownerId: existing.ownerId, updatedAt: new Date().toISOString() };
    return list[idx];
  });
}

async function remove(user, id) {
  await getAccessible(user, id);
  if (!['customer', 'admin'].includes(user.role)) throw ApiError.forbidden();
  const active = await appointments.findAll((a) => a.vehicleId === id && ACTIVE_STATUSES.includes(a.status));
  if (active.length) throw ApiError.conflict('This vehicle has active appointments. Cancel or complete them before deleting.', 'VEHICLE_IN_USE');
  await vehicles.deleteRecord(id);
}

async function history(user, id) {
  const vehicle = await getAccessible(user, id);
  const appts = await appointments.findAll((a) => a.vehicleId === id);
  const records = await serviceRecords.findAll((r) => r.vehicleId === id && r.status === 'finalized');
  appts.sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
  records.sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
  return {
    vehicle,
    appointments: appts.map((a) => ({ id: a.id, reference: a.reference, date: a.date, time: a.time, status: a.status, services: a.services.map((s) => s.name), estimatedTotal: a.estimatedTotal })),
    records: records.map((r) => ({ id: r.id, appointmentRef: r.appointmentRef, completedAt: r.completedAt, total: r.total, odometerAtService: r.odometerAtService, nextServiceDate: r.nextServiceDate, services: r.servicesPerformed.map((s) => s.name), invoiceNumber: r.invoice?.number })),
  };
}

module.exports = { list, get: getAccessible, create, update, remove, history };

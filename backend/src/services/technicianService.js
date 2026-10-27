const { technicians, appointments, users } = require('../repositories');
const ApiError = require('../utils/ApiError');
const { ACTIVE_STATUSES } = require('../config/constants');
const workshopService = require('./workshopService');

async function list(query = {}) {
  let items = await technicians.findAll();
  if (query.active === 'true') items = items.filter((t) => t.active);
  if (query.workshopId) items = items.filter((t) => t.workshopId === query.workshopId);
  const appts = await appointments.findAll((a) => ACTIVE_STATUSES.includes(a.status));
  return items.sort((a, b) => a.name.localeCompare(b.name)).map((t) => ({ ...t, activeJobs: appts.filter((a) => a.technicianId === t.id).length }));
}

async function validateLinks(data, id) {
  if (data.workshopId) await workshopService.get(data.workshopId, { includeInactive: true });
  if (data.userId) {
    const u = await users.findById(data.userId);
    if (!u || u.role !== 'technician') throw ApiError.validation({ userId: 'Linked account must be a technician user' });
    const other = await technicians.findOne((t) => t.userId === data.userId && t.id !== id);
    if (other) throw ApiError.validation({ userId: 'This account is already linked to another technician profile' });
  }
}

async function create(data) {
  await validateLinks(data);
  return technicians.insertRecord({ ...data, userId: data.userId || null });
}

async function update(id, data) {
  await validateLinks(data, id);
  const updated = await technicians.updateRecord(id, data);
  if (!updated) throw ApiError.notFound('Technician not found');
  return updated;
}

async function remove(id) {
  const active = await appointments.findAll((a) => a.technicianId === id && ACTIVE_STATUSES.includes(a.status));
  if (active.length) throw ApiError.conflict(`Technician has ${active.length} active job(s). Reassign them or deactivate the technician instead.`, 'TECHNICIAN_IN_USE');
  if (!(await technicians.deleteRecord(id))) throw ApiError.notFound('Technician not found');
}

module.exports = { list, create, update, remove };

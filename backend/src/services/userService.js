const { users, vehicles, appointments, technicians, mutateJsonFile } = require('../repositories');
const ApiError = require('../utils/ApiError');
const { newId } = require('../utils/id');
const { publicUser } = require('../utils/sanitize');
const { paginate, includesText } = require('../utils/pagination');
const authService = require('./authService');
const tokens = require('./tokenService');

async function list(query) {
  let items = await users.findAll();
  const roles = query.role ? String(query.role).split(',') : null;
  if (roles) items = items.filter((u) => roles.includes(u.role));
  if (query.active === 'true') items = items.filter((u) => u.active);
  if (query.active === 'false') items = items.filter((u) => !u.active);
  if (query.search) items = items.filter((u) => includesText([u.fullName, u.email, u.phone], query.search));
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const [allVehicles, allAppts] = [await vehicles.findAll(), await appointments.findAll()];
  const page = paginate(items, query, 100);
  page.items = page.items.map((u) => ({
    ...publicUser(u),
    vehicleCount: allVehicles.filter((v) => v.ownerId === u.id).length,
    appointmentCount: allAppts.filter((a) => a.customerId === u.id).length,
  }));
  return page;
}

async function get(id) {
  const u = await users.findById(id);
  if (!u) throw ApiError.notFound('User not found');
  const v = await vehicles.findAll((x) => x.ownerId === id);
  const a = (await appointments.findAll((x) => x.customerId === id)).sort((x, y) => `${y.date}${y.time}`.localeCompare(`${x.date}${x.time}`));
  return { user: publicUser(u), vehicles: v, appointments: a.slice(0, 20).map((x) => ({ id: x.id, reference: x.reference, date: x.date, time: x.time, status: x.status, estimatedTotal: x.estimatedTotal })) };
}

async function setActive(actorUser, id, active) {
  if (actorUser.id === id) throw ApiError.badRequest('You cannot change the status of your own account');
  const updated = await users.updateRecord(id, { active });
  if (!updated) throw ApiError.notFound('User not found');
  if (!active) await tokens.revokeAllForUser(id);
  return publicUser(updated);
}

async function setRole(actorUser, id, role) {
  if (actorUser.id === id) throw ApiError.badRequest('You cannot change your own role');
  const updated = await users.updateRecord(id, (u) => ({ role, passwordVersion: (u.passwordVersion || 0) + 1 }));
  if (!updated) throw ApiError.notFound('User not found');
  await tokens.revokeAllForUser(id);
  return publicUser(updated);
}

/** Admin creates staff accounts with a temporary password (must be changed at first login). */
async function createStaff(data) {
  const passwordHash = await authService.hashPassword(data.temporaryPassword);
  const user = await mutateJsonFile('users.json', (list) => {
    if (list.some((u) => u.email === data.email)) throw ApiError.conflict('An account with this email already exists', 'DUPLICATE_ACCOUNT');
    const now = new Date().toISOString();
    const record = { id: newId('usr'), fullName: data.fullName, email: data.email, phone: data.phone, address: '', role: data.role, active: true, mustChangePassword: true, passwordHash, passwordVersion: 0, createdAt: now, updatedAt: now };
    list.push(record);
    return record;
  });
  if (data.role === 'technician') {
    await technicians.insertRecord({ name: data.fullName, phone: data.phone, email: data.email, specializations: data.specializations || [], workshopId: data.workshopId || 'ws_main', experienceYears: 0, active: true, userId: user.id });
  }
  return publicUser(user);
}

module.exports = { list, get, setActive, setRole, createStaff };

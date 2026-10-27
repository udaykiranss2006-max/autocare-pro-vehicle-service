const { reviews, appointments, users, mutateJsonFile } = require('../repositories');
const ApiError = require('../utils/ApiError');
const { newId } = require('../utils/id');
const { paginate } = require('../utils/pagination');
const notificationService = require('./notificationService');

const displayName = (full = '') => {
  const parts = full.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0] || 'Customer';
};

async function create(user, { appointmentId, rating, comment }) {
  const appt = await appointments.findById(appointmentId);
  if (!appt || appt.customerId !== user.id) throw ApiError.notFound('Appointment not found');
  if (appt.status !== 'completed') throw ApiError.badRequest('You can review a service only after it has been completed');
  const review = await mutateJsonFile('reviews.json', (list) => {
    if (list.some((r) => r.appointmentId === appointmentId)) throw ApiError.conflict('You have already reviewed this service. You can edit your existing review.', 'DUPLICATE_REVIEW');
    const now = new Date().toISOString();
    const record = {
      id: newId('rev'),
      appointmentId,
      appointmentRef: appt.reference,
      customerId: user.id,
      customerDisplayName: displayName(user.fullName),
      serviceNames: appt.services.map((s) => s.name),
      vehicleLabel: `${appt.vehicleSnapshot.brand} ${appt.vehicleSnapshot.model}`,
      rating,
      comment,
      status: 'pending',
      adminResponse: '',
      createdAt: now,
      updatedAt: now,
    };
    list.push(record);
    return record;
  });
  await notificationService.notifyRoles(['admin'], { type: 'review', title: 'New review awaiting moderation', message: `${rating}★ for ${appt.reference}`, link: '/admin/reviews' });
  return review;
}

async function update(user, id, { rating, comment }) {
  const r = await reviews.findById(id);
  if (!r || r.customerId !== user.id) throw ApiError.notFound('Review not found');
  return reviews.updateRecord(id, { rating, comment, status: 'pending', edited: true });
}

async function mine(user) {
  const list = await reviews.findAll((r) => r.customerId === user.id);
  const done = await appointments.findAll((a) => a.customerId === user.id && a.status === 'completed');
  const reviewed = new Set(list.map((r) => r.appointmentId));
  return {
    reviews: list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    pendingToReview: done.filter((a) => !reviewed.has(a.id)).map((a) => ({ id: a.id, reference: a.reference, date: a.date, services: a.services.map((s) => s.name), vehicle: `${a.vehicleSnapshot.brand} ${a.vehicleSnapshot.model}` })),
  };
}

async function publicList(query) {
  const items = (await reviews.findAll((r) => r.status === 'approved')).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const avg = items.length ? Math.round((items.reduce((s, r) => s + r.rating, 0) / items.length) * 10) / 10 : null;
  const page = paginate(items.map(({ customerId, appointmentId, ...rest }) => rest), { limit: query.limit || 6, page: query.page }, 50);
  return { items: page.items, meta: { ...page.meta, averageRating: avg, count: items.length } };
}

async function adminList(query) {
  let items = await reviews.findAll();
  if (query.status) items = items.filter((r) => r.status === query.status);
  if (query.rating) items = items.filter((r) => r.rating === Number(query.rating));
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const people = Object.fromEntries((await users.findAll()).map((u) => [u.id, u.fullName]));
  return paginate(items.map((r) => ({ ...r, customerName: people[r.customerId] || r.customerDisplayName })), query, 100);
}

async function moderate(user, id, { status, adminResponse }) {
  const updated = await reviews.updateRecord(id, { status, adminResponse: adminResponse || '', moderatedBy: user.fullName, moderatedAt: new Date().toISOString() });
  if (!updated) throw ApiError.notFound('Review not found');
  if (status !== 'pending') {
    await notificationService.notify(updated.customerId, { type: 'review', title: `Review ${status}`, message: `Your review for ${updated.appointmentRef} was ${status}.`, link: '/customer/reviews' });
  }
  return updated;
}

async function remove(user, id) {
  const r = await reviews.findById(id);
  if (!r || (user.role === 'customer' && r.customerId !== user.id)) throw ApiError.notFound('Review not found');
  await reviews.deleteRecord(id);
}

module.exports = { create, update, mine, publicList, adminList, moderate, remove };

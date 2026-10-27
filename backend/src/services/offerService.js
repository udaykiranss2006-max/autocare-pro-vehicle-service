const { settings } = require('../repositories');
const ApiError = require('../utils/ApiError');
const { newId } = require('../utils/id');
const { nowInTz } = require('../utils/time');

async function list({ includeInactive = false } = {}) {
  const s = await settings.get();
  const today = nowInTz(s.business.timezone).date;
  return s.offers.filter((o) => includeInactive || (o.active && (!o.validUntil || o.validUntil >= today)));
}

async function findByCode(code) {
  if (!code) return null;
  const offer = (await list()).find((o) => o.code && o.code === code.toUpperCase());
  if (!offer) throw ApiError.validation({ offerCode: 'This offer code is invalid or has expired' });
  return offer;
}

async function create(data) {
  const offers = await list({ includeInactive: true });
  if (data.code && offers.some((o) => o.code === data.code)) throw ApiError.conflict('An offer with this code already exists');
  const record = { id: newId('off'), ...data, createdAt: new Date().toISOString() };
  await settings.update((s) => { s.offers.push(record); });
  return record;
}

async function update(id, data) {
  const result = await settings.update((s) => {
    if (data.code && s.offers.some((o) => o.code === data.code && o.id !== id)) throw ApiError.conflict('An offer with this code already exists');
    const idx = s.offers.findIndex((o) => o.id === id);
    if (idx === -1) return null;
    s.offers[idx] = { ...s.offers[idx], ...data, id, updatedAt: new Date().toISOString() };
    return s.offers[idx];
  });
  if (!result) throw ApiError.notFound('Offer not found');
  return result;
}

async function remove(id) {
  const ok = await settings.update((s) => {
    const before = s.offers.length;
    s.offers = s.offers.filter((o) => o.id !== id);
    return before !== s.offers.length;
  });
  if (!ok) throw ApiError.notFound('Offer not found');
}

module.exports = { list, findByCode, create, update, remove };

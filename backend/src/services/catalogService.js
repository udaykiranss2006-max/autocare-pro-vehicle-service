const { services, appointments } = require('../repositories');
const ApiError = require('../utils/ApiError');
const { paginate, includesText } = require('../utils/pagination');
const { ACTIVE_STATUSES } = require('../config/constants');

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

async function list(query, { includeUnavailable = false } = {}) {
  let items = await services.findAll((s) => includeUnavailable || s.available);
  if (query.category) items = items.filter((s) => s.category === query.category);
  if (query.vehicleType) items = items.filter((s) => s.vehicleTypes.includes(query.vehicleType));
  if (query.bookingMode) items = items.filter((s) => s.bookingMode === query.bookingMode);
  if (query.popular === 'true') items = items.filter((s) => s.popular);
  if (query.available === 'true') items = items.filter((s) => s.available);
  if (query.available === 'false') items = items.filter((s) => !s.available);
  if (query.search) items = items.filter((s) => includesText([s.name, s.description, s.category, ...(s.inclusions || [])], query.search));
  const sort = query.sort || 'category';
  const sorters = {
    category: (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
    name: (a, b) => a.name.localeCompare(b.name),
    priceAsc: (a, b) => a.priceFrom - b.priceFrom,
    priceDesc: (a, b) => b.priceFrom - a.priceFrom,
    duration: (a, b) => a.durationMinutes - b.durationMinutes,
  };
  items.sort(sorters[sort] || sorters.category);
  return paginate(items, { ...query, limit: query.limit || 100 }, 200);
}

async function get(idOrSlug, { includeUnavailable = false } = {}) {
  const s = await services.findOne((x) => x.id === idOrSlug || x.slug === idOrSlug);
  if (!s || (!s.available && !includeUnavailable)) throw ApiError.notFound('This service is not available');
  return s;
}

async function create(data) {
  const all = await services.findAll();
  let slug = slugify(data.name);
  if (all.some((s) => s.slug === slug)) slug = `${slug}-${Date.now().toString(36)}`;
  return services.insertRecord({ ...data, slug, faqs: data.faqs || [], benefits: data.benefits || [], inclusions: data.inclusions || [], exclusions: data.exclusions || [] });
}

async function update(id, data) {
  const updated = await services.updateRecord(id, data);
  if (!updated) throw ApiError.notFound('Service not found');
  return updated;
}

async function remove(id) {
  const svc = await services.findById(id);
  if (!svc) throw ApiError.notFound('Service not found');
  const active = await appointments.findAll((a) => ACTIVE_STATUSES.includes(a.status) && a.services.some((s) => s.serviceId === id));
  if (active.length) {
    throw ApiError.conflict(`This service is part of ${active.length} active appointment(s). Disable it instead of deleting.`, 'SERVICE_IN_USE');
  }
  await services.deleteRecord(id);
}

async function categories() {
  const all = await services.findAll((s) => s.available);
  const counts = {};
  all.forEach((s) => { counts[s.category] = (counts[s.category] || 0) + 1; });
  return Object.entries(counts).map(([name, count]) => ({ name, count }));
}

module.exports = { list, get, create, update, remove, categories };

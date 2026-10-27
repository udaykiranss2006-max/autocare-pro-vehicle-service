const { settings, appointments } = require('../repositories');
const ApiError = require('../utils/ApiError');
const { newId } = require('../utils/id');
const { nowInTz, weekdayKey, toMinutes, fromMinutes, localStamp, addDays, dayNumber } = require('../utils/time');
const { ACTIVE_STATUSES } = require('../config/constants');

async function list({ includeInactive = false } = {}) {
  const s = await settings.get();
  return s.workshops.filter((w) => includeInactive || w.active);
}

async function get(id, { includeInactive = false } = {}) {
  const w = (await list({ includeInactive: true })).find((x) => x.id === id);
  if (!w || (!w.active && !includeInactive)) throw ApiError.notFound('Workshop not found');
  return w;
}

function validateHours(hours) {
  for (const [day, h] of Object.entries(hours)) {
    if (h && toMinutes(h.open) >= toMinutes(h.close)) throw ApiError.validation({ hours: `Closing time must be after opening time (${day})` });
  }
}

async function create(data) {
  validateHours(data.hours);
  const record = { id: newId('ws'), ...data, closedDates: data.closedDates || [], createdAt: new Date().toISOString() };
  await settings.update((s) => { s.workshops.push(record); });
  return record;
}

async function update(id, data) {
  validateHours(data.hours);
  const result = await settings.update((s) => {
    const idx = s.workshops.findIndex((w) => w.id === id);
    if (idx === -1) return null;
    s.workshops[idx] = { ...s.workshops[idx], ...data, id, updatedAt: new Date().toISOString() };
    return s.workshops[idx];
  });
  if (!result) throw ApiError.notFound('Workshop not found');
  return result;
}

async function remove(id) {
  const upcoming = await appointments.findAll((a) => a.workshopId === id && ACTIVE_STATUSES.includes(a.status));
  if (upcoming.length) throw ApiError.conflict(`This workshop has ${upcoming.length} active appointment(s). Deactivate it instead.`, 'WORKSHOP_IN_USE');
  const ok = await settings.update((s) => {
    const before = s.workshops.length;
    s.workshops = s.workshops.filter((w) => w.id !== id);
    return s.workshops.length !== before;
  });
  if (!ok) throw ApiError.notFound('Workshop not found');
}

/**
 * Pure availability calculation (used for display AND inside the booking lock).
 * Each appointment consumes one unit of capacity in its start slot and one unit of daily capacity.
 */
function computeAvailability({ workshop, date, booking, timezone, existing, excludeId = null, now = nowInTz(timezone) }) {
  const result = { workshopId: workshop.id, date, closed: false, reason: null, open: null, close: null, slots: [] };
  const lastDate = addDays(now.date, booking.maxAdvanceDays);
  if (dayNumber(date) < dayNumber(now.date)) return { ...result, closed: true, reason: 'Date is in the past' };
  if (dayNumber(date) > dayNumber(lastDate)) return { ...result, closed: true, reason: `Bookings open up to ${booking.maxAdvanceDays} days in advance` };
  if ((workshop.closedDates || []).includes(date)) return { ...result, closed: true, reason: 'Workshop closed on this date' };
  const hours = workshop.hours && workshop.hours[weekdayKey(date)];
  if (!hours) return { ...result, closed: true, reason: 'Workshop closed on this day' };

  const sameDay = existing.filter((a) => a.workshopId === workshop.id && a.date === date && ACTIVE_STATUSES.concat('completed').includes(a.status) && a.id !== excludeId);
  const dailyRemaining = Math.max(0, workshop.dailyCapacity - sameDay.length);
  const open = toMinutes(hours.open);
  const close = toMinutes(hours.close);
  const step = booking.slotMinutes;
  const earliest = now.stamp + booking.minLeadMinutes;
  for (let m = open; m + step <= close; m += step) {
    const time = fromMinutes(m);
    const used = sameDay.filter((a) => a.time === time).length;
    const remaining = Math.max(0, Math.min(workshop.capacityPerSlot - used, dailyRemaining));
    const tooSoon = localStamp(date, time) < earliest;
    result.slots.push({ time, remaining: tooSoon ? 0 : remaining, available: !tooSoon && remaining > 0, reason: tooSoon ? 'past' : remaining > 0 ? null : 'full' });
  }
  return { ...result, open: hours.open, close: hours.close, dailyRemaining };
}

async function availability(workshopId, date, excludeId) {
  const s = await settings.get();
  const workshop = await get(workshopId);
  const existing = await appointments.findAll();
  return computeAvailability({ workshop, date, booking: s.booking, timezone: s.business.timezone, existing, excludeId });
}

module.exports = { list, get, create, update, remove, availability, computeAvailability };

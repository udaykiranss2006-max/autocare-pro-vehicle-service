/**
 * Date/time helpers. Appointments are stored as local workshop date (YYYY-MM-DD) and time (HH:mm)
 * in the business timezone (default Asia/Kolkata). "Local minute stamps" let us compare them safely.
 */
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function nowInTz(timeZone = 'Asia/Kolkata', at = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);
  const get = (t) => parts.find((p) => p.type === t).value;
  const date = `${get('year')}-${get('month')}-${get('day')}`;
  const minutes = Number(get('hour')) * 60 + Number(get('minute'));
  return { date, minutes, stamp: dayNumber(date) * 1440 + minutes };
}

function dayNumber(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

function isValidDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const fromMinutes = (mins) =>
  `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

const localStamp = (dateStr, hhmm) => dayNumber(dateStr) * 1440 + toMinutes(hhmm);

function weekdayKey(dateStr) {
  return DAY_KEYS[((dayNumber(dateStr) % 7) + 7 + 4) % 7]; // 1970-01-01 was a Thursday
}

function addDays(dateStr, days) {
  const dn = dayNumber(dateStr) + days;
  return new Date(dn * 86400000).toISOString().slice(0, 10);
}

/** Converts a local date+time in the business timezone to an ISO string (fixed offset zones like IST). */
function toIso(dateStr, hhmm, timeZone = 'Asia/Kolkata') {
  const guess = new Date(`${dateStr}T${hhmm}:00Z`);
  const local = nowInTz(timeZone, guess);
  const offsetMinutes = local.stamp - localStamp(dateStr, hhmm);
  return new Date(guess.getTime() - offsetMinutes * 60000).toISOString();
}

module.exports = { DAY_KEYS, nowInTz, dayNumber, isValidDate, toMinutes, fromMinutes, localStamp, weekdayKey, addDays, toIso };

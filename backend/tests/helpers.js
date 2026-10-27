const fs = require('fs');
const os = require('os');
const path = require('path');

/** Points DATA_DIR at a fresh temp folder BEFORE any app module is loaded. */
function useTempDataDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'acp-test-'));
  process.env.DATA_DIR = dir;
  process.env.NODE_ENV = 'test';
  process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-secret-that-is-long-enough-for-hs256-signing';
  process.env.BCRYPT_ROUNDS = '4';
  return dir;
}

function writeData(dir, name, data) {
  fs.writeFileSync(path.join(dir, name), JSON.stringify(data, null, 2));
}

/** Business-hours workshop open every day 09:00-18:00 with tiny capacity, for deterministic tests. */
function testSettings(overrides = {}) {
  const hours = { open: '09:00', close: '18:00' };
  return {
    business: { name: 'AutoCare Pro', timezone: 'Asia/Kolkata' },
    booking: { slotMinutes: 60, minLeadMinutes: 0, maxAdvanceDays: 60, cancellationCutoffHours: 4, rescheduleCutoffHours: 4, maxReschedules: 2, cancellationPolicy: 'test' },
    workshops: [{ id: 'ws_test', name: 'Test Workshop', address: 'x', hours: { mon: hours, tue: hours, wed: hours, thu: hours, fri: hours, sat: hours, sun: hours }, capacityPerSlot: 1, dailyCapacity: 5, closedDates: [], active: true }],
    offers: [],
    ...overrides,
  };
}

module.exports = { useTempDataDir, writeData, testSettings };

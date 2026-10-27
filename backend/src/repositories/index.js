const { createRepository } = require('./baseRepository');
const { readJsonFile, writeJsonFile, mutateJsonFile } = require('./jsonStore');
const defaults = require('../config/defaultSettings');

const repositories = {
  users: createRepository('users.json', 'usr'),
  vehicles: createRepository('vehicles.json', 'veh'),
  services: createRepository('services.json', 'svc'),
  appointments: createRepository('appointments.json', 'apt'),
  technicians: createRepository('technicians.json', 'tec'),
  serviceRecords: createRepository('serviceRecords.json', 'rec'),
  reviews: createRepository('reviews.json', 'rev'),
  notifications: createRepository('notifications.json', 'ntf'),
  sessions: createRepository('sessions.json', 'ses'),
  contactMessages: createRepository('contactMessages.json', 'msg'),
};

function mergeSettings(stored) {
  const out = {};
  for (const key of Object.keys(defaults)) {
    const d = defaults[key];
    const s = stored[key];
    if (s === undefined) out[key] = JSON.parse(JSON.stringify(d));
    else if (d && typeof d === 'object' && !Array.isArray(d) && s && typeof s === 'object' && !Array.isArray(s)) out[key] = { ...d, ...s };
    else out[key] = s;
  }
  for (const key of Object.keys(stored)) if (!(key in out)) out[key] = stored[key];
  return out;
}

const settings = {
  get: async () => mergeSettings(await readJsonFile('settings.json')),
  /** mutator receives the merged settings object; return value is passed through. */
  update: (mutator) =>
    mutateJsonFile('settings.json', async (stored) => {
      const merged = mergeSettings(stored);
      const result = await mutator(merged);
      return { __data: merged, result: result === undefined ? merged : result };
    }),
};

module.exports = { ...repositories, settings, readJsonFile, writeJsonFile, mutateJsonFile };

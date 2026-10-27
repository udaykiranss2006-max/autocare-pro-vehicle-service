const { settings } = require('../repositories');
const { validate } = require('../validators/validate');
const ApiError = require('../utils/ApiError');
const { VEHICLE_TYPES, VEHICLE_TYPE_LABELS, FUEL_TYPES, SERVICE_CATEGORIES, STATUS_LABELS } = require('../config/constants');

async function getPublic() {
  const s = await settings.get();
  return {
    business: s.business,
    booking: s.booking,
    tax: s.tax,
    registrationNumber: s.registrationNumber,
    problemCategories: s.problemCategories,
    vehicleTypePriceFactor: s.vehicleTypePriceFactor,
    payment: { gatewayConfigured: s.payment.gatewayConfigured, note: s.payment.note },
    vehicleTypes: VEHICLE_TYPES.map((v) => ({ value: v, label: VEHICLE_TYPE_LABELS[v] })),
    fuelTypes: FUEL_TYPES,
    serviceCategories: SERVICE_CATEGORIES,
    statusLabels: STATUS_LABELS,
  };
}

async function getAll() {
  const s = await settings.get();
  const { counters, ...rest } = s;
  return rest;
}

const sectionSchemas = {
  business: {
    name: { type: 'string', label: 'Business name', required: true, min: 2, max: 80 },
    tagline: { type: 'string', label: 'Tagline', max: 120 },
    phone: { type: 'string', label: 'Phone', max: 40 },
    email: { type: 'email', label: 'Email' },
    address: { type: 'string', label: 'Address', max: 300 },
    mapEmbedUrl: { type: 'string', label: 'Map embed URL', max: 1000, check: (v) => (v && !/^https:\/\/(www\.)?google\.com\/maps\/embed\?/.test(v) ? 'Map URL must be a Google Maps embed URL (https://www.google.com/maps/embed?...)' : undefined) },
    isSampleData: { type: 'boolean', default: true },
    timezone: { type: 'string', label: 'Timezone', max: 60, default: 'Asia/Kolkata', check: (v) => { try { Intl.DateTimeFormat('en', { timeZone: v }); return undefined; } catch (_) { return 'Unknown timezone'; } } },
    currency: { type: 'string', label: 'Currency', enum: ['INR'], default: 'INR' },
    social: { type: 'object', label: 'Social links', schema: { facebook: { type: 'string', max: 200 }, instagram: { type: 'string', max: 200 }, x: { type: 'string', max: 200 }, youtube: { type: 'string', max: 200 } } },
  },
  booking: {
    slotMinutes: { type: 'integer', label: 'Slot length', required: true, min: 15, max: 240 },
    minLeadMinutes: { type: 'integer', label: 'Minimum notice', required: true, min: 0, max: 10080 },
    maxAdvanceDays: { type: 'integer', label: 'Booking window', required: true, min: 1, max: 365 },
    cancellationCutoffHours: { type: 'integer', label: 'Cancellation cutoff', required: true, min: 0, max: 168 },
    rescheduleCutoffHours: { type: 'integer', label: 'Reschedule cutoff', required: true, min: 0, max: 168 },
    maxReschedules: { type: 'integer', label: 'Max reschedules', required: true, min: 0, max: 10 },
    cancellationPolicy: { type: 'string', label: 'Cancellation policy', required: true, max: 2000 },
  },
  tax: {
    gstPercent: { type: 'number', label: 'GST %', required: true, min: 0, max: 40 },
    label: { type: 'string', label: 'Tax label', max: 20, default: 'GST' },
  },
  registrationNumber: {
    enabled: { type: 'boolean', required: true },
    patterns: {
      type: 'array',
      label: 'Patterns',
      max: 20,
      items: {
        schema: {
          name: { type: 'string', label: 'Pattern name', required: true, max: 80 },
          regex: {
            type: 'string',
            label: 'Regular expression',
            required: true,
            max: 200,
            check: (v) => {
              try { new RegExp(v); return undefined; } catch (_) { return `Invalid regular expression: ${v}`; } // eslint-disable-line no-new
            },
          },
        },
      },
    },
  },
  payment: {
    demoModeEnabled: { type: 'boolean', required: true },
  },
};

async function update(body) {
  if (!body || typeof body !== 'object') throw ApiError.badRequest('Settings payload required');
  const patch = {};
  for (const [section, schema] of Object.entries(sectionSchemas)) {
    if (body[section] !== undefined) patch[section] = validate(body[section], schema);
  }
  if (body.problemCategories !== undefined) {
    patch.problemCategories = validate({ v: body.problemCategories }, { v: { type: 'array', label: 'Problem categories', min: 1, max: 30, items: { type: 'string', min: 2, max: 60 } } }).v;
  }
  if (body.vehicleTypePriceFactor !== undefined) {
    const schema = Object.fromEntries(VEHICLE_TYPES.map((t) => [t, { type: 'number', label: `${VEHICLE_TYPE_LABELS[t]} factor`, required: true, min: 0.1, max: 10 }]));
    patch.vehicleTypePriceFactor = validate(body.vehicleTypePriceFactor, schema);
  }
  if (!Object.keys(patch).length) throw ApiError.badRequest('Nothing to update');
  await settings.update((s) => {
    for (const [k, v] of Object.entries(patch)) {
      s[k] = k === 'payment' ? { ...s.payment, ...v } : v;
    }
  });
  return getAll();
}

/** Validates/normalizes a registration number against configured patterns. */
async function checkRegistrationNumber(value) {
  const s = await settings.get();
  const normalized = String(value).toUpperCase().replace(/[\s\-.]/g, '');
  if (!s.registrationNumber.enabled || !s.registrationNumber.patterns.length) return normalized;
  const ok = s.registrationNumber.patterns.some((p) => {
    try { return new RegExp(p.regex).test(normalized); } catch (_) { return false; }
  });
  if (!ok) {
    throw ApiError.validation({ registrationNumber: `Enter a valid registration number. Accepted formats: ${s.registrationNumber.patterns.map((p) => p.name).join('; ')}` });
  }
  return normalized;
}

module.exports = { getPublic, getAll, update, checkRegistrationNumber };

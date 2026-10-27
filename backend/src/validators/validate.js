/**
 * Tiny schema validator (no external dependency).
 * Rule options: type (string|number|integer|boolean|date|time|email|array|object), required, label,
 * min, max (length for strings/arrays, value for numbers), pattern, enum, trim (default true),
 * lowercase, uppercase, default, nullable, items (rule for array items), schema (for objects),
 * transform(value), check(value) -> error message | undefined.
 * Unknown fields are dropped, so clients cannot inject fields such as "role" or "price".
 */
const ApiError = require('../utils/ApiError');
const { isValidDate } = require('../utils/time');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function coerce(value, rule, label) {
  const type = rule.type || 'string';
  let v = value;
  switch (type) {
    case 'string':
    case 'email': {
      if (typeof v === 'number') v = String(v);
      if (typeof v !== 'string') return { error: `${label} must be text` };
      if (rule.trim !== false) v = v.trim();
      if (type === 'email' || rule.lowercase) v = v.toLowerCase();
      if (rule.uppercase) v = v.toUpperCase();
      if (rule.transform) v = rule.transform(v);
      if (rule.min !== undefined && v.length < rule.min) return { error: `${label} must be at least ${rule.min} characters` };
      if (rule.max !== undefined && v.length > rule.max) return { error: `${label} must be at most ${rule.max} characters` };
      if (type === 'email' && (!EMAIL_RE.test(v) || v.length > 254)) return { error: 'Enter a valid email address' };
      if (rule.pattern && !rule.pattern.test(v)) return { error: rule.patternMessage || `${label} has an invalid format` };
      if (rule.enum && !rule.enum.includes(v)) return { error: `${label} must be one of: ${rule.enum.join(', ')}` };
      break;
    }
    case 'number':
    case 'integer': {
      if (typeof v === 'string' && v.trim() !== '') v = Number(v);
      if (typeof v !== 'number' || !Number.isFinite(v)) return { error: `${label} must be a number` };
      if (type === 'integer' && !Number.isInteger(v)) return { error: `${label} must be a whole number` };
      if (rule.min !== undefined && v < rule.min) return { error: `${label} must be at least ${rule.min}` };
      if (rule.max !== undefined && v > rule.max) return { error: `${label} must be at most ${rule.max}` };
      break;
    }
    case 'boolean': {
      if (v === 'true') v = true;
      if (v === 'false') v = false;
      if (typeof v !== 'boolean') return { error: `${label} must be true or false` };
      break;
    }
    case 'date': {
      if (typeof v !== 'string' || !isValidDate(v.trim())) return { error: `${label} must be a valid date (YYYY-MM-DD)` };
      v = v.trim();
      break;
    }
    case 'time': {
      if (typeof v !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(v.trim())) return { error: `${label} must be a valid time (HH:mm)` };
      v = v.trim();
      break;
    }
    case 'array': {
      if (!Array.isArray(v)) return { error: `${label} must be a list` };
      if (rule.min !== undefined && v.length < rule.min) return { error: `Select at least ${rule.min} ${label.toLowerCase()}` };
      if (rule.max !== undefined && v.length > rule.max) return { error: `${label} can contain at most ${rule.max} items` };
      if (rule.items) {
        const out = [];
        for (let i = 0; i < v.length; i += 1) {
          const r = rule.items.schema
            ? validateObject(v[i], rule.items.schema, `${label} item ${i + 1}`)
            : coerce(v[i], rule.items, `${label} item ${i + 1}`);
          if (r.error) return { error: typeof r.error === 'string' ? r.error : `${label} item ${i + 1}: ${Object.values(r.error)[0]}` };
          out.push(r.value);
        }
        v = rule.unique ? [...new Set(out)] : out;
      }
      break;
    }
    case 'object': {
      if (!v || typeof v !== 'object' || Array.isArray(v)) return { error: `${label} must be an object` };
      if (rule.schema) {
        const r = validateObject(v, rule.schema, label);
        if (r.error) return { error: `${label}: ${Object.values(r.error)[0]}` };
        v = r.value;
      }
      break;
    }
    default:
      return { error: `${label}: unsupported type` };
  }
  if (rule.check) {
    const msg = rule.check(v);
    if (msg) return { error: msg };
  }
  return { value: v };
}

function isEmpty(v) {
  return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
}

function validateObject(input, schema, _ctx, { partial = false } = {}) {
  const src = input && typeof input === 'object' ? input : {};
  const errors = {};
  const value = {};
  for (const [key, rule] of Object.entries(schema)) {
    const label = rule.label || key;
    const raw = src[key];
    if (isEmpty(raw)) {
      if (partial && raw === undefined) continue;
      if (rule.required) errors[key] = rule.requiredMessage || `${label} is required`;
      else if (rule.default !== undefined) value[key] = typeof rule.default === 'function' ? rule.default() : rule.default;
      else if (raw !== undefined) value[key] = rule.nullable ? null : rule.type === 'array' ? [] : '';
      continue;
    }
    const r = coerce(raw, rule, label);
    if (r.error) errors[key] = r.error;
    else value[key] = r.value;
  }
  return Object.keys(errors).length ? { error: errors } : { value };
}

function validate(input, schema, options = {}) {
  const r = validateObject(input, schema, '', options);
  if (r.error) throw ApiError.validation(r.error);
  return r.value;
}

const validateBody = (schema, options) => (req, _res, next) => {
  try {
    req.body = validate(req.body, typeof schema === 'function' ? schema(req) : schema, options);
    next();
  } catch (err) {
    next(err);
  }
};

const validateQuery = (schema) => (req, _res, next) => {
  try {
    req.validQuery = validate(req.query, schema);
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { validate, validateBody, validateQuery, EMAIL_RE };

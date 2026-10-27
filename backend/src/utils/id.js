const crypto = require('crypto');

const newId = (prefix) => `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid confusion
function randomCode(length) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** Appointment reference, e.g. ACP-20261027-K7Q2XM */
function appointmentReference(dateStr) {
  return `ACP-${dateStr.replace(/-/g, '')}-${randomCode(6)}`;
}

const randomToken = (bytes = 48) => crypto.randomBytes(bytes).toString('base64url');
const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

module.exports = { newId, randomCode, appointmentReference, randomToken, sha256 };

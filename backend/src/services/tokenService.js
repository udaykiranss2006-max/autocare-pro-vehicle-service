const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { sessions, mutateJsonFile } = require('../repositories');
const { randomToken, sha256, newId } = require('../utils/id');
const ApiError = require('../utils/ApiError');

function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, pv: user.passwordVersion || 0 }, env.jwtAccessSecret, {
    algorithm: 'HS256',
    expiresIn: env.accessTokenTtl,
    issuer: 'autocare-pro',
  });
}

/** Creates an opaque refresh token; only its SHA-256 hash is stored in sessions.json. */
async function createSession(user, { remember = false, userAgent = '' } = {}) {
  const token = randomToken(48);
  const ttlMs = remember ? env.refreshTokenDays * 86400000 : env.sessionRefreshHours * 3600000;
  const now = new Date();
  const session = {
    id: newId('ses'),
    userId: user.id,
    tokenHash: sha256(token),
    remember,
    userAgent: String(userAgent).slice(0, 200),
    expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
    revokedAt: null,
    replacedBy: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  await mutateJsonFile('sessions.json', (list) => {
    // drop sessions that expired more than a day ago to keep the file small
    const cutoff = Date.now() - 86400000;
    for (let i = list.length - 1; i >= 0; i -= 1) if (Date.parse(list[i].expiresAt) < cutoff) list.splice(i, 1);
    list.push(session);
  });
  return { token, session };
}

/** Rotates a refresh token. Re-use of a revoked token revokes every session of that user. */
async function rotateSession(token, userAgent) {
  if (!token) throw ApiError.unauthorized('No active session');
  const hash = sha256(token);
  const outcome = await mutateJsonFile('sessions.json', (list) => {
    const s = list.find((x) => x.tokenHash === hash);
    if (!s) return { error: 'invalid' };
    if (s.revokedAt) {
      list.forEach((x) => {
        if (x.userId === s.userId && !x.revokedAt) x.revokedAt = new Date().toISOString();
      });
      return { error: 'reused' };
    }
    if (Date.parse(s.expiresAt) < Date.now()) return { error: 'expired' };
    const newToken = randomToken(48);
    const now = new Date().toISOString();
    const next = {
      ...s,
      id: newId('ses'),
      tokenHash: sha256(newToken),
      userAgent: String(userAgent || s.userAgent).slice(0, 200),
      revokedAt: null,
      replacedBy: null,
      createdAt: now,
      updatedAt: now,
    };
    s.revokedAt = now;
    s.replacedBy = next.id;
    list.push(next);
    return { token: newToken, session: next };
  });
  if (outcome.error) throw new ApiError(401, 'Your session has ended. Please sign in again.', 'SESSION_INVALID');
  return outcome;
}

async function revokeSession(token) {
  if (!token) return;
  const hash = sha256(token);
  await mutateJsonFile('sessions.json', (list) => {
    const s = list.find((x) => x.tokenHash === hash);
    if (s && !s.revokedAt) s.revokedAt = new Date().toISOString();
  });
}

async function revokeAllForUser(userId) {
  await mutateJsonFile('sessions.json', (list) => {
    list.forEach((x) => {
      if (x.userId === userId && !x.revokedAt) x.revokedAt = new Date().toISOString();
    });
  });
}

const findSession = async (token) => (token ? sessions.findOne((s) => s.tokenHash === sha256(token)) : null);

module.exports = { signAccessToken, createSession, rotateSession, revokeSession, revokeAllForUser, findSession };

const bcrypt = require('bcryptjs');
const { env } = require('../config/env');
const { users, mutateJsonFile } = require('../repositories');
const ApiError = require('../utils/ApiError');
const { newId, randomToken, sha256 } = require('../utils/id');
const { publicUser } = require('../utils/sanitize');
const tokens = require('./tokenService');
const notifications = require('./notificationService');

const DUMMY_HASH = bcrypt.hashSync('timing-safe-dummy-password', 10);
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

const hashPassword = (pw) => bcrypt.hash(pw, env.bcryptRounds);

async function register(data) {
  if (data.password !== data.confirmPassword) throw ApiError.validation({ confirmPassword: 'Passwords do not match' });
  const passwordHash = await hashPassword(data.password);
  const user = await mutateJsonFile('users.json', (list) => {
    if (list.some((u) => u.email === data.email)) {
      throw ApiError.conflict('An account with this email already exists. Try signing in instead.', 'DUPLICATE_ACCOUNT');
    }
    const now = new Date().toISOString();
    const record = {
      id: newId('usr'),
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      address: data.address || '',
      role: 'customer', // public registration can ONLY create customers
      active: true,
      mustChangePassword: false,
      passwordHash,
      passwordVersion: 0,
      termsAcceptedAt: now,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    };
    list.push(record);
    return record;
  });
  await notifications.notify(user.id, { type: 'welcome', title: 'Welcome to AutoCare Pro', message: 'Add your vehicle and book your first service in a few clicks.', link: '/customer/vehicles' });
  return publicUser(user);
}

async function login({ email, password, rememberMe }, userAgent) {
  const user = await users.findOne((u) => u.email === email);
  if (user && user.lockUntil && Date.parse(user.lockUntil) > Date.now()) {
    throw new ApiError(423, `Too many failed attempts. Try again after ${LOCK_MINUTES} minutes.`, 'ACCOUNT_LOCKED');
  }
  const valid = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !valid) {
    if (user) {
      await users.updateRecord(user.id, (u) => {
        const failed = (u.failedLoginCount || 0) + 1;
        return failed >= MAX_FAILED
          ? { failedLoginCount: 0, lockUntil: new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() }
          : { failedLoginCount: failed };
      });
    }
    throw new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }
  if (!user.active) throw new ApiError(403, 'Your account has been deactivated. Please contact the workshop.', 'ACCOUNT_DISABLED');
  const updated = await users.updateRecord(user.id, { failedLoginCount: 0, lockUntil: null, lastLoginAt: new Date().toISOString() });
  return issue(updated, { remember: rememberMe, userAgent });
}

async function issue(user, { remember, userAgent }) {
  const accessToken = tokens.signAccessToken(user);
  const { token, session } = await tokens.createSession(user, { remember, userAgent });
  return { user: publicUser(user), accessToken, refreshToken: token, session };
}

async function refresh(refreshToken, userAgent) {
  const { token, session } = await tokens.rotateSession(refreshToken, userAgent);
  const user = await users.findById(session.userId);
  if (!user || !user.active) {
    await tokens.revokeAllForUser(session.userId);
    throw ApiError.unauthorized('Your account is not available');
  }
  return { user: publicUser(user), accessToken: tokens.signAccessToken(user), refreshToken: token, session };
}

const logout = (refreshToken) => tokens.revokeSession(refreshToken);

async function forgotPassword(email) {
  const user = await users.findOne((u) => u.email === email);
  if (user && user.active) {
    const token = randomToken(32);
    await users.updateRecord(user.id, { resetTokenHash: sha256(token), resetTokenExpiresAt: new Date(Date.now() + 30 * 60000).toISOString() });
    const link = `${env.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
    if (env.devShowResetLink && !env.isProd) {
      console.log(`\n[dev] Password reset link for ${email} (email delivery not configured):\n${link}\n`);
    }
    // Production: send `link` with your email provider here (requires SMTP/API credentials).
  }
  return {
    message: 'If an account exists for that email, a password reset link has been sent.',
    emailDeliveryConfigured: false,
  };
}

async function resetPassword({ token, password, confirmPassword }) {
  if (password !== confirmPassword) throw ApiError.validation({ confirmPassword: 'Passwords do not match' });
  const hash = sha256(token);
  const user = await users.findOne((u) => u.resetTokenHash === hash);
  if (!user || !user.resetTokenExpiresAt || Date.parse(user.resetTokenExpiresAt) < Date.now()) {
    throw ApiError.badRequest('This reset link is invalid or has expired. Please request a new one.');
  }
  const passwordHash = await hashPassword(password);
  await users.updateRecord(user.id, (u) => ({
    passwordHash,
    passwordVersion: (u.passwordVersion || 0) + 1,
    resetTokenHash: null,
    resetTokenExpiresAt: null,
    mustChangePassword: false,
    failedLoginCount: 0,
    lockUntil: null,
  }));
  await tokens.revokeAllForUser(user.id);
  return { message: 'Your password has been reset. You can now sign in.' };
}

async function changePassword(user, { currentPassword, newPassword, confirmPassword }, userAgent) {
  if (newPassword !== confirmPassword) throw ApiError.validation({ confirmPassword: 'Passwords do not match' });
  const fresh = await users.findById(user.id);
  if (!(await bcrypt.compare(currentPassword, fresh.passwordHash))) throw ApiError.validation({ currentPassword: 'Current password is incorrect' });
  if (await bcrypt.compare(newPassword, fresh.passwordHash)) throw ApiError.validation({ newPassword: 'New password must be different from the current password' });
  const passwordHash = await hashPassword(newPassword);
  const updated = await users.updateRecord(user.id, (u) => ({ passwordHash, passwordVersion: (u.passwordVersion || 0) + 1, mustChangePassword: false }));
  await tokens.revokeAllForUser(user.id);
  await notifications.notify(user.id, { type: 'security', title: 'Password changed', message: 'Your password was changed. If this was not you, contact the workshop immediately.' });
  return issue(updated, { remember: false, userAgent });
}

module.exports = { register, login, refresh, logout, forgotPassword, resetPassword, changePassword, hashPassword };

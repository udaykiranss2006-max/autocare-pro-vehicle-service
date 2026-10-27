const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { users } = require('../repositories');

/**
 * Verifies the Bearer access token and loads the user from storage on every request.
 * The role is ALWAYS read from users.json, never trusted from the token or the client.
 */
const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw ApiError.unauthorized();
  let payload;
  try {
    payload = jwt.verify(token, env.jwtAccessSecret, { algorithms: ['HS256'], issuer: 'autocare-pro' });
  } catch (err) {
    if (err.name === 'TokenExpiredError') throw new ApiError(401, 'Your session has expired. Please sign in again.', 'TOKEN_EXPIRED');
    throw ApiError.unauthorized('Invalid authentication token');
  }
  const user = await users.findById(payload.sub);
  if (!user || !user.active) throw ApiError.unauthorized('Your account is not available. Contact support.');
  if ((user.passwordVersion || 0) !== payload.pv) throw new ApiError(401, 'Your session has expired. Please sign in again.', 'TOKEN_EXPIRED');
  req.user = user;
  next();
});

/** Blocks everything except allowed routes until a forced password change is done. */
const requirePasswordChanged = (req, _res, next) => {
  if (req.user && req.user.mustChangePassword) {
    return next(new ApiError(403, 'You must change your password before continuing.', 'PASSWORD_CHANGE_REQUIRED'));
  }
  return next();
};

const authorize = (...roles) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
  return next();
};

/** Shorthand: authenticated + password changed + optional role list. */
const protect = (...roles) => (roles.length ? [authenticate, requirePasswordChanged, authorize(...roles)] : [authenticate, requirePasswordChanged]);

/** Attaches req.user when a valid token is present; never fails (used on public endpoints). */
const optionalAuth = (req, res, next) => {
  if (!req.headers.authorization) return next();
  return authenticate(req, res, (err) => {
    if (err) req.user = undefined;
    next();
  });
};

module.exports = { optionalAuth, authenticate, requirePasswordChanged, authorize, protect };

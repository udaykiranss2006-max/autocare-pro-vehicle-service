const ApiError = require('../utils/ApiError');
/**
 * Cookie-based endpoints (refresh/logout) require a custom header. Browsers cannot send custom
 * headers cross-origin without a CORS preflight, and CORS only allows the configured frontend origin.
 */
module.exports = function requireAppHeader(req, _res, next) {
  if (req.get('X-Requested-With') !== 'AutoCarePro') return next(ApiError.forbidden('Missing application header'));
  return next();
};

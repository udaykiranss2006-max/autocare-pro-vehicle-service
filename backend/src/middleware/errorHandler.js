const ApiError = require('../utils/ApiError');
const { env } = require('../config/env');

function notFound(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND'));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  let error = err;
  if (err.type === 'entity.parse.failed') error = ApiError.badRequest('Request body is not valid JSON');
  else if (err.type === 'entity.too.large') error = new ApiError(413, 'Request is too large', 'PAYLOAD_TOO_LARGE');
  else if (err.message && err.message.startsWith('CORS')) error = ApiError.forbidden('Origin not allowed');
  else if (!(err instanceof ApiError)) {
    console.error('[error]', req.method, req.originalUrl, err);
    error = new ApiError(500, 'Something went wrong on our side. Please try again.', 'INTERNAL_ERROR');
  }
  const body = { success: false, error: { code: error.code, message: error.message } };
  if (error.details) body.error.details = error.details;
  if (!env.isProd && !(err instanceof ApiError) && error.status === 500) body.error.debug = err.message;
  res.status(error.status || 500).json(body);
}

module.exports = { notFound, errorHandler };

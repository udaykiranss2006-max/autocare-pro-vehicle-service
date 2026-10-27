const rateLimit = require('express-rate-limit');
const { env } = require('../config/env');

const handler = (_req, res) =>
  res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please wait a few minutes and try again.' } });

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isTest ? 1000 : env.authRateLimitMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
});

const contactLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: env.isTest ? 1000 : 10, standardHeaders: 'draft-7', legacyHeaders: false, handler });

const apiLimiter = rateLimit({ windowMs: 60 * 1000, limit: env.isTest ? 10000 : 300, standardHeaders: 'draft-7', legacyHeaders: false, handler });

module.exports = { authLimiter, contactLimiter, apiLimiter };

const path = require('path');

try {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
} catch (err) {
  if (err.code !== 'MODULE_NOT_FOUND') throw err;
}

const num = (value, fallback) =>
  value === undefined || value === '' || Number.isNaN(Number(value)) ? fallback : Number(value);

const backendRoot = path.resolve(__dirname, '../..');

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: num(process.env.PORT, 5000),
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:4200')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4200',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || '',
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTokenDays: num(process.env.REFRESH_TOKEN_DAYS, 7),
  sessionRefreshHours: num(process.env.SESSION_REFRESH_HOURS, 12),
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  bcryptRounds: num(process.env.BCRYPT_ROUNDS, 12),
  dataDir: path.resolve(backendRoot, process.env.DATA_DIR || './data'),
  devShowResetLink: process.env.DEV_SHOW_RESET_LINK === 'true',
  reminderIntervalMinutes: num(process.env.REMINDER_INTERVAL_MINUTES, 60),
  authRateLimitMax: num(process.env.AUTH_RATE_LIMIT_MAX, 20),
};

env.isProd = env.nodeEnv === 'production';
env.isTest = env.nodeEnv === 'test';

function assertConfig() {
  const problems = [];
  if (!env.jwtAccessSecret || env.jwtAccessSecret.length < 32 || env.jwtAccessSecret.startsWith('replace-with')) {
    problems.push('JWT_ACCESS_SECRET must be set to a random string of at least 32 characters in backend/.env');
  }
  if (env.isProd && env.devShowResetLink) problems.push('DEV_SHOW_RESET_LINK must be false in production');
  if (env.isProd && !env.cookieSecure) problems.push('COOKIE_SECURE must be true in production (HTTPS)');
  if (problems.length) {
    const err = new Error('Invalid configuration:\n - ' + problems.join('\n - '));
    err.code = 'CONFIG_ERROR';
    throw err;
  }
}

module.exports = { env, assertConfig };

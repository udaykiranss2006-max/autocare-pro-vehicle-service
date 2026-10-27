const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { env } = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimit');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
        return cb(new Error(`CORS: origin ${origin} not allowed`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['Content-Disposition'],
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '20kb' }));
  app.use(cookieParser());
  app.use('/api', apiLimiter, routes);
  app.get('/', (_req, res) => res.json({ success: true, data: { name: 'AutoCare Pro API', docs: '/api/health' } }));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };

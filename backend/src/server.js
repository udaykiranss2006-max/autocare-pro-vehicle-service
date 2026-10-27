const fs = require('fs');
const { env, assertConfig } = require('./config/env');

try {
  assertConfig();
} catch (err) {
  console.error(`\n${err.message}\nCopy backend/.env.example to backend/.env and fill in the values.\n`);
  process.exit(1);
}

if (!fs.existsSync(env.dataDir)) {
  console.error(`\nData directory not found: ${env.dataDir}\nRun "npm run seed" inside the backend folder first.\n`);
  process.exit(1);
}

const { createApp } = require('./app');
const reminders = require('./services/reminderService');

const app = createApp();
const server = app.listen(env.port, () => {
  console.log(`AutoCare Pro API running on http://localhost:${env.port}/api (${env.nodeEnv})`);
  console.log(`Allowed frontend origin(s): ${env.corsOrigins.join(', ')}`);
  console.log(`Data directory: ${env.dataDir}`);
});
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') console.error(`Port ${env.port} is already in use. Change PORT in backend/.env or stop the other process.`);
  else console.error(err);
  process.exit(1);
});

reminders.start(env.reminderIntervalMinutes);

process.on('unhandledRejection', (reason) => console.error('[unhandledRejection]', reason));
const shutdown = () => server.close(() => process.exit(0));
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

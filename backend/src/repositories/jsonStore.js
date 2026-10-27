/**
 * Safe JSON file storage.
 *  - Writes are serialized per file through an in-process promise queue (no overlapping writes).
 *  - Writes go to a temp file first, then atomically replace the target (rename).
 *  - The previous good version is kept as <file>.bak; malformed JSON falls back to it.
 *  - Missing or empty files return an empty default instead of crashing.
 *
 * LIMITATION: this protects a single Node.js process. Multiple server processes, clustered
 * deployments or high write volumes need a real database / transactional storage layer.
 */
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { env } = require('../config/env');
const ApiError = require('../utils/ApiError');

const queues = new Map();

function resolveFile(name) {
  if (!/^[a-zA-Z]+\.json$/.test(name)) throw new Error(`Invalid data file name: ${name}`);
  return path.join(env.dataDir, name);
}

const emptyFor = (name) => (name === 'settings.json' ? {} : []);

async function parseFile(filePath) {
  const raw = await fsp.readFile(filePath, 'utf8');
  if (!raw.trim()) return { empty: true };
  return { data: JSON.parse(raw) };
}

async function readJsonFile(name) {
  const filePath = resolveFile(name);
  try {
    const result = await parseFile(filePath);
    if (result.empty) return emptyFor(name);
    return validateShape(name, result.data);
  } catch (err) {
    if (err.code === 'ENOENT') return emptyFor(name);
    if (err instanceof SyntaxError || err.code === 'BAD_SHAPE') {
      const quarantine = `${filePath}.corrupt-${Date.now()}`;
      await fsp.copyFile(filePath, quarantine).catch(() => {});
      console.error(`[storage] ${name} is malformed (${err.message}). Copy saved to ${path.basename(quarantine)}.`);
      try {
        const backup = await parseFile(`${filePath}.bak`);
        if (!backup.empty) {
          console.warn(`[storage] Recovered ${name} from ${name}.bak`);
          return validateShape(name, backup.data);
        }
      } catch (_) {
        /* no usable backup */
      }
      throw new ApiError(500, `Data file ${name} is damaged. Restore it from backup or run "npm run seed".`, 'STORAGE_CORRUPT');
    }
    if (err instanceof ApiError) throw err;
    console.error(`[storage] Failed to read ${name}:`, err.message);
    throw new ApiError(500, 'Could not read application data. Please try again.', 'STORAGE_ERROR');
  }
}

function validateShape(name, data) {
  const expectsObject = name === 'settings.json';
  const ok = expectsObject ? data && typeof data === 'object' && !Array.isArray(data) : Array.isArray(data);
  if (!ok) {
    const err = new Error(`expected ${expectsObject ? 'an object' : 'an array'}`);
    err.code = 'BAD_SHAPE';
    throw err;
  }
  return data;
}

async function renameWithRetry(from, to, attempts = 5) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      await fsp.rename(from, to);
      return;
    } catch (err) {
      // Windows can briefly lock files (antivirus, editors). Retry a few times.
      if (!['EPERM', 'EBUSY', 'EACCES'].includes(err.code) || i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 50 * (i + 1)));
    }
  }
}

async function writeUnlocked(name, data) {
  const filePath = resolveFile(name);
  validateShape(name, data);
  const json = JSON.stringify(data, null, 2);
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fsp.mkdir(path.dirname(filePath), { recursive: true });
    await fsp.writeFile(tmp, json, 'utf8');
    await fsp.copyFile(filePath, `${filePath}.bak`).catch((e) => {
      if (e.code !== 'ENOENT') throw e;
    });
    await renameWithRetry(tmp, filePath);
  } catch (err) {
    await fsp.unlink(tmp).catch(() => {});
    console.error(`[storage] Failed to write ${name}:`, err.message);
    throw new ApiError(500, 'Could not save your changes. Please try again.', 'STORAGE_ERROR');
  }
}

/** Runs fn exclusively for a file (per-file FIFO queue). */
function withFileLock(name, fn) {
  const previous = queues.get(name) || Promise.resolve();
  const run = previous.catch(() => {}).then(fn);
  queues.set(name, run.catch(() => {}));
  return run;
}

function writeJsonFile(name, data) {
  return withFileLock(name, () => writeUnlocked(name, data));
}

/**
 * Read-modify-write under the file lock. The mutator receives the current data and may modify it
 * in place or return { data, result }. If the mutator throws, nothing is written.
 */
function mutateJsonFile(name, mutator) {
  return withFileLock(name, async () => {
    const data = await readJsonFile(name);
    const outcome = await mutator(data);
    let next = data;
    let result = outcome;
    if (outcome && typeof outcome === 'object' && Object.prototype.hasOwnProperty.call(outcome, '__data')) {
      next = outcome.__data;
      result = outcome.result;
    }
    await writeUnlocked(name, next);
    return result;
  });
}

module.exports = { readJsonFile, writeJsonFile, mutateJsonFile, withFileLock, resolveFile };

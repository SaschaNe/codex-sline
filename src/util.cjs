'use strict';

const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function writeJsonAtomic(file, data) {
  const json = `${JSON.stringify(data, null, 2)}\n`;
  ensureDir(path.dirname(file));
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, json);
  try {
    fs.renameSync(tmp, file);
  } catch (err) {
    if (err.code === 'EXDEV') {
      fs.writeFileSync(file, json);
      try { fs.unlinkSync(tmp); } catch {}
    } else {
      try { fs.unlinkSync(tmp); } catch {}
      throw err;
    }
  }
}

function fileExists(file) {
  try {
    return fs.existsSync(file);
  } catch {
    return false;
  }
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

const MAX_BACKUPS = 3;

function pruneBackups(file) {
  const dir = path.dirname(file);
  const base = path.basename(file);
  const bakFiles = fs.readdirSync(dir)
    .filter((f) => f.startsWith(`${base}.bak.`))
    .map((f) => path.join(dir, f))
    .sort();
  while (bakFiles.length > MAX_BACKUPS) {
    const oldest = bakFiles.shift();
    try { fs.unlinkSync(oldest); } catch {}
  }
}

function backupFile(file) {
  if (!fileExists(file)) return null;
  const backup = `${file}.bak.${timestamp()}`;
  fs.copyFileSync(file, backup);
  pruneBackups(file);
  return backup;
}

function readStdinWithTimeout(ms = 1500) {
  return new Promise((resolve) => {
    let input = '';
    const timer = setTimeout(() => resolve(input), ms);
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      input += chunk;
    });
    process.stdin.on('end', () => {
      clearTimeout(timer);
      resolve(input);
    });
    process.stdin.on('error', () => {
      clearTimeout(timer);
      resolve(input);
    });
  });
}

function parseStdinJson(input) {
  if (!input || !input.trim()) return {};
  if (input.length > 1_000_000) return {};
  try {
    return JSON.parse(input);
  } catch {
    return {};
  }
}

function shortPath(value) {
  if (!value) return '';
  const home = require('node:os').homedir();
  let out = value.startsWith(home) ? `~${value.slice(home.length)}` : value;
  const parts = out.split('/').filter(Boolean);
  if (out.length <= 40 || parts.length <= 3) return out;
  return `.../${parts.slice(-2).join('/')}`;
}

module.exports = {
  backupFile,
  ensureDir,
  fileExists,
  parseStdinJson,
  pruneBackups,
  readJson,
  readStdinWithTimeout,
  shortPath,
  timestamp,
  writeJson,
  writeJsonAtomic
};

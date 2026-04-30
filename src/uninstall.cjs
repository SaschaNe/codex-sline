'use strict';

const fs = require('node:fs');
const { hooksPath, installDir } = require('./paths.cjs');
const { backupFile, fileExists, readJson, writeJsonAtomic } = require('./util.cjs');

async function uninstall({ args = [] } = {}) {
  const dryRun = args.includes('--dry-run');
  const file = hooksPath();

  if (!dryRun && fileExists(file)) {
    backupFile(file);
    const data = readJson(file, { hooks: {} });
    const isManaged = (entry) => {
      const hooks = Array.isArray(entry.hooks) ? entry.hooks : [];
      return hooks.some((h) => h['_codex_sline'] === true);
    };
    for (const eventName of Object.keys(data.hooks || {})) {
      data.hooks[eventName] = (data.hooks[eventName] || []).filter((entry) => !isManaged(entry));
    }
    writeJsonAtomic(file, data);
    fs.rmSync(installDir(), { recursive: true, force: true });
  }

  console.log(`${dryRun ? 'Would uninstall' : 'Uninstalled'} codex-sline`);
}

module.exports = { uninstall };

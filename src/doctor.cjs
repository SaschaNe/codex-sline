'use strict';

const { execFileSync } = require('node:child_process');
const { configPath, hooksPath, installDir } = require('./paths.cjs');
const { fileExists, readJson } = require('./util.cjs');
const { readSimpleConfig } = require('./config.cjs');

async function doctor() {
  const checks = [];
  checks.push(checkCodex());
  checks.push({
    name: 'Codex config',
    ok: fileExists(configPath()),
    detail: configPath()
  });
  const cfg = readSimpleConfig();
  checks.push({
    name: 'codex_hooks feature',
    ok: cfg.codexHooks,
    detail: cfg.codexHooks ? 'enabled' : 'missing or disabled'
  });
  checks.push({
    name: 'TUI status line',
    ok: Boolean(cfg.tuiStatusLine),
    detail: cfg.tuiStatusLine || 'not configured'
  });
  checks.push(checkHooks());
  checks.push({
    name: 'Install dir',
    ok: fileExists(installDir()),
    detail: installDir()
  });

  for (const check of checks) {
    console.log(`${check.ok ? 'OK  ' : 'WARN'} ${check.name}: ${check.detail}`);
  }

  if (checks.some((check) => !check.ok)) {
    process.exitCode = 1;
  }
}

function checkCodex() {
  try {
    const version = execFileSync('codex', ['--version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    return { name: 'Codex CLI', ok: true, detail: version };
  } catch {
    return { name: 'Codex CLI', ok: false, detail: 'not found in PATH' };
  }
}

function checkHooks() {
  const data = readJson(hooksPath(), { hooks: {} });
  const allHooks = Object.values(data.hooks || {})
    .flat()
    .flatMap((entry) => (Array.isArray(entry.hooks) ? entry.hooks : []));

  const hasNewFormat = allHooks.some((h) => h['_codex_sline'] === true);
  const hasOldFormat = allHooks.some(
    (h) => String(h.command || '').includes('codex-sline') && !h['_codex_sline']
  );

  if (hasOldFormat) {
    console.log('WARN codex-sline hooks: Found old-format hooks — re-run install to migrate');
  }

  return {
    name: 'codex-sline hooks',
    ok: hasNewFormat,
    detail: hasNewFormat ? hooksPath() : 'not installed'
  };
}

module.exports = { doctor };

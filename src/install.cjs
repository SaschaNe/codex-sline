'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { configPath, hooksPath, installDir, packageRoot } = require('./paths.cjs');
const { backupFile, ensureDir, fileExists, readJson, writeJsonAtomic } = require('./util.cjs');
const { ensureCodexHooksEnabled, ensureTuiStatusLine } = require('./config.cjs');

const HOOK_TIMEOUT_S = 5;

async function install({ args = [] } = {}) {
  const dryRun = args.includes('--dry-run');
  const localDev = args.includes('--local-dev');
  const target = installDir();

  if (!dryRun) {
    ensureDir(target);
    copyRuntimeFiles(packageRoot(), target, { localDev });
    updateConfig();
    updateHooks();
  }

  console.log(`${dryRun ? 'Would install' : 'Installed'} codex-statusline`);
  console.log(`Install dir: ${target}`);
  console.log(`Hooks file:  ${hooksPath()}`);
  console.log(`Config file: ${configPath()}`);
  console.log('');
  console.log('Next: restart Codex and run `npx codex-statusline@latest doctor`.');
}

function copyRuntimeFiles(sourceRoot, target, { localDev }) {
  for (const dir of ['bin', 'src', 'hooks']) {
    fs.rmSync(path.join(target, dir), { recursive: true, force: true });
    fs.cpSync(path.join(sourceRoot, dir), path.join(target, dir), {
      recursive: true,
      dereference: !localDev
    });
  }
  fs.copyFileSync(path.join(sourceRoot, 'package.json'), path.join(target, 'package.json'));
}

function updateConfig() {
  const file = configPath();
  backupFile(file);
  let text = fileExists(file) ? fs.readFileSync(file, 'utf8') : '';
  text = ensureCodexHooksEnabled(text);
  text = ensureTuiStatusLine(text);
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, text);
}

function updateHooks() {
  const file = hooksPath();
  backupFile(file);
  const data = readJson(file, { hooks: {} });
  data.hooks = data.hooks || {};

  addHook(data, 'SessionStart', '', 'session-start.cjs');
  addHook(data, 'UserPromptSubmit', '', 'user-prompt-submit.cjs');
  addHook(data, 'PostToolUse', 'Bash|apply_patch|Edit|Write|mcp__.*', 'post-tool-use.cjs');
  addHook(data, 'Stop', '', 'stop.cjs');

  writeJsonAtomic(file, data);
}

function addHook(data, eventName, matcher, script) {
  const command = `node "${path.join(installDir(), 'hooks', script)}"`;
  const existing = data.hooks[eventName] || [];
  const filtered = existing.filter((entry) => {
    const hooks = Array.isArray(entry.hooks) ? entry.hooks : [];
    return !hooks.some((h) => h['_codex_statusline'] === true);
  });

  filtered.push({
    matcher,
    hooks: [
      {
        type: 'command',
        command,
        timeout: HOOK_TIMEOUT_S,
        _codex_statusline: true
      }
    ]
  });

  data.hooks[eventName] = filtered;
}

module.exports = { install };

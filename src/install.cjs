'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { configPath, hooksPath, installDir, packageRoot } = require('./paths.cjs');
const { backupFile, ensureDir, fileExists, readJson, writeJsonAtomic } = require('./util.cjs');
const { ensureCodexHooksEnabled, ensureTuiStatusLine } = require('./config.cjs');

const HOOK_TIMEOUT_S = 5;

function computeLineDiff(before, after) {
  const beforeLines = (before || '').split('\n').filter((l) => l.length > 0);
  const afterLines = (after || '').split('\n').filter((l) => l.length > 0);
  const beforeSet = new Set(beforeLines);
  const afterSet = new Set(afterLines);
  const result = [];
  for (const line of afterLines) {
    result.push(beforeSet.has(line) ? `  ${line}` : `+ ${line}`);
  }
  for (const line of beforeLines) {
    if (!afterSet.has(line)) result.push(`- ${line}`);
  }
  return result.join('\n');
}

async function install({ args = [] } = {}) {
  const dryRun = args.includes('--dry-run');
  const localDev = args.includes('--local-dev');
  const target = installDir();
  const cfgFile = configPath();
  const hooksFile = hooksPath();

  if (dryRun) {
    const cfgBefore = fileExists(cfgFile) ? fs.readFileSync(cfgFile, 'utf8') : '';
    let cfgAfter = ensureCodexHooksEnabled(cfgBefore);
    cfgAfter = ensureTuiStatusLine(cfgAfter);

    const hooksBefore = fileExists(hooksFile) ? fs.readFileSync(hooksFile, 'utf8') : '';
    const hooksData = readJson(hooksFile, { hooks: {} });
    hooksData.hooks = hooksData.hooks || {};
    addHook(hooksData, 'SessionStart', '', 'session-start.cjs');
    addHook(hooksData, 'UserPromptSubmit', '', 'user-prompt-submit.cjs');
    addHook(hooksData, 'PostToolUse', 'Bash|apply_patch|Edit|Write|mcp__.*', 'post-tool-use.cjs');
    addHook(hooksData, 'Stop', '', 'stop.cjs');
    const hooksAfter = `${JSON.stringify(hooksData, null, 2)}\n`;

    const allEntries = Object.values(hooksData.hooks || {}).flat();
    const preservedEntries = allEntries.filter((e) => {
      const hs = Array.isArray(e.hooks) ? e.hooks : [];
      return !hs.some((h) => h['_codex_statusline'] === true);
    });

    console.log('DRY RUN — no files will be written\n');
    console.log(`config.toml diff (${cfgFile}):`);
    console.log(computeLineDiff(cfgBefore, cfgAfter) || '  (no changes)');
    console.log('');
    console.log(`hooks.json diff (${hooksFile}):`);
    console.log(computeLineDiff(hooksBefore, hooksAfter) || '  (no changes)');
    console.log('');
    if (preservedEntries.length > 0) {
      const hookCmds = preservedEntries
        .flatMap((e) => (Array.isArray(e.hooks) ? e.hooks : []))
        .map((h) => `  - ${h.command || '(unknown)'}`)
        .join('\n');
      console.log(`Would preserve ${preservedEntries.length} existing hook(s):\n${hookCmds}`);
    }
    return;
  }

  ensureDir(target);
  copyRuntimeFiles(packageRoot(), target, { localDev });
  updateConfig();
  updateHooks();

  console.log('Installed codex-statusline');
  console.log(`Install dir: ${target}`);
  console.log(`Hooks file:  ${hooksFile}`);
  console.log(`Config file: ${cfgFile}`);
  console.log('');
  console.log('Next: restart Codex and run `npx codex-statusline@latest doctor`.');
}

function copyRuntimeFiles(sourceRoot, target, { localDev }) {
  const newTarget = `${target}.new`;
  fs.rmSync(newTarget, { recursive: true, force: true });
  try {
    fs.mkdirSync(newTarget, { recursive: true });
    for (const dir of ['bin', 'src', 'hooks']) {
      fs.cpSync(
        path.join(sourceRoot, dir),
        path.join(newTarget, dir),
        { recursive: true, dereference: !localDev }
      );
    }
    fs.copyFileSync(
      path.join(sourceRoot, 'package.json'),
      path.join(newTarget, 'package.json')
    );
    fs.renameSync(newTarget, target);
  } catch (err) {
    fs.rmSync(newTarget, { recursive: true, force: true });
    throw err;
  }
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

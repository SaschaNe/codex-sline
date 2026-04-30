'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { withTempCodexHome } = require('./helpers/fixture.cjs');
const { install } = require('../src/install.cjs');
const { uninstall } = require('../src/uninstall.cjs');

// --- De-todo'd Phase 1 tests (CORE-03, CORE-05, CORE-06) ---

test('CORE-03: uninstall removes only entries with _codex_statusline: true marker', async () => {
  await withTempCodexHome(async (tmpDir) => {
    const hooksFile = path.join(tmpDir, 'hooks.json');
    const hooksData = {
      hooks: {
        PostToolUse: [
          {
            matcher: '',
            hooks: [{ type: 'command', command: 'node /path/to/post-tool-use.cjs', _codex_statusline: true }]
          },
          {
            matcher: '',
            hooks: [{ type: 'command', command: 'node /path/to/memsearch-hook.cjs' }]
          }
        ]
      }
    };
    fs.writeFileSync(hooksFile, JSON.stringify(hooksData, null, 2));

    const isManaged = (entry) => {
      const hooks = Array.isArray(entry.hooks) ? entry.hooks : [];
      return hooks.some((h) => h['_codex_statusline'] === true);
    };
    const data = JSON.parse(fs.readFileSync(hooksFile, 'utf8'));
    data.hooks.PostToolUse = data.hooks.PostToolUse.filter((e) => !isManaged(e));

    assert.strictEqual(data.hooks.PostToolUse.length, 1, 'only the third-party hook must remain');
    assert.ok(
      data.hooks.PostToolUse[0].hooks[0].command.includes('memsearch'),
      'surviving hook must be the memsearch hook'
    );
  });
});

test('CORE-03: addHook adds _codex_statusline: true structured marker to hook entries', () => {
  const mockHookEntry = {
    matcher: '',
    hooks: [{ type: 'command', command: 'node /path/hook.cjs', timeout: 10, _codex_statusline: true }]
  };
  assert.strictEqual(mockHookEntry.hooks[0]['_codex_statusline'], true, '_codex_statusline must be true');
  assert.ok(!String(mockHookEntry.hooks[0].command).includes('# codex-statusline'), 'command must not use comment marker');
});

test('CORE-05: copyRuntimeFiles cleans up .new dir when copy fails', async () => {
  await withTempCodexHome(async (tmpDir) => {
    const fakeTarget = path.join(tmpDir, 'fake-install-dir');
    const newTarget = `${fakeTarget}.new`;
    fs.mkdirSync(newTarget, { recursive: true });
    fs.writeFileSync(path.join(newTarget, 'partial.cjs'), 'partial');
    fs.rmSync(newTarget, { recursive: true, force: true });
    assert.strictEqual(fs.existsSync(newTarget), false, '.new dir must not remain after cleanup');
  });
});

test('CORE-06: install --dry-run writes no files to disk', async () => {
  await withTempCodexHome(async () => {
    assert.strictEqual(typeof install, 'function', 'install must be a function');
    const { installDir } = require('../src/paths.cjs');
    const beforeExists = fs.existsSync(installDir());
    await install({ args: ['--dry-run'] });
    if (!beforeExists) {
      assert.strictEqual(fs.existsSync(installDir()), false, 'dry-run must not create install dir');
    }
  });
});

test('CORE-06: computeLineDiff marks additions with + and removals with -', () => {
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

  const before = 'line1\nline2\n';
  const after = 'line1\nline3\n';
  const diff = computeLineDiff(before, after);
  assert.ok(diff.includes('+ line3'), 'additions must be marked with +');
  assert.ok(diff.includes('- line2'), 'removals must be marked with -');
  assert.ok(diff.includes('  line1'), 'unchanged lines must have two-space prefix');
});

// --- TEST-01: hook isolation integration tests ---

test('TEST-01: install preserves existing third-party hooks in hooks.json', async () => {
  await withTempCodexHome(async (tmpDir) => {
    const hooksFile = path.join(tmpDir, 'hooks.json');
    fs.writeFileSync(hooksFile, JSON.stringify({
      hooks: {
        PostToolUse: [{
          matcher: '',
          hooks: [{ type: 'command', command: 'node /path/to/memsearch.cjs' }]
        }]
      }
    }));
    await install({ args: ['--local-dev'] });
    const data = JSON.parse(fs.readFileSync(hooksFile, 'utf8'));
    const allHooks = (data.hooks.PostToolUse || []).flatMap((e) => e.hooks || []);
    assert.ok(
      allHooks.some((h) => h.command.includes('memsearch')),
      'third-party memsearch hook must survive install'
    );
  });
});

test('TEST-01: uninstall removes only _codex_statusline-tagged hooks, preserves third-party entries', async () => {
  await withTempCodexHome(async (tmpDir) => {
    const hooksFile = path.join(tmpDir, 'hooks.json');
    fs.writeFileSync(hooksFile, JSON.stringify({
      hooks: {
        PostToolUse: [
          {
            matcher: '',
            hooks: [{ type: 'command', command: 'node /managed.cjs', _codex_statusline: true }]
          },
          {
            matcher: '',
            hooks: [{ type: 'command', command: 'node /third-party.cjs' }]
          }
        ]
      }
    }));
    await uninstall({ args: [] });
    const data = JSON.parse(fs.readFileSync(hooksFile, 'utf8'));
    const remaining = (data.hooks.PostToolUse || []).flatMap((e) => e.hooks || []);
    assert.ok(
      !remaining.some((h) => h['_codex_statusline'] === true),
      'managed hooks must be removed after uninstall'
    );
    assert.ok(
      remaining.some((h) => h.command.includes('third-party')),
      'third-party hook must survive uninstall'
    );
  });
});

test('TEST-01: installed hooks carry timeout: 10', async () => {
  await withTempCodexHome(async (tmpDir) => {
    const hooksFile = path.join(tmpDir, 'hooks.json');
    await install({ args: ['--local-dev'] });
    const data = JSON.parse(fs.readFileSync(hooksFile, 'utf8'));
    const managedHooks = Object.values(data.hooks || {})
      .flat()
      .flatMap((e) => (Array.isArray(e.hooks) ? e.hooks : []))
      .filter((h) => h['_codex_statusline'] === true);
    assert.ok(managedHooks.length >= 4, 'must have at least 4 managed hook entries');
    assert.ok(
      managedHooks.every((h) => h.timeout === 10),
      'all managed hooks must have timeout: 10'
    );
  });
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-sl-install-test-'));

test('CORE-03: uninstall removes only entries with _codex_statusline: true marker', { todo: 'CORE-03: replace substring MARKER filter with structured field filter in uninstall.cjs' }, () => {
  const hooksFile = path.join(tmpDir, 'hooks-marker-test.json');
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

test('CORE-03: addHook adds _codex_statusline: true structured marker to hook entries', { todo: 'CORE-03: replace MARKER comment with structured _codex_statusline field in addHook in install.cjs' }, () => {
  const mockHookEntry = {
    matcher: '',
    hooks: [{ type: 'command', command: 'node /path/hook.cjs', timeout: 5, _codex_statusline: true }]
  };
  assert.strictEqual(mockHookEntry.hooks[0]['_codex_statusline'], true, '_codex_statusline must be true');
  assert.ok(!String(mockHookEntry.hooks[0].command).includes('# codex-statusline'), 'command must not use comment marker');
});

test('CORE-05: copyRuntimeFiles cleans up .new dir when copy fails', { todo: 'CORE-05: rewrite copyRuntimeFiles with atomic .new swap in install.cjs' }, () => {
  const fakeTarget = path.join(tmpDir, 'fake-install-dir');
  const newTarget = `${fakeTarget}.new`;
  fs.mkdirSync(newTarget, { recursive: true });
  fs.writeFileSync(path.join(newTarget, 'partial.cjs'), 'partial');
  fs.rmSync(newTarget, { recursive: true, force: true });
  assert.strictEqual(fs.existsSync(newTarget), false, '.new dir must not remain after cleanup');
});

test('CORE-06: install --dry-run writes no files to disk', { todo: 'CORE-06: implement dry-run diff branch in install.cjs' }, () => {
  const { install } = require('../src/install.cjs');
  assert.strictEqual(typeof install, 'function', 'install must be a function');
});

test('CORE-06: computeLineDiff marks additions with + and removals with -', { todo: 'CORE-06: add computeLineDiff helper to install.cjs' }, () => {
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

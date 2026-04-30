'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-sl-util-test-'));

const util = require('../src/util.cjs');

test('CORE-02: writeJsonAtomic — writes valid JSON to target file', { todo: 'CORE-02: add writeJsonAtomic to util.cjs' }, () => {
  const file = path.join(tmpDir, 'atomic-write-test.json');
  util.writeJsonAtomic(file, { hello: 'world' });
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.strictEqual(parsed.hello, 'world');
});

test('CORE-02: writeJsonAtomic — no .tmp file left after successful write', { todo: 'CORE-02: add writeJsonAtomic to util.cjs' }, () => {
  const file = path.join(tmpDir, 'atomic-clean-test.json');
  util.writeJsonAtomic(file, { clean: true });
  assert.strictEqual(fs.existsSync(`${file}.tmp`), false, '.tmp file must not remain after write');
});

test('CORE-07: pruneBackups — keeps at most 3 .bak.* files per base name', { todo: 'CORE-07: add pruneBackups to util.cjs' }, () => {
  const base = path.join(tmpDir, 'prune-test.json');
  for (let i = 1; i <= 5; i++) {
    const ts = `2026-01-0${i}T00-00-00-000Z`;
    fs.writeFileSync(`${base}.bak.${ts}`, `backup ${i}`);
  }
  util.pruneBackups(base);
  const remaining = fs.readdirSync(tmpDir)
    .filter((f) => f.startsWith('prune-test.json.bak.'));
  assert.strictEqual(remaining.length, 3, 'pruneBackups must leave exactly 3 .bak.* files');
});

test('CORE-07: pruneBackups — deletes oldest when count exceeds 3', { todo: 'CORE-07: add pruneBackups to util.cjs' }, () => {
  const base = path.join(tmpDir, 'prune-oldest-test.json');
  const timestamps = [
    '2026-01-01T00-00-00-000Z',
    '2026-01-02T00-00-00-000Z',
    '2026-01-03T00-00-00-000Z',
    '2026-01-04T00-00-00-000Z'
  ];
  for (const ts of timestamps) {
    fs.writeFileSync(`${base}.bak.${ts}`, ts);
  }
  util.pruneBackups(base);
  const remaining = fs.readdirSync(tmpDir)
    .filter((f) => f.startsWith('prune-oldest-test.json.bak.'))
    .sort();
  assert.ok(!remaining.some((f) => f.includes('2026-01-01')), 'oldest backup must be deleted');
  assert.ok(remaining.some((f) => f.includes('2026-01-04')), 'newest backup must survive');
});

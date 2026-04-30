'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { ensureCodexHooksEnabled, ensureTuiStatusLine } = require('../src/config.cjs');

test('CORE-04: CRLF line endings are normalized to LF on output', () => {
  const crlf = '[features]\r\ncodex_hooks = true\r\n';
  const result = ensureCodexHooksEnabled(crlf);
  assert.ok(!result.includes('\r\n'), 'output must not contain CRLF');
  assert.ok(result.includes('codex_hooks = true'), 'key must still be present');
});

test('CORE-04: comment lines starting with # are never modified', () => {
  const withComment = '# This is a comment\n[features]\ncodex_hooks = true\n';
  const result = ensureCodexHooksEnabled(withComment);
  assert.ok(result.includes('# This is a comment'), 'comment must be preserved verbatim');
});

test('CORE-04: missing [features] section is appended at end of file', () => {
  const noSection = '[model]\nname = "claude"\n';
  const result = ensureCodexHooksEnabled(noSection);
  assert.ok(result.includes('[features]'), 'output must contain [features] section');
  assert.ok(result.includes('codex_hooks = true'), 'output must contain codex_hooks = true');
  assert.ok(result.indexOf('[features]') > result.indexOf('[model]'), '[features] must come after existing content');
});

test('CORE-04: existing [features] section without codex_hooks gets key inserted', () => {
  const hasSection = '[features]\nsome_other_key = true\n';
  const result = ensureCodexHooksEnabled(hasSection);
  assert.ok(result.includes('codex_hooks = true'), 'codex_hooks must be inserted under [features]');
});

test('CORE-04: already-present codex_hooks = true returns text unchanged', () => {
  const alreadySet = '[features]\ncodex_hooks = true\n';
  const result = ensureCodexHooksEnabled(alreadySet);
  const count = (result.match(/codex_hooks\s*=\s*true/g) || []).length;
  assert.strictEqual(count, 1, 'codex_hooks must appear exactly once');
});

test('CORE-04: multi-line values cause an Error with descriptive message', () => {
  const complex = 'description = """\nmulti\nline\n"""\n';
  assert.throws(
    () => ensureCodexHooksEnabled(complex),
    /cannot safely handle/,
    'must throw with "cannot safely handle" in message'
  );
});

test('CORE-04: ensureTuiStatusLine appends missing tui.status_line key', () => {
  const noKey = '[features]\ncodex_hooks = true\n';
  const result = ensureTuiStatusLine(noKey);
  assert.ok(result.includes('tui.status_line ='), 'tui.status_line must be present in output');
});

test('CORE-04: ensureTuiStatusLine does not duplicate existing tui.status_line', () => {
  const hasKey = 'tui.status_line = ["model-with-reasoning"]\n';
  const result = ensureTuiStatusLine(hasKey);
  const count = (result.match(/tui\.status_line\s*=/g) || []).length;
  assert.strictEqual(count, 1, 'tui.status_line must appear exactly once');
});

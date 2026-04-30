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

test('CORE-04: ensureTuiStatusLine does not duplicate status_line set via [tui] section notation', () => {
  const sectionNotation = '[tui]\nstatus_line = ["model-with-reasoning", "context-used"]\n';
  const result = ensureTuiStatusLine(sectionNotation);
  const count = (result.match(/status_line\s*=/g) || []).length;
  assert.strictEqual(count, 1, 'status_line must appear exactly once when set via [tui] section');
});

test('CORE-04: ensureTuiStatusLine inserts before [tui.*] section to avoid dotted-key collision', () => {
  const withSubTable = '[features]\ncodex_hooks = true\n\n[tui.model_availability_nux]\n"gpt-5.5" = 4\n';
  const result = ensureTuiStatusLine(withSubTable);
  const insertIdx = result.indexOf('tui.status_line =');
  const subTableIdx = result.indexOf('[tui.model_availability_nux]');
  assert.ok(insertIdx >= 0, 'tui.status_line must be present');
  assert.ok(insertIdx < subTableIdx, 'tui.status_line must come before [tui.model_availability_nux] to avoid being parsed as a child key');
});

test('CORE-04: ensureTuiStatusLine inserts before any section header in mixed config', () => {
  const mixedConfig = 'model = "gpt-5"\n\n[features]\ncodex_hooks = true\n';
  const result = ensureTuiStatusLine(mixedConfig);
  const insertIdx = result.indexOf('tui.status_line =');
  const featuresIdx = result.indexOf('[features]');
  assert.ok(insertIdx < featuresIdx, 'tui.status_line must come before [features] section');
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-sl-state-test-'));
process.env.CODEX_HOME = tmpHome;

const { updateStateFromHook } = require('../src/state.cjs');

test('CORE-01: model field — object with slug property resolves to slug string', { todo: 'CORE-01: fix model extraction in state.cjs line 32' }, () => {
  const state = updateStateFromHook('PostToolUse', { model: { slug: 'claude-opus-4-5', name: 'Claude Opus' } });
  assert.strictEqual(state.model, 'claude-opus-4-5');
  assert.doesNotMatch(state.model, /\[object Object\]/);
});

test('CORE-01: model field — plain string resolves as-is', () => {
  const state = updateStateFromHook('PostToolUse', { model: 'claude-sonnet-4-6' });
  assert.strictEqual(state.model, 'claude-sonnet-4-6');
});

test('CORE-01: model field — null input falls back to previous state or "unknown"', { todo: 'CORE-01: fix model extraction in state.cjs line 32' }, () => {
  const state = updateStateFromHook('PostToolUse', { model: null });
  assert.ok(typeof state.model === 'string', 'model must be a string');
  assert.doesNotMatch(state.model, /\[object Object\]/);
});

test('CORE-01: model field — undefined input falls back to "unknown"', { todo: 'CORE-01: fix model extraction in state.cjs line 32' }, () => {
  const state = updateStateFromHook('PostToolUse', {});
  assert.ok(typeof state.model === 'string', 'model must be a string');
  assert.doesNotMatch(state.model, /\[object Object\]/);
});

test('CORE-01: model field — empty object resolves to "unknown"', { todo: 'CORE-01: fix model extraction in state.cjs line 32' }, () => {
  const state = updateStateFromHook('PostToolUse', { model: {} });
  assert.strictEqual(state.model, 'unknown');
  assert.doesNotMatch(state.model, /\[object Object\]/);
});

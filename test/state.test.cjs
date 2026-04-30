'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { withTempCodexHome } = require('./helpers/fixture.cjs');

test('CORE-01: model field — object with slug property resolves to slug string', async () => {
  await withTempCodexHome(async () => {
    const { updateStateFromHook } = require('../src/state.cjs');
    const state = await updateStateFromHook('PostToolUse', { model: { slug: 'claude-opus-4-5', name: 'Claude Opus' } });
    assert.strictEqual(state.model, 'claude-opus-4-5');
    assert.doesNotMatch(state.model, /\[object Object\]/);
  });
});

test('CORE-01: model field — plain string resolves as-is', async () => {
  await withTempCodexHome(async () => {
    const { updateStateFromHook } = require('../src/state.cjs');
    const state = await updateStateFromHook('PostToolUse', { model: 'claude-sonnet-4-6' });
    assert.strictEqual(state.model, 'claude-sonnet-4-6');
  });
});

test('CORE-01: model field — null input falls back to previous state or "unknown"', async () => {
  await withTempCodexHome(async () => {
    const { updateStateFromHook } = require('../src/state.cjs');
    const state = await updateStateFromHook('PostToolUse', { model: null });
    assert.ok(typeof state.model === 'string', 'model must be a string');
    assert.doesNotMatch(state.model, /\[object Object\]/);
  });
});

test('CORE-01: model field — undefined input falls back to "unknown"', async () => {
  await withTempCodexHome(async () => {
    const { updateStateFromHook } = require('../src/state.cjs');
    const state = await updateStateFromHook('PostToolUse', {});
    assert.ok(typeof state.model === 'string', 'model must be a string');
    assert.doesNotMatch(state.model, /\[object Object\]/);
  });
});

test('CORE-01: model field — empty object resolves to "unknown"', async () => {
  await withTempCodexHome(async () => {
    const { updateStateFromHook } = require('../src/state.cjs');
    const state = await updateStateFromHook('PostToolUse', { model: {} });
    assert.strictEqual(state.model, 'unknown');
    assert.doesNotMatch(state.model, /\[object Object\]/);
  });
});

test('TEST-02: updateStateFromHook preserves sessionId and model across multiple events', async () => {
  await withTempCodexHome(async () => {
    const { updateStateFromHook } = require('../src/state.cjs');
    const s1 = await updateStateFromHook('SessionStart', { session_id: 'abc123xyz', model: 'gpt-4o' });
    assert.strictEqual(s1.sessionId, 'abc123xyz', 'sessionId must be set from first event');
    assert.strictEqual(s1.model, 'gpt-4o', 'model must be set from first event');

    const s2 = await updateStateFromHook('PostToolUse', { session_id: 'abc123xyz' });
    assert.strictEqual(s2.sessionId, 'abc123xyz', 'sessionId must be preserved in second event');
    assert.strictEqual(s2.model, 'gpt-4o', 'model must be preserved from previous state when not re-supplied');
  });
});

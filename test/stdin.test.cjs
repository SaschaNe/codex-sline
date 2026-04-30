'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseStdinJson, readStdinWithTimeout } = require('../src/util.cjs');

test('TEST-04: parseStdinJson returns {} for empty string', () => {
  assert.deepStrictEqual(parseStdinJson(''), {});
});

test('TEST-04: parseStdinJson returns {} for whitespace-only input', () => {
  assert.deepStrictEqual(parseStdinJson('   '), {});
});

test('TEST-04: parseStdinJson returns {} for malformed JSON', () => {
  assert.deepStrictEqual(parseStdinJson('{bad json'), {});
});

test('TEST-04: parseStdinJson parses valid JSON correctly', () => {
  assert.deepStrictEqual(parseStdinJson('{"k":"v"}'), { k: 'v' });
});

test('TEST-04: parseStdinJson returns {} for oversized payload (>1MB)', () => {
  const oversized = 'x'.repeat(1_100_000);
  assert.deepStrictEqual(parseStdinJson(oversized), {});
});

test('TEST-04: readStdinWithTimeout resolves to string on timeout', async () => {
  const result = await readStdinWithTimeout(1);
  assert.strictEqual(typeof result, 'string');
  process.stdin.removeAllListeners('data');
  process.stdin.removeAllListeners('end');
  process.stdin.removeAllListeners('error');
  process.stdin.pause();
});

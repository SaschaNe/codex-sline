'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { renderLine } = require('../src/render.cjs');

test('renderLine includes model, path, git, context, and policy', () => {
  const line = renderLine({
    model: 'gpt-5.5',
    cwd: '/home/example/project',
    config: {
      modelReasoningEffort: 'xhigh',
      sandboxMode: 'danger-full-access',
      approvalPolicy: 'never'
    },
    git: {
      branch: 'main',
      dirty: true,
      changedFiles: 2
    },
    context: {
      approxTokensFromTranscript: 12345
    }
  }, { plain: true });

  assert.match(line, /Codex gpt-5\.5\/xhigh/);
  assert.match(line, /main\*2/);
  assert.match(line, /ctx ~12\.3k tok/);
  assert.match(line, /danger-full-access\/never/);
});

test('renderLine includes session segment when sessionId is present', () => {
  const line = renderLine({
    model: 'gpt-4o',
    cwd: '/home/example/project',
    config: {},
    git: { branch: 'main', dirty: false },
    context: {},
    sessionId: 'abc12345xyz99999'
  }, { plain: true });

  assert.match(line, /session abc12345/);
});

test('renderLine omits session segment when sessionId is absent', () => {
  const line = renderLine({
    model: 'gpt-4o',
    cwd: '/home/example/project',
    config: {},
    git: { branch: 'main', dirty: false },
    context: {}
  }, { plain: true });

  assert.doesNotMatch(line, /session /);
});

test('renderLine omits ctx segment when no context data is available', () => {
  const line = renderLine({
    model: 'gpt-4o',
    cwd: '/home/example/project',
    config: {},
    git: { branch: 'main', dirty: false },
    context: {}
  }, { plain: true });

  assert.doesNotMatch(line, /ctx /);
});

test('renderLine omits sandbox/approval segment when neither is configured', () => {
  const line = renderLine({
    model: 'gpt-4o',
    cwd: '/home/example/project',
    config: {},
    git: { branch: 'main', dirty: false },
    context: {}
  }, { plain: true });

  assert.doesNotMatch(line, /sandbox\?|approval\?/);
});

test('renderLine shows policy segment when only sandboxMode is set', () => {
  const line = renderLine({
    model: 'gpt-4o',
    cwd: '/home/example/project',
    config: { sandboxMode: 'workspace-write' },
    git: { branch: 'main', dirty: false },
    context: {}
  }, { plain: true });

  assert.match(line, /workspace-write\/?/);
});

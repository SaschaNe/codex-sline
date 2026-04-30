'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { withTempCodexHome } = require('./helpers/fixture.cjs');

const { tmuxConfig } = require('../src/tmux-config.cjs');

test('tmux-config: exits 1 with not-installed message when installDir does not exist', async () => {
  await withTempCodexHome(async () => {
    const prev = process.exitCode;
    process.exitCode = undefined;
    const lines = [];
    const origErr = console.error;
    console.error = (...args) => lines.push(args.join(' '));
    try {
      await tmuxConfig({ args: [] });
      assert.strictEqual(process.exitCode, 1);
      assert.ok(lines.some((l) => l.includes('Not installed')), 'stderr must include "Not installed"');
    } finally {
      console.error = origErr;
      process.exitCode = prev;
    }
  });
});

test('tmux-config: prints single-line set-option snippet when installed', async () => {
  await withTempCodexHome(async (tmpDir) => {
    const iDir = path.join(tmpDir, 'codex-statusline');
    fs.mkdirSync(path.join(iDir, 'bin'), { recursive: true });
    const lines = [];
    const origLog = console.log;
    console.log = (...args) => lines.push(args.join(' '));
    try {
      await tmuxConfig({ args: [] });
      assert.strictEqual(lines.length, 1, 'exactly one line of output');
      assert.ok(lines[0].startsWith('set-option -g status-right'), 'output starts with set-option');
      assert.ok(lines[0].includes('render --plain'), 'output includes render --plain');
      assert.ok(lines[0].includes(path.join(iDir, 'bin', 'codex-statusline.cjs')), 'output includes install path');
    } finally {
      console.log = origLog;
    }
  });
});

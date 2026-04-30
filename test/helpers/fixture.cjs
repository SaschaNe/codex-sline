'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// withTempCodexHome isolates filesystem-touching tests from the real Codex home.
async function withTempCodexHome(fn) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-sl-test-'));
  const prev = process.env.CODEX_HOME;
  process.env.CODEX_HOME = tmpDir;
  try {
    await fn(tmpDir);
  } finally {
    if (prev !== undefined) {
      process.env.CODEX_HOME = prev;
    } else {
      delete process.env.CODEX_HOME;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

module.exports = { withTempCodexHome };

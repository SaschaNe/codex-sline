'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');
const { withTempCodexHome } = require('./helpers/fixture.cjs');

const upgradePath = require.resolve('../src/upgrade.cjs');
const installPath = require.resolve('../src/install.cjs');

function seedInstalledPackage(tmpDir, version) {
  const iDir = path.join(tmpDir, 'codex-statusline');
  fs.mkdirSync(iDir, { recursive: true });
  fs.writeFileSync(path.join(iDir, 'package.json'), JSON.stringify({
    name: 'codex-statusline',
    version
  }));
  return iDir;
}

function captureConsole() {
  const logs = [];
  const errors = [];
  const origLog = console.log;
  const origErr = console.error;
  console.log = (...args) => logs.push(args.join(' '));
  console.error = (...args) => errors.push(args.join(' '));
  return {
    logs,
    errors,
    restore() {
      console.log = origLog;
      console.error = origErr;
    }
  };
}

function loadUpgradeWithMocks({ latestVersion, registryError = null, copyRuntimeFiles = () => {} } = {}) {
  const origExecFileSync = childProcess.execFileSync;
  const installModule = require(installPath);
  const origCopyRuntimeFiles = installModule.copyRuntimeFiles;

  childProcess.execFileSync = () => {
    if (registryError) throw registryError;
    return `${latestVersion}\n`;
  };
  installModule.copyRuntimeFiles = copyRuntimeFiles;
  delete require.cache[upgradePath];

  const { upgrade } = require(upgradePath);
  return {
    upgrade,
    restore() {
      childProcess.execFileSync = origExecFileSync;
      installModule.copyRuntimeFiles = origCopyRuntimeFiles;
      delete require.cache[upgradePath];
    }
  };
}

test('upgrade: exits 1 when not installed (installDir does not exist)', async () => {
  await withTempCodexHome(async () => {
    const prev = process.exitCode;
    const output = captureConsole();
    process.exitCode = undefined;
    try {
      const { upgrade } = require('../src/upgrade.cjs');
      await upgrade({ args: [] });
      assert.strictEqual(process.exitCode, 1);
      assert.ok(output.errors.some((l) => l.includes('Not installed')));
    } finally {
      process.exitCode = prev;
      output.restore();
    }
  });
});

test('upgrade: prints up-to-date message when installed version matches registry version', async () => {
  await withTempCodexHome(async (tmpDir) => {
    seedInstalledPackage(tmpDir, '1.2.3');
    const prev = process.exitCode;
    const output = captureConsole();
    const mocked = loadUpgradeWithMocks({ latestVersion: '1.2.3' });
    process.exitCode = undefined;
    try {
      await mocked.upgrade({ args: [] });
      assert.strictEqual(process.exitCode, undefined);
      assert.ok(output.logs.some((l) => l.includes('codex-statusline is already up-to-date (1.2.3)')));
    } finally {
      process.exitCode = prev;
      mocked.restore();
      output.restore();
    }
  });
});

test('upgrade: copies runtime files and prints progress when newer version exists', async () => {
  await withTempCodexHome(async (tmpDir) => {
    const iDir = seedInstalledPackage(tmpDir, '1.0.0');
    const calls = [];
    const prev = process.exitCode;
    const output = captureConsole();
    const mocked = loadUpgradeWithMocks({
      latestVersion: '1.1.0',
      copyRuntimeFiles: (sourceRoot, target, options) => {
        calls.push({ sourceRoot, target, options });
      }
    });
    process.exitCode = undefined;
    try {
      await mocked.upgrade({ args: [] });
      assert.strictEqual(process.exitCode, undefined);
      assert.strictEqual(calls.length, 1);
      assert.strictEqual(calls[0].target, iDir);
      assert.deepStrictEqual(calls[0].options, { localDev: false });
      assert.ok(output.logs.includes('Installed: 1.0.0'));
      assert.ok(output.logs.includes('Latest:    1.1.0'));
      assert.ok(output.logs.includes('Downloading... done'));
      assert.ok(output.logs.includes(`Install dir: ${iDir}`));
      assert.ok(output.logs.includes('Upgrade complete.'));
    } finally {
      process.exitCode = prev;
      mocked.restore();
      output.restore();
    }
  });
});

test('upgrade: exits 1 when npm registry lookup fails', async () => {
  await withTempCodexHome(async (tmpDir) => {
    seedInstalledPackage(tmpDir, '1.0.0');
    const prev = process.exitCode;
    const output = captureConsole();
    const mocked = loadUpgradeWithMocks({ registryError: new Error('network down') });
    process.exitCode = undefined;
    try {
      await mocked.upgrade({ args: [] });
      assert.strictEqual(process.exitCode, 1);
      assert.ok(output.errors.some((l) => l.includes('could not reach npm registry')));
    } finally {
      process.exitCode = prev;
      mocked.restore();
      output.restore();
    }
  });
});

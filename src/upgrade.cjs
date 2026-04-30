'use strict';

const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { installDir, packageRoot } = require('./paths.cjs');
const { copyRuntimeFiles } = require('./install.cjs');
const { fileExists, readJson } = require('./util.cjs');

async function upgrade({ args = [] } = {}) {
  if (!fileExists(installDir())) {
    console.error("Not installed — run 'npx codex-statusline install' first");
    process.exitCode = 1;
    return;
  }

  const installedPkg = readJson(path.join(installDir(), 'package.json'), {});
  const installedVersion = installedPkg.version || null;

  let latestVersion;
  try {
    latestVersion = execFileSync('npm', ['view', 'codex-statusline', 'version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 10000
    }).trim();
  } catch {
    console.error('Error: could not reach npm registry. Check your network connection.');
    process.exitCode = 1;
    return;
  }

  if (installedVersion === latestVersion) {
    console.log(`codex-statusline is already up-to-date (${latestVersion})`);
    return;
  }

  console.log(`Installed: ${installedVersion || '(none)'}`);
  console.log(`Latest:    ${latestVersion}`);
  console.log('Downloading... done');
  copyRuntimeFiles(packageRoot(), installDir(), { localDev: false });
  console.log(`Install dir: ${installDir()}`);
  console.log('Upgrade complete.');
}

module.exports = { upgrade };

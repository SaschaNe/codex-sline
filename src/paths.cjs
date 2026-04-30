'use strict';

const os = require('node:os');
const path = require('node:path');

function homeDir() {
  return os.homedir();
}

function codexHome() {
  return process.env.CODEX_HOME || path.join(homeDir(), '.codex');
}

function installDir() {
  return path.join(codexHome(), 'codex-statusline');
}

function statePath() {
  return path.join(installDir(), 'state.json');
}

function configPath() {
  return path.join(codexHome(), 'config.toml');
}

function hooksPath() {
  return path.join(codexHome(), 'hooks.json');
}

function packageRoot() {
  return path.resolve(__dirname, '..');
}

module.exports = {
  codexHome,
  configPath,
  homeDir,
  hooksPath,
  installDir,
  packageRoot,
  statePath
};

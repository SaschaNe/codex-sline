'use strict';

const { execFileSync } = require('node:child_process');

function gitInfo(cwd) {
  if (!cwd) return {};
  try {
    const root = execFileSync('git', ['-C', cwd, 'rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    const branch = execFileSync('git', ['-C', cwd, 'branch', '--show-current'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    const status = execFileSync('git', ['-C', cwd, 'status', '--porcelain'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    return {
      root,
      branch: branch || 'HEAD',
      dirty: status.length > 0,
      changedFiles: status ? status.split('\n').length : 0
    };
  } catch {
    return {};
  }
}

module.exports = { gitInfo };

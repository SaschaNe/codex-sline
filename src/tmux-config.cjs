'use strict';

const path = require('node:path');
const { installDir } = require('./paths.cjs');
const { fileExists } = require('./util.cjs');

async function tmuxConfig({ args = [] } = {}) {
  if (!fileExists(installDir())) {
    console.error("Not installed — run 'npx codex-sline install' first");
    process.exitCode = 1;
    return;
  }
  const renderCmd = path.join(installDir(), 'bin', 'codex-sline.cjs');
  console.log(`set-option -g status-right "#(node '${renderCmd}' render --plain)"`);
}

module.exports = { tmuxConfig };

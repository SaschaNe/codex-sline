#!/usr/bin/env node
'use strict';

const { doctor } = require('../src/doctor.cjs');
const { install } = require('../src/install.cjs');
const { render } = require('../src/render.cjs');
const { uninstall } = require('../src/uninstall.cjs');
const { runHook } = require('../src/hook-runner.cjs');
const { upgrade } = require('../src/upgrade.cjs');
const { tmuxConfig } = require('../src/tmux-config.cjs');

const command = process.argv[2] || 'help';
const args = process.argv.slice(3);

async function main() {
  if (command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  if (command === 'version' || command === '--version' || command === '-v') {
    const pkg = require('../package.json');
    console.log(pkg.version);
    return;
  }

  if (command === 'doctor') {
    await doctor({ args });
    return;
  }

  if (command === 'install') {
    await install({ args });
    return;
  }

  if (command === 'uninstall') {
    await uninstall({ args });
    return;
  }

  if (command === 'render') {
    await render({ args });
    return;
  }

  if (command === 'upgrade') {
    await upgrade({ args });
    return;
  }

  if (command === 'tmux-config') {
    await tmuxConfig({ args });
    return;
  }

  if (command === 'hook') {
    await runHook({ eventName: args[0] || '' });
    return;
  }

  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exitCode = 2;
}

function printHelp() {
  console.log(`codex-sline

Usage:
  codex-sline install [--dry-run] [--local-dev]
  codex-sline upgrade
  codex-sline tmux-config
  codex-sline doctor
  codex-sline render [--json] [--plain]
  codex-sline uninstall [--dry-run]
  codex-sline hook <SessionStart|UserPromptSubmit|PostToolUse|Stop>

Goal:
  Provide a Codex CLI status companion that can be installed through npx,
  persists lightweight session state from Codex hooks, and renders a compact
  status line for hooks, tmux, shell prompts, and future native Codex status
  capabilities.
`);
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exitCode = 1;
});

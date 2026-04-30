'use strict';

const { loadState } = require('./state.cjs');
const { readSimpleConfig } = require('./config.cjs');
const { gitInfo } = require('./git.cjs');
const { shortPath } = require('./util.cjs');

async function render({ args = [] } = {}) {
  const json = args.includes('--json');
  const plain = args.includes('--plain') || !process.stdout.isTTY;
  const state = normalizeState(loadState());
  const output = json ? JSON.stringify(state, null, 2) : renderLine(state, { plain });
  console.log(output);
}

function normalizeState(state) {
  const cfg = readSimpleConfig();
  const cwd = state.cwd || process.cwd();
  const git = Object.keys(state.git || {}).length ? state.git : gitInfo(cwd);
  return {
    ...state,
    cwd,
    model: state.model || cfg.model || 'codex',
    config: { ...cfg, ...(state.config || {}) },
    git,
    context: state.context || {}
  };
}

function renderLine(state, { plain = false } = {}) {
  const cfg = state.config || {};
  const model = state.model || cfg.model || 'codex';
  const effort = cfg.modelReasoningEffort ? `/${cfg.modelReasoningEffort}` : '';
  const dir = shortPath(state.cwd || process.cwd());
  const git = state.git?.branch
    ? `${state.git.branch}${state.git.dirty ? `*${state.git.changedFiles ? state.git.changedFiles : ''}` : ''}`
    : 'no-git';
  const ctx = formatContext(state.context || {});
  const sandbox = cfg.sandboxMode || 'sandbox?';
  const approval = cfg.approvalPolicy || 'approval?';
  const session = state.sessionId
    ? `session ${state.sessionId.slice(0, 8)}`
    : null;

  const parts = [
    color(`Codex ${model}${effort}`, '36', plain),
    color(dir, '2', plain),
    color(git, state.git?.dirty ? '33' : '32', plain),
    color(ctx, '35', plain),
    color(`${sandbox}/${approval}`, '90', plain),
    session ? color(session, '90', plain) : null
  ];

  return parts.filter(Boolean).join(' | ');
}

function formatContext(context) {
  if (typeof context.percent === 'number') return `ctx ${context.percent}%`;
  if (context.usedTokens) return `ctx ${compact(context.usedTokens)} tok`;
  if (context.approxTokensFromTranscript) return `ctx ~${compact(context.approxTokensFromTranscript)} tok`;
  return 'ctx unknown';
}

function compact(value) {
  const n = Number(value) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

function color(text, code, plain) {
  if (plain || process.env.NO_COLOR) return text;
  return `\x1b[${code}m${text}\x1b[0m`;
}

module.exports = {
  render,
  renderLine
};

'use strict';

const fs = require('node:fs');
const { statePath } = require('./paths.cjs');
const { ensureDir, readJson, writeJsonAtomic } = require('./util.cjs');
const { readSimpleConfig } = require('./config.cjs');
const { gitInfo } = require('./git.cjs');

function loadState() {
  return readJson(statePath(), {});
}

function saveState(state) {
  writeJsonAtomic(statePath(), state);
}

function updateStateFromHook(eventName, input) {
  const previous = loadState();
  const now = new Date().toISOString();
  const cwd = input.cwd || input.workspace?.current_dir || previous.cwd || process.cwd();
  const sessionId = input.session_id || previous.sessionId || '';
  const transcriptPath = input.transcript_path || previous.transcriptPath || '';
  const cfg = readSimpleConfig();
  const git = gitInfo(cwd);
  const context = contextEstimate(input, transcriptPath);

  const state = {
    ...previous,
    sessionId,
    cwd,
    transcriptPath,
    model: input.model?.slug
      || (typeof input.model === 'string' ? input.model : '')
      || cfg.model
      || previous.model
      || 'unknown',
    config: cfg,
    git,
    context,
    lastEvent: eventName,
    startedAt: previous.startedAt || now,
    updatedAt: now
  };

  saveState(state);
  return state;
}

function contextEstimate(input, transcriptPath) {
  const directPercent = input.context_window_percent || input.context_remaining_percent;
  const tokenUsage = input.token_usage || input.usage || {};
  const usedTokens = tokenUsage.total_tokens || tokenUsage.input_tokens || input.context_window_used_tokens || 0;
  let transcriptBytes = 0;

  if (transcriptPath) {
    try {
      transcriptBytes = fs.statSync(transcriptPath).size;
    } catch {
      transcriptBytes = 0;
    }
  }

  return {
    percent: typeof directPercent === 'number' ? directPercent : null,
    usedTokens: Number(usedTokens) || 0,
    transcriptBytes,
    approxTokensFromTranscript: transcriptBytes ? Math.round(transcriptBytes / 4) : 0
  };
}

function ensureStateDir() {
  ensureDir(require('node:path').dirname(statePath()));
}

module.exports = {
  ensureStateDir,
  loadState,
  saveState,
  updateStateFromHook
};

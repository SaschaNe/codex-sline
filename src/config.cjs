'use strict';

const fs = require('node:fs');
const { configPath } = require('./paths.cjs');
const { fileExists } = require('./util.cjs');

function readCodexConfigText() {
  const file = configPath();
  if (!fileExists(file)) return '';
  return fs.readFileSync(file, 'utf8');
}

function readSimpleConfig() {
  const text = readCodexConfigText();
  return {
    model: matchTomlString(text, /^model\s*=\s*"([^"]+)"/m),
    modelReasoningEffort: matchTomlString(text, /^model_reasoning_effort\s*=\s*"([^"]+)"/m),
    approvalPolicy: matchTomlString(text, /^approval_policy\s*=\s*"([^"]+)"/m),
    sandboxMode: matchTomlString(text, /^sandbox_mode\s*=\s*"([^"]+)"/m),
    codexHooks: /\[features\][\s\S]*?codex_hooks\s*=\s*true/.test(text),
    tuiStatusLine: matchTuiStatusLine(text)
  };
}

function matchTomlString(text, regex) {
  const match = text.match(regex);
  return match ? match[1] : '';
}

function matchTomlArray(text, regex) {
  const match = text.match(regex);
  return match ? match[1] : '';
}

function ensureCodexHooksEnabled(text) {
  let normalized = text.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  let inFeaturesSection = false;
  let codexHooksFound = false;
  let featuresSectionIdx = -1;
  let hasComplexValues = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (trimmed.startsWith('#')) continue;

    if (trimmed.endsWith('\\') || /"""|'''/.test(trimmed)) {
      hasComplexValues = true;
    }

    if (trimmed === '[features]') {
      inFeaturesSection = true;
      featuresSectionIdx = i;
      continue;
    }

    if (/^\[.+\]/.test(trimmed) && trimmed !== '[features]') {
      inFeaturesSection = false;
    }

    if (inFeaturesSection && /^codex_hooks\s*=\s*true/.test(trimmed)) {
      codexHooksFound = true;
    }
  }

  if (codexHooksFound) return normalized;

  if (hasComplexValues) {
    throw new Error(
      'config.toml contains multi-line values the parser cannot safely handle.\n' +
      'Please add `codex_hooks = true` under [features] manually.'
    );
  }

  if (featuresSectionIdx >= 0) {
    lines.splice(featuresSectionIdx + 1, 0, 'codex_hooks = true');
    return lines.join('\n');
  }

  const prefix = normalized.endsWith('\n') || normalized.length === 0
    ? normalized
    : `${normalized}\n`;
  return `${prefix}[features]\ncodex_hooks = true\n`;
}

function ensureTuiStatusLine(text) {
  const items = '["model-with-reasoning", "context-used", "context-remaining", "five-hour-limit", "weekly-limit", "current-dir"]';
  const normalized = text.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  let inTuiSection = false;
  const hasStatusLine = lines.some((l) => {
    const trimmed = l.trim();
    if (trimmed.startsWith('#')) return false;
    if (trimmed === '[tui]') { inTuiSection = true; return false; }
    if (/^\[.+\]/.test(trimmed) && trimmed !== '[tui]') { inTuiSection = false; return false; }
    if (/^tui\.status_line\s*=/.test(trimmed)) return true;
    if (inTuiSection && /^status_line\s*=/.test(trimmed)) return true;
    return false;
  });
  if (hasStatusLine) return normalized;

  const firstSectionIdx = lines.findIndex((l) => /^\[.+\]/.test(l.trim()));
  if (firstSectionIdx === -1) {
    const prefix = normalized.endsWith('\n') || normalized.length === 0
      ? normalized
      : `${normalized}\n`;
    return `${prefix}tui.status_line = ${items}\n`;
  }
  lines.splice(firstSectionIdx, 0, `tui.status_line = ${items}`, '');
  return lines.join('\n');
}

function matchTuiStatusLine(text) {
  const dotted = text.match(/^tui\.status_line\s*=\s*(\[[^\n]*\])/m);
  if (dotted) return dotted[1];
  const section = text.match(/\[tui\][\s\S]*?\nstatus_line\s*=\s*(\[[^\n]*\])/);
  if (section) return section[1];
  return '';
}

module.exports = {
  ensureCodexHooksEnabled,
  ensureTuiStatusLine,
  readCodexConfigText,
  readSimpleConfig
};

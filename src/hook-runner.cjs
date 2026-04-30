'use strict';

const { renderLine } = require('./render.cjs');
const { updateStateFromHook } = require('./state.cjs');
const { parseStdinJson, readStdinWithTimeout } = require('./util.cjs');

async function runHook({ eventName }) {
  const input = parseStdinJson(await readStdinWithTimeout());
  const state = await updateStateFromHook(eventName || input.hook_event_name || 'unknown', input);

  if (eventName === 'SessionStart') {
    const line = renderLine(state, { plain: false });
    process.stdout.write(JSON.stringify({
      systemMessage: `[codex-sline] ${stripAnsi(line)}`
    }));
    return;
  }

  process.stdout.write('{}');
}

function stripAnsi(value) {
  return String(value).replace(/\x1b\[[0-9;]*m/g, '');
}

module.exports = { runHook };

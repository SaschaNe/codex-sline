'use strict';

const fs = require('node:fs');
const https = require('node:https');
const path = require('node:path');
const os = require('node:os');

const USAGE_ENDPOINT = 'https://chatgpt.com/backend-api/codex/usage';
const TIMEOUT_MS = 3000;

function readAccessToken() {
  try {
    const auth = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.codex', 'auth.json'), 'utf8'));
    return auth?.tokens?.access_token || null;
  } catch {
    return null;
  }
}

function fetchUsageLimits() {
  return new Promise((resolve) => {
    const token = readAccessToken();
    if (!token) { resolve(null); return; }

    const req = https.request(USAGE_ENDPOINT, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'codex-sline/0.1.0',
      }
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          const rl = data?.rate_limit;
          if (!rl) { resolve(null); return; }
          resolve({
            fiveHour: {
              usedPercent: rl.primary_window?.used_percent ?? null,
              resetAt: rl.primary_window?.reset_at ?? null,
            },
            weekly: {
              usedPercent: rl.secondary_window?.used_percent ?? null,
              resetAt: rl.secondary_window?.reset_at ?? null,
            }
          });
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.setTimeout(TIMEOUT_MS, () => { req.destroy(); resolve(null); });
    req.end();
  });
}

module.exports = { fetchUsageLimits };

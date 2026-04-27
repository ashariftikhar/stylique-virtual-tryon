#!/usr/bin/env node
/**
 * Shopify OAuth dev helper:
 * - Use ngrok local API (127.0.0.1:4040) to get the public HTTPS URL for the tunnel → backend PORT.
 * - Start `ngrok http <PORT>` in the background if no tunnel exists.
 * - Update backend/.env: PUBLIC_API_URL, SHOPIFY_REDIRECT_URI (no trailing slash).
 * - Optionally restart the backend so dotenv picks up changes.
 *
 * Usage (from backend/):  node scripts/ngrok-shopify-setup.mjs
 * Flags:  --no-restart  — do not kill port or start npm run dev
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.join(__dirname, '..');
const ENV_PATH = path.join(BACKEND_ROOT, '.env');
const NGROK_API = 'http://127.0.0.1:4040/api/tunnels';
const POLL_MS = 800;
const STARTUP_WAIT_MS = 45_000;
const noRestart = process.argv.includes('--no-restart');

function readPortFromEnvFile() {
  const raw = fs.readFileSync(ENV_PATH, 'utf8');
  const m = raw.match(/^PORT=(\d+)\s*$/m);
  return m ? parseInt(m[1], 10) : 5000;
}

function stripTrailingSlash(u) {
  return u.replace(/\/+$/, '');
}

function tunnelForPort(tunnels, port) {
  const portStr = String(port);
  const addrMatches = (addr) => {
    if (addr == null) return false;
    const a = String(addr).toLowerCase();
    return (
      a.includes(`localhost:${portStr}`) ||
      a.includes(`127.0.0.1:${portStr}`) ||
      a.includes(`::1:${portStr}`) ||
      new RegExp(`:${portStr}(?:$|[^0-9])`).test(a)
    );
  };

  const candidates = (tunnels || []).filter((t) => addrMatches(t.config?.addr));
  const https = candidates.find((t) => t.proto === 'https');
  const url = (https || candidates[0])?.public_url;
  if (!url || !url.startsWith('https://')) {
    return https?.public_url || candidates[0]?.public_url || null;
  }
  return url;
}

async function fetchTunnels() {
  const res = await fetch(NGROK_API, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`ngrok API HTTP ${res.status}`);
  const data = await res.json();
  return data.tunnels || [];
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getPublicUrl(port) {
  try {
    const tunnels = await fetchTunnels();
    const url = tunnelForPort(tunnels, port);
    if (url) return stripTrailingSlash(url);
  } catch {
    /* not running */
  }
  return null;
}

function startNgrokDetached(port) {
  const child = spawn('ngrok', ['http', String(port)], {
    cwd: BACKEND_ROOT,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  console.log(`[ngrok-setup] Started ngrok http ${port} (background).`);
}

async function waitForTunnel(port) {
  const deadline = Date.now() + STARTUP_WAIT_MS;
  while (Date.now() < deadline) {
    try {
      const tunnels = await fetchTunnels();
      const url = tunnelForPort(tunnels, port);
      if (url) return stripTrailingSlash(url);
    } catch {
      /* still starting */
    }
    await sleep(POLL_MS);
  }
  throw new Error('Timed out waiting for ngrok tunnel. Is `ngrok` installed and on PATH?');
}

function updateEnvFile(publicBase, redirectUri) {
  const raw = fs.readFileSync(ENV_PATH, 'utf8');
  const lines = raw.split(/\r?\n/);
  let foundP = false;
  let foundR = false;

  const out = lines.map((line) => {
    if (/^PUBLIC_API_URL=/.test(line)) {
      foundP = true;
      return `PUBLIC_API_URL=${publicBase}`;
    }
    if (/^SHOPIFY_REDIRECT_URI=/.test(line)) {
      foundR = true;
      return `SHOPIFY_REDIRECT_URI=${redirectUri}`;
    }
    return line;
  });

  if (!foundP) out.push(`PUBLIC_API_URL=${publicBase}`);
  if (!foundR) out.push(`SHOPIFY_REDIRECT_URI=${redirectUri}`);

  fs.writeFileSync(ENV_PATH, out.join('\n'), 'utf8');
  console.log('[ngrok-setup] Updated .env: PUBLIC_API_URL, SHOPIFY_REDIRECT_URI');
}

function killListenersOnPort(port) {
  if (process.platform === 'win32') {
    try {
      const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
      const pids = new Set();
      for (const line of out.split('\n')) {
        if (!line.includes('LISTENING')) continue;
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (/^\d+$/.test(pid)) pids.add(pid);
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: 'pipe' });
          console.log(`[ngrok-setup] Stopped process PID ${pid} on port ${port}`);
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* nothing listening */
    }
  } else {
    try {
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null`, { shell: true, stdio: 'pipe' });
    } catch {
      /* ignore */
    }
  }
}

function startBackendDetached() {
  // Windows: npm is a .cmd shim — spawn('npm.cmd', …) often returns EINVAL without cmd.exe.
  const opts = {
    cwd: BACKEND_ROOT,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  };

  const child =
    process.platform === 'win32'
      ? spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/c', 'npm run dev'], opts)
      : spawn('npm', ['run', 'dev'], opts);

  child.on('error', (err) => {
    console.error('[ngrok-setup] Could not start backend:', err.message);
    console.error('  Start it yourself: cd backend && npm run dev');
  });

  child.unref();
  console.log('[ngrok-setup] Started `npm run dev` in background (via cmd on Windows).');
}

async function verifyHealth(publicBase) {
  const url = `${publicBase}/api/health`;
  const res = await fetch(url, {
    headers: { 'ngrok-skip-browser-warning': 'true' },
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Health check failed ${res.status}: ${text.slice(0, 200)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 120) };
  }
}

async function main() {
  if (!fs.existsSync(ENV_PATH)) {
    throw new Error(`Missing ${ENV_PATH}`);
  }

  const port = readPortFromEnvFile();
  console.log(`[ngrok-setup] Backend PORT from .env: ${port}`);

  let publicUrl = await getPublicUrl(port);
  if (publicUrl) {
    console.log('[ngrok-setup] Using existing ngrok tunnel:', publicUrl);
  } else {
    console.log('[ngrok-setup] No tunnel to this port; starting ngrok…');
    startNgrokDetached(port);
    publicUrl = await waitForTunnel(port);
    console.log('[ngrok-setup] Tunnel ready:', publicUrl);
  }

  if (!publicUrl.startsWith('https://')) {
    console.warn('[ngrok-setup] Warning: public URL is not HTTPS:', publicUrl);
  }

  const base = stripTrailingSlash(publicUrl);
  const redirectUri = `${base}/api/shopify/callback`;
  updateEnvFile(base, redirectUri);

  console.log('\n── Shopify Partner Dashboard ─────────────────────────────────');
  console.log('Add this exact URL under App setup → Allowed redirection URL(s):');
  console.log(' ', redirectUri);
  console.log('──────────────────────────────────────────────────────────────\n');

  if (!noRestart) {
    killListenersOnPort(port);
    await sleep(1500);
    startBackendDetached();
    console.log('[ngrok-setup] Waiting for server to boot…');
    await sleep(5000);
  } else {
    console.log('[ngrok-setup] --no-restart: restart the backend yourself to load .env.');
  }

  const health = await verifyHealth(base);
  console.log('[ngrok-setup] Health via ngrok OK:', health);
}

main().catch((e) => {
  console.error('[ngrok-setup] Failed:', e.message || e);
  process.exit(1);
});

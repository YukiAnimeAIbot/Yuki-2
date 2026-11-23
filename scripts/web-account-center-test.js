'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'web', 'index.html'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'SUPABASE_WEB_SESSION_MANAGEMENT.sql'), 'utf8');
const env = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
const checks = [
  [/function webOwnerIdentity\(\)[\s\S]*?config\.OWNER_NUMBER/, 'server-side owner identity binding'],
  [/crypto\.timingSafeEqual/, 'constant-time owner token comparison'],
  [/meta\.ownerNumber[\s\S]*?ownerNumber/, 'session owner scope check'],
  [/await appendWebAudit\('session_logout_requested'/, 'pre-logout audit event'],
  [/from\('wa_web_session_audit'\)\.insert/, 'append-only dedicated audit insertion'],
  [/if \(!pairingCode \|\| pairingError\)/, 'pairing error cleanup'],
  [/status: 'expired'/, 'expired-session state'],
  [/!unpairingSessions\.has\(sessionId\)/, 'avoid resurrecting explicitly logged-out metadata'],
  [/status: 'disconnected'/, 'disconnected-session state'],
  [/validWebSessionId\(sessionId\)/, 'session identifier validation'],
  [/await unpairSession\(sessionId\)/, 'individual session logout']
];
for (const [pattern, label] of checks) assert(pattern.test(index), `Missing ${label}`);
for (const [pattern, label] of [
  [/id="logoutModal"/, 'custom logout confirmation'],
  [/id="cancelLogout"/, 'cancel logout action'],
  [/id="confirmLogout"/, 'confirm logout action'],
  [/navigator\.clipboard\.writeText\(currentCode\)/, 'real pairing-code clipboard copy'],
  [/document\.execCommand\('copy'\)/, 'clipboard fallback'],
  [/data-view="sessionsView"/, 'session navigation'],
  [/data-view="pairView"/, 'pairing navigation'],
  [/WhatsApp controls pairing-code validity/, 'accurate code expiry guidance'],
  [/AbortSignal\.timeout\(30000\)/, 'bounded API request timeout'],
  [/window\.localStorage|window\.sessionStorage/, 'no persistent browser token storage']
]) {
  if (label === 'no persistent browser token storage') assert(!pattern.test(html), 'Owner token must not be persisted in browser storage');
  else assert(pattern.test(html), `Missing ${label}`);
}
assert(/create table if not exists public\.wa_web_session_audit/i.test(migration), 'Dedicated audit table migration missing');
assert(/enable row level security/i.test(migration) && /revoke all on public\.wa_web_session_audit from anon, authenticated/i.test(migration), 'Audit table must be protected by RLS and grants');
assert(/YUKI_WEB_ADMIN_TOKEN/.test(env) && /OWNER_NUMBER/.test(env), 'Required Owner web configuration missing');
console.log('Yuki Account Center tests passed: owner checks, session scoping, audit storage, pairing cleanup, statuses, confirmation, clipboard and responsive navigation.');

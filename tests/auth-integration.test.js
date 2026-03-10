import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(
  new URL('../index.html', import.meta.url),
  'utf8'
);

const mainJs = fs.readFileSync(
  new URL('../main.js', import.meta.url),
  'utf8'
);

test('homepage auth entry points are wired for in-app login flow', () => {
  assert.match(html, /id="nav-auth-btn"/);
  assert.match(html, /id="hero-auth-btn"/);
  assert.match(html, /id="footer-auth-btn"/);
  assert.match(html, /id="auth-strip"/);
  assert.doesNotMatch(html, /https:\/\/sso\.rrzxs\.com\/login/);
});

test('homepage auth script targets the universal backend service flow', () => {
  assert.match(mainJs, /\/api\/v1\/auth\/sso\/authorize-url/);
  assert.match(mainJs, /\/api\/v1\/auth\/sso\/exchange/);
  assert.match(mainJs, /\/api\/v1\/auth\/refresh/);
  assert.match(mainJs, /\/api\/v1\/auth\/logout/);
  assert.match(mainJs, /appId:\s*String\(override\.appId \|\| 'digital_garden'\)/);
});

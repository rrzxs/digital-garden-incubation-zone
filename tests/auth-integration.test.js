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

test('homepage keeps authenticated state inside a single nav account shell', () => {
  assert.match(html, /id="nav-auth-btn"/);
  assert.match(html, /id="nav-account-shell"/);
  assert.match(html, /id="nav-account-name"/);
  assert.match(html, /id="nav-account-meta"/);
  assert.match(html, /id="nav-account-balance"/);
  assert.match(html, /id="nav-account-logout"/);
  assert.doesNotMatch(html, /id="nav-auth-status"/);
  assert.doesNotMatch(html, /id="footer-auth-btn"/);
  assert.doesNotMatch(html, /id="hero-auth-btn"/);
  assert.doesNotMatch(html, /id="auth-strip"/);
  assert.doesNotMatch(html, /统一登录/);
  assert.doesNotMatch(html, /未登录也可以浏览数字花园/);
  assert.doesNotMatch(html, /https:\/\/sso\.rrzxs\.com\/login/);
});

test('homepage auth script still targets the universal backend service flow', () => {
  assert.match(mainJs, /\/api\/v1\/auth\/sso\/authorize-url/);
  assert.match(mainJs, /\/api\/v1\/auth\/sso\/exchange/);
  assert.match(mainJs, /\/api\/v1\/auth\/refresh/);
  assert.match(mainJs, /\/api\/v1\/auth\/logout/);
  assert.match(mainJs, /appId:\s*String\(override\.appId \|\| 'digital_garden'\)/);
});

test('homepage auth styles respect hidden state inside the account zone', () => {
  const css = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');
  assert.match(css, /\.nav-account-zone > \[hidden\] \{/);
  assert.match(css, /display: none !important;/);
});

test('homepage auth rendering swaps guest login button for a unified account shell', () => {
  assert.match(mainJs, /navAccountShell\?\.toggleAttribute\('hidden', !isAuthenticated\)/);
  assert.match(mainJs, /navAuthBtn\?\.toggleAttribute\('hidden', isAuthenticated\)/);
  assert.match(mainJs, /updateButtonText\(navAuthBtn, authState\.busy \? '处理中\.\.\.' : '登录'\)/);
  assert.match(mainJs, /navAccountBalance\.textContent = typeof authState\.balance === 'number' \? `积分 \$\{authState\.balance\}` : '积分 --'/);
  assert.doesNotMatch(mainJs, /footerAuthBtn/);
});

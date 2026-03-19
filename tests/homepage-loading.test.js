import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(
  new URL('../index.html', import.meta.url),
  'utf8'
);

test('homepage keeps classic script loading for broad compatibility', () => {
  assert.match(html, /<script\s+src="seed-config\.js(?:\?v=[^"]+)?"><\/script>/);
  assert.match(html, /<script\s+src="main\.js(?:\?v=[^"]+)?"><\/script>/);
  assert.doesNotMatch(html, /type="module"\s+src="main\.js(?:\?v=[^"]+)?"/);
});

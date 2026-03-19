import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const markdownSource = fs.readFileSync(
  new URL('../seeds/incubator/lib/markdown.js', import.meta.url),
  'utf8'
);

function loadMarkdownRenderer() {
  const context = {
    globalThis: {
      location: {
        origin: 'https://rrzxs.com'
      }
    }
  };

  vm.runInNewContext(markdownSource, context);
  return context.globalThis.DigitalGardenIncubatorMarkdown;
}

test('eden markdown renders headings, lists and fenced code blocks', () => {
  const renderer = loadMarkdownRenderer();
  const html = renderer.renderMarkdown([
    '## MVP 方向',
    '',
    '- 支持上传 Excel',
    '- 自动推荐图表',
    '',
    '```js',
    'console.log(\"ok\")',
    '```'
  ].join('\n'));

  assert.match(html, /<h2>MVP 方向<\/h2>/);
  assert.match(html, /<ul><li>支持上传 Excel<\/li><li>自动推荐图表<\/li><\/ul>/);
  assert.match(html, /<pre class="md-code-block"><code class="language-js">console\.log\(&quot;ok&quot;\)<\/code><\/pre>/);
});

test('eden markdown escapes raw html and only allows sanitized links', () => {
  const renderer = loadMarkdownRenderer();
  const html = renderer.renderMarkdown('请看 <script>alert(1)</script> [文档](javascript:alert(1))');

  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /href="#"/);
});

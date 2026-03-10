import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(
  new URL('../seeds/frequency-garden/index.html', import.meta.url),
  'utf8'
);

const mainJs = fs.readFileSync(
  new URL('../seeds/frequency-garden/main.js', import.meta.url),
  'utf8'
);

test('frequency garden page includes the core emotion tuning controls', () => {
  assert.match(html, /id="step-01"/);
  assert.match(html, /id="step-02"/);
  assert.match(html, /id="step-03"/);
  assert.match(html, /data-emotion="anxious"/);
  assert.match(html, /id="emotion-note"/);
  assert.match(html, /id="generate-guidance-btn"/);
  assert.match(html, /id="guidance-output"/);
  assert.match(html, /id="session-start-btn"/);
  assert.match(html, /id="scene-switcher"/);
  assert.match(html, /id="sound-switcher"/);
});

test('frequency garden boot script wires optional AI enhancement and ambient audio', () => {
  assert.match(mainJs, /__FREQUENCY_GARDEN_AI__/);
  assert.match(mainJs, /AudioContext/);
  assert.match(mainJs, /createSessionBlueprint/);
  assert.match(mainJs, /createFallbackGuidance/);
  assert.match(mainJs, /setStepState/);
  assert.match(mainJs, /step-02/);
  assert.match(mainJs, /step-03/);
});

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildGuidancePrompt,
  createFallbackGuidance,
  createSessionBlueprint,
  getSceneConfig
} from '../seeds/frequency-garden/lib/frequency-engine.js';

test('createSessionBlueprint maps anxious users to a stabilizing rhythm package', () => {
  const session = createSessionBlueprint({
    emotion: 'anxious',
    note: '我脑子停不下来，总担心事情会失控。',
    sceneId: 'moon',
    soundId: 'rain'
  });

  assert.equal(session.emotion.id, 'anxious');
  assert.equal(session.protocol.inhale, 4);
  assert.equal(session.protocol.exhale, 6);
  assert.equal(session.scene.id, 'moon');
  assert.equal(session.sound.id, 'rain');
  assert.match(session.protocol.label, /安抚/);
});

test('buildGuidancePrompt describes the user state and the gentle guide role', () => {
  const prompt = buildGuidancePrompt({
    emotion: 'overwhelmed',
    note: '事情太多，我不知道先处理哪一个。',
    sceneId: 'temple'
  });

  assert.match(prompt, /温柔的情绪引导者/);
  assert.match(prompt, /overwhelmed|混乱|过载/);
  assert.match(prompt, /事情太多/);
  assert.match(prompt, /神殿|temple/);
});

test('createFallbackGuidance returns a complete multi-paragraph soothing guidance text', () => {
  const guidance = createFallbackGuidance({
    emotion: 'tired',
    note: '我今天像被抽空一样，什么都不想继续。',
    sceneId: 'nature'
  });

  const paragraphs = guidance.split('\n\n');

  assert.ok(paragraphs.length >= 3);
  assert.match(guidance, /先不用急着变好|此刻不需要证明/);
  assert.match(guidance, /吸气/);
  assert.match(guidance, /呼气/);
  assert.match(guidance, /森林|晨雾|自然/);
});

test('getSceneConfig exposes the approved three healing atmospheres', () => {
  const moon = getSceneConfig('moon');
  const nature = getSceneConfig('nature');
  const temple = getSceneConfig('temple');

  assert.equal(moon.id, 'moon');
  assert.equal(nature.id, 'nature');
  assert.equal(temple.id, 'temple');
  assert.match(moon.name, /月/);
  assert.match(nature.name, /自然/);
  assert.match(temple.name, /神殿/);
});

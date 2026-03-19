import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCoverSvg,
  calculateDesignScore,
  normalizeCoverState
} from '../seeds/xhs-cover-studio/lib/cover-generator.js';
import { extractCoverContent, extractCoverVariants } from '../seeds/xhs-cover-studio/lib/content-extractor.js';
import { generateConceptVariants, generateDraft } from '../seeds/xhs-cover-studio/lib/idea-generator.js';

test('normalizeCoverState applies defaults and svg output includes escaped headline', () => {
  const state = normalizeCoverState({ headline: '增长 <翻倍>' });
  const svg = buildCoverSvg(state);

  assert.equal(state.templateId, 'editorial');
  assert.equal(state.themeId, 'paper-flame');
  assert.match(svg, /增长 &lt;翻倍&gt;/);
});

test('normalizeCoverState keeps explicitly cleared editable fields empty', () => {
  const state = normalizeCoverState({
    topic: '',
    headline: '',
    highlight: '',
    subhead: ''
  });

  assert.equal(state.topic, '');
  assert.equal(state.headline, '');
  assert.equal(state.highlight, '');
  assert.equal(state.subhead, '');
});

test('normalizeCoverState preserves custom text and sticker positions', () => {
  const state = normalizeCoverState({
    layout: {
      headline: { x: 180, y: 420 },
      highlight: { x: 220, y: 960 },
      subhead: { x: 240, y: 1100 }
    },
    sticker: {
      emoji: '🔥',
      x: 860,
      y: 310,
      size: 144,
      rotation: 18
    }
  });

  assert.equal(state.layout.headline.x, 180);
  assert.equal(state.layout.headline.y, 420);
  assert.equal(state.layout.highlight.x, 220);
  assert.equal(state.layout.highlight.y, 960);
  assert.equal(state.layout.subhead.x, 240);
  assert.equal(state.layout.subhead.y, 1100);
  assert.equal(state.sticker.emoji, '🔥');
  assert.equal(state.sticker.x, 860);
  assert.equal(state.sticker.y, 310);
  assert.equal(state.sticker.size, 144);
  assert.equal(state.sticker.rotation, 18);
});

test('normalizeCoverState preserves decoration visibility toggles', () => {
  const state = normalizeCoverState({
    decorations: {
      showAngleBadge: false,
      showAngleMark: false,
      showFooterBrand: false
    }
  });

  assert.equal(state.decorations.showAngleBadge, false);
  assert.equal(state.decorations.showAngleMark, false);
  assert.equal(state.decorations.showFooterBrand, false);
});

test('calculateDesignScore rewards clear hierarchy and highlight text', () => {
  const score = calculateDesignScore(normalizeCoverState({
    headline: '7天做出更稳的小红书封面',
    highlight: '更稳',
    subhead: '排版、配色、情绪点一次到位',
    badge: '实战版'
  }));

  assert.ok(score.hook >= 70);
  assert.ok(score.hierarchy >= 70);
  assert.ok(score.clarity >= 60);
});

test('buildCoverSvg stays canvas-safe for png export', () => {
  const svg = buildCoverSvg(normalizeCoverState({
    headline: '导出时不要污染 canvas',
    subhead: '所有正文都应使用原生 SVG text，而不是 foreignObject。'
  }));

  assert.doesNotMatch(svg, /foreignObject/i);
});

test('buildCoverSvg renders optional emoji sticker when selected', () => {
  const svg = buildCoverSvg(normalizeCoverState({
    sticker: {
      emoji: '✨',
      x: 812,
      y: 256,
      size: 132,
      rotation: -12
    }
  }));

  assert.match(svg, /✨/);
  assert.match(svg, /rotate\(-12 812 256\)/);
  assert.match(svg, /font-size="132"/);
});

test('buildCoverSvg can hide angle meta and footer brand', () => {
  const svg = buildCoverSvg(normalizeCoverState({
    decorations: {
      showAngleBadge: false,
      showAngleMark: false,
      showFooterBrand: false
    }
  }));

  assert.doesNotMatch(svg, /观点型/);
  assert.doesNotMatch(svg, /POINT OF VIEW/);
  assert.doesNotMatch(svg, /XHS COVER STUDIO/);
});

test('buildCoverSvg keeps footer brand inside the safe right edge', () => {
  const svg = buildCoverSvg(normalizeCoverState());
  assert.match(svg, /<text x="972" y="1326"[^>]*text-anchor="end"[^>]*>XHS COVER STUDIO<\/text>/);
});

test('extractCoverContent derives topic and cover copy from article content', () => {
  const result = extractCoverContent(`
    我把团队的 AI 工作流重新做了一遍，最后稳定下来的只有 3 个动作：
    第一，先把重复出现的问题沉淀成固定模板。
    第二，让 AI 只处理它最擅长的拆解、归纳和改写。
    第三，用看板把每一步的输入输出串起来，这样新人也能直接接手。
    真正有用的不是“用了 AI”，而是流程终于变得稳定、可复制、能交接。
  `);

  assert.match(result.topic, /AI工作流|工作流/);
  assert.ok(['authority', 'tutorial', 'list', 'emotion'].includes(result.focusMode));
  assert.match(result.headline, /3个动作|3步|3点/);
  assert.ok(result.headline.length >= 6);
  assert.ok(result.highlight.length >= 2);
  assert.ok(result.subhead.length >= 12);
});

test('extractCoverContent falls back gracefully for short input', () => {
  const result = extractCoverContent('副业');

  assert.equal(result.topic, '副业');
  assert.ok(result.headline.length > 0);
  assert.ok(result.highlight.length > 0);
  assert.ok(result.subhead.length > 0);
});

test('extractCoverVariants returns three distinct candidate sets for one article', () => {
  const variants = extractCoverVariants(`
    我把团队的 AI 工作流重新做了一遍，最后稳定下来的只有 3 个动作：
    第一，先把重复出现的问题沉淀成固定模板。
    第二，让 AI 只处理它最擅长的拆解、归纳和改写。
    第三，用看板把每一步的输入输出串起来，这样新人也能直接接手。
  `);

  assert.equal(variants.length, 3);
  assert.ok(variants.every((item) => item.topic === 'AI工作流'));
  assert.ok(new Set(variants.map((item) => item.focusMode)).size >= 2);
  assert.ok(new Set(variants.map((item) => item.headline)).size >= 2);
});

test('generateDraft creates one ready-to-edit copy set for the selected angle', () => {
  const draft = generateDraft('咖啡店运营', 'tutorial');

  assert.equal(draft.focusMode, 'tutorial');
  assert.match(draft.headline, /咖啡店运营/);
  assert.ok(draft.subhead.length > 0);
});

test('generateConceptVariants returns three distinct variants for a topic', () => {
  const variants = generateConceptVariants('AI 工作流');

  assert.equal(variants.length, 3);
  assert.notEqual(variants[0].headline, variants[1].headline);
  assert.ok(variants.every((item) => item.highlight && item.badge));
});

# XHS Cover Studio Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a premium Xiaohongshu cover generator seed project that clearly surpasses `xhs.haha.ai` in aesthetics, control depth, and creator workflow.

**Architecture:** Keep the existing digital garden home page intact and add a new standalone seed at `seeds/xhs-cover-studio/`. Extract cover composition, copy suggestion, scoring, and SVG export into pure ESM utilities so they can be verified with Node's built-in test runner before wiring the browser UI.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript (ES modules), Node `node:test`, browser SVG + Canvas export.

### Task 1: Scaffold the seed project and test harness

**Files:**
- Create: `package.json`
- Create: `seeds/xhs-cover-studio/index.html`
- Create: `seeds/xhs-cover-studio/style.css`
- Create: `seeds/xhs-cover-studio/main.js`
- Create: `seeds/xhs-cover-studio/lib/cover-generator.js`
- Create: `seeds/xhs-cover-studio/lib/idea-generator.js`
- Create: `tests/cover-generator.test.js`
- Modify: `main.js`

**Step 1: Write the failing test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCoverState, buildCoverSvg } from '../seeds/xhs-cover-studio/lib/cover-generator.js';

test('normalizeCoverState applies defaults and svg output includes escaped headline', () => {
  const state = normalizeCoverState({ headline: '增长 <翻倍>' });
  const svg = buildCoverSvg(state);

  assert.equal(state.templateId, 'editorial');
  assert.match(svg, /增长 &lt;翻倍&gt;/);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because the generator module does not exist yet.

**Step 3: Write minimal implementation**

Create the generator module with config-backed defaults, text normalization, and SVG generation that escapes content.

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS for the generator test.

### Task 2: Add product-grade cover logic and idea generation

**Files:**
- Modify: `seeds/xhs-cover-studio/lib/cover-generator.js`
- Modify: `seeds/xhs-cover-studio/lib/idea-generator.js`
- Modify: `tests/cover-generator.test.js`

**Step 1: Write failing tests**

```js
test('calculateDesignScore rewards clear hierarchy and highlight text', () => {
  const score = calculateDesignScore(normalizeCoverState({
    headline: '7天做出更稳的小红书封面',
    highlight: '更稳',
    subhead: '排版、配色、情绪点一次到位',
    badge: '实战版'
  }));

  assert.ok(score.hook >= 70);
  assert.ok(score.hierarchy >= 70);
});
```

```js
test('generateConceptVariants returns three distinct variants for a topic', () => {
  const variants = generateConceptVariants('AI 工作流');
  assert.equal(variants.length, 3);
  assert.notEqual(variants[0].headline, variants[1].headline);
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL because scoring and idea generation are incomplete.

**Step 3: Write minimal implementation**

Add heuristic scoring, template-aware line splitting, theme mapping, and deterministic topic-driven concept generation.

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS for all unit tests.

### Task 3: Build the studio UI and export workflow

**Files:**
- Modify: `seeds/xhs-cover-studio/index.html`
- Modify: `seeds/xhs-cover-studio/style.css`
- Modify: `seeds/xhs-cover-studio/main.js`

**Step 1: Write the failing test**

Use the existing unit tests as the guardrail and add any missing pure-function tests before new logic is added.

**Step 2: Run tests to verify the baseline is green**

Run: `npm test`
Expected: PASS before wiring DOM code.

**Step 3: Write minimal implementation**

Build a three-column studio:
- Strategy input and concept generation
- Premium live preview with draggable sticker/badge anchors
- Insight panel with score bars, preset themes, template switches, and export actions

Use the pure SVG generator as the preview source of truth, then rasterize it to PNG on demand.

**Step 4: Run visual verification**

Run: `python3 -m http.server 4173`
Open: `http://127.0.0.1:4173/seeds/xhs-cover-studio/`
Expected: responsive layout, stable drag interactions, correct template/theme switching, successful SVG/PNG export.

### Task 4: Connect the new seed to the digital garden home page

**Files:**
- Modify: `main.js`

**Step 1: Write the failing test**

No new automated test is required here because the home page uses static seed data. Keep unit tests green to avoid regression in the shared repo.

**Step 2: Implement**

Add a new seed card describing the product as a premium creator tool.

**Step 3: Verify**

Run: `python3 -m http.server 4173`
Open: `http://127.0.0.1:4173/`
Expected: the new seed card is visible and links correctly.

### Task 5: Final verification

**Files:**
- No additional file changes required

**Step 1: Run automated verification**

Run: `npm test`
Expected: PASS

**Step 2: Run browser verification**

Run: `python3 -m http.server 4173`
Check:
- `http://127.0.0.1:4173/seeds/xhs-cover-studio/`
- `http://127.0.0.1:4173/`

Expected:
- no console errors
- export actions succeed
- mobile layout remains usable
- visual hierarchy remains strong across templates

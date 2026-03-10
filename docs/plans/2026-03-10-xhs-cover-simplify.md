# XHS Cover Studio Simplification Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the topic-input reset bug and redesign the cover generator into a simpler, clearer, more tasteful single-purpose tool.

**Architecture:** Keep the pure cover-generation engine, but simplify its state model and the browser UI around one main workflow: enter topic, pick one angle, edit title, choose one visual style, download. Remove the extra “workbench” layers that add friction without increasing value.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript (ES modules), Node `node:test`, SVG to PNG export in browser.

### Task 1: Lock down empty-input behavior with tests

**Files:**
- Modify: `tests/cover-generator.test.js`

**Step 1: Write the failing test**

Add tests that verify:
- `normalizeCoverState({ topic: '' }).topic === ''`
- `normalizeCoverState({ headline: '' }).headline === ''`

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because empty strings currently fall back to defaults.

**Step 3: Write minimal implementation**

Update state normalization helpers so omitted fields get defaults, but explicitly cleared fields stay empty.

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

### Task 2: Reduce the feature surface

**Files:**
- Modify: `seeds/xhs-cover-studio/lib/cover-generator.js`
- Modify: `seeds/xhs-cover-studio/lib/idea-generator.js`

**Step 1: Simplify the state model**

Keep only:
- topic
- angle
- headline
- subhead
- highlight
- themeId
- templateId

**Step 2: Remove low-value controls**

Delete support for:
- score bars
- tips
- sticker drag
- badge drag
- density slider
- grid toggle
- emoji picker
- note field

**Step 3: Keep export path stable**

SVG remains the source of truth; PNG still rasterizes the generated SVG.

### Task 3: Rebuild the UI around one clean path

**Files:**
- Modify: `seeds/xhs-cover-studio/index.html`
- Modify: `seeds/xhs-cover-studio/style.css`
- Modify: `seeds/xhs-cover-studio/main.js`

**Step 1: Replace the current 3-column workbench**

Build a simpler two-part layout:
- Left: concise control panel
- Right: large preview and download actions

**Step 2: Keep only the clearest user actions**

Primary actions:
- 输入主题
- 选择内容角度
- 一键生成默认文案
- 微调标题/副标题
- 选择视觉风格
- 下载

**Step 3: Re-run tests and browser verification**

Run: `npm test`
Then verify in browser that:
- topic can be fully cleared without bouncing back
- the interface feels materially simpler
- SVG and PNG download still work

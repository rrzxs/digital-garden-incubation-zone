# XHS Cover Interactions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 给小红书封面生成器补上预览区直接拖动文字位置，以及可选表情贴纸的选择、拖拽与导出。

**Architecture:** 继续使用单页静态应用结构，把位置状态收敛到 `cover-generator.js` 的统一封面状态里，由 SVG 渲染和浏览器预览共享。预览区不新增复杂面板，只增加轻量贴纸选择区与拖拽命中层，所有拖拽结果都直接写回状态并参与 SVG/PNG 导出。

**Tech Stack:** 原生 HTML/CSS/JavaScript、Node `node:test`、SVG 渲染、Playwright 浏览器验证

### Task 1: 为位置状态和贴纸输出建立测试

**Files:**
- Modify: `tests/cover-generator.test.js`
- Modify: `seeds/xhs-cover-studio/lib/cover-generator.js`

**Step 1: Write the failing test**

新增两个测试：
- `normalizeCoverState preserves custom text and sticker positions`
- `buildCoverSvg renders optional emoji sticker when selected`

测试断言：
- 自定义 `layout.headline.x/y`、`layout.highlight.x/y`、`layout.subhead.x/y` 被保留
- 自定义 `sticker.emoji/x/y/size/rotation` 被保留
- SVG 中包含 выбран emoji 和对应 transform

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL，提示 `layout` 或 `sticker` 未定义或值未保留

**Step 3: Write minimal implementation**

在 `cover-generator.js` 中：
- 增加默认布局坐标和默认贴纸状态
- `normalizeCoverState()` 接受并校正 `layout` / `sticker`
- `buildCoverSvg()` 根据状态输出 headline / highlight / subhead / sticker 的位置与旋转

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

### Task 2: 给预览区补拖拽文字与贴纸交互

**Files:**
- Modify: `seeds/xhs-cover-studio/index.html`
- Modify: `seeds/xhs-cover-studio/main.js`
- Modify: `seeds/xhs-cover-studio/style.css`

**Step 1: Write the failing test**

当前仓库没有浏览器级自动化测试覆盖拖拽，因此先用状态与渲染测试兜底，再通过手动 Playwright 验证交互。

**Step 2: Implement minimal interaction**

在 `index.html` 中：
- 给预览区增加拖拽提示
- 增加可选表情贴纸选择区与“无贴纸”选项

在 `main.js` 中：
- 建立 `data-drag-target` 的 SVG 命中层
- 监听 pointer 事件，把拖动结果写回 `state.layout` / `state.sticker`
- 选中贴纸时切换 emoji，未选中时隐藏贴纸
- 风格切换时重置为对应默认布局，避免错位

在 `style.css` 中：
- 为贴纸选择器、拖拽提示、预览 hover/active 态补样式
- 保持整体极简感，不增加控制面板负担

**Step 3: Verify in browser**

Run:
- `python3 -m http.server 4173`
- 用 Playwright 打开 `http://127.0.0.1:4173/seeds/xhs-cover-studio/`

验证：
- 主标题、高亮词、补充说明可在预览区拖动
- 贴纸可选中、拖动、取消
- PNG 导出仍然成功
- 控制台无报错

### Task 3: 回归验证

**Files:**
- Modify: `tests/cover-generator.test.js`

**Step 1: Run full tests**

Run: `npm test`
Expected: PASS

**Step 2: Manual regression**

确认：
- “内容主题”删空后不回弹默认值
- 风格切换后预览仍正常
- 移动端布局可用

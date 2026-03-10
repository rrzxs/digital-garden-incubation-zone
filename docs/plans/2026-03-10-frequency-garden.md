# Frequency Garden Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在数字花园中新增一个可直接打开使用的单页情绪调频工具，支持情绪选择、补充一句感受、AI 风格引导词、呼吸节奏、场景切换与环境音控制。

**Architecture:** 继续采用静态 seed 结构，在 `seeds/frequency-garden/` 下实现独立页面。把情绪映射、场景配置、提示词组装和本地回退引导词收敛到可测试的纯函数模块，页面脚本只负责状态管理、视图渲染、动画驱动与音频播放。数字花园首页通过 `seed-config.js` 注册该 seed。

**Tech Stack:** 原生 HTML/CSS/JavaScript、Node `node:test`、Web Audio API、可选大模型适配钩子

### Task 1: 为调频引擎建立失败测试

**Files:**
- Create: `tests/frequency-garden.test.js`
- Create: `seeds/frequency-garden/lib/frequency-engine.js`

**Step 1: Write the failing test**

新增测试覆盖：
- 情绪映射会返回稳定的呼吸协议、推荐场景与环境音
- AI 提示词会包含用户情绪、补充文本和“温柔引导者”语气要求
- 在没有外部大模型时，本地引导词生成仍然会产出完整且有安抚语气的多段文本

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL，提示缺少 `frequency-engine.js` 导出或行为与断言不符

**Step 3: Write minimal implementation**

在 `frequency-engine.js` 中实现：
- 情绪配置表
- `createSessionBlueprint()`
- `buildGuidancePrompt()`
- `createFallbackGuidance()`
- `getSceneConfig()`

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

### Task 2: 注册新的数字花园 seed

**Files:**
- Modify: `seed-config.js`
- Modify: `tests/seed-config.test.js`

**Step 1: Write the failing test**

新增断言：
- `Frequency Garden` seed 存在
- path 指向 `./seeds/frequency-garden/index.html`
- 发布 seed 数量从 `7` 增加到 `8`

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL，提示 seed 未注册或计数未更新

**Step 3: Write minimal implementation**

在 `seed-config.js` 中增加该 seed 的标题、描述、分类、标签与状态。

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

### Task 3: 实现单页调频体验

**Files:**
- Create: `seeds/frequency-garden/index.html`
- Create: `seeds/frequency-garden/style.css`
- Create: `seeds/frequency-garden/main.js`

**Step 1: Implement the page**

在页面中实现：
- 情绪卡片 + 一句补充输入
- AI 引导词预览区
- 呼吸节奏展示与开始按钮
- 月光 / 自然 / 神殿场景切换
- 雨声 / 森林风声 / 颂钵低频环境音切换
- 沉浸式呼吸动画与结束态文案

**Step 2: Wire deterministic engine into the page**

在 `main.js` 中：
- 从纯函数模块生成 session blueprint
- 优先调用可选的外部 AI 适配器，失败时回退到本地引导词
- 用 Web Audio API 生成轻量环境音
- 同步场景样式变量与呼吸阶段文本

**Step 3: Manual browser verification**

Run:
- `python3 -m http.server 4173`
- 打开 `http://127.0.0.1:4173/seeds/frequency-garden/`

验证：
- 选择情绪并输入文本后可以生成引导词
- 场景切换时视觉与文案标签同步变化
- 环境音可开启、切换、关闭
- 呼吸节奏会推动视觉动画和步骤提示
- 移动端布局不破碎

### Task 4: 全量回归验证

**Files:**
- Modify: `tests/frequency-garden.test.js`
- Modify: `tests/seed-config.test.js`

**Step 1: Run full tests**

Run: `npm test`
Expected: PASS

**Step 2: Browser sanity check**

确认：
- 控制台无报错
- 首页可以进入新的 seed
- seed 页面无登录依赖，直接可用

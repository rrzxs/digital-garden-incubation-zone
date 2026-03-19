# XHS Content Extraction Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 给小红书封面生成器增加“粘贴正文后自动提炼封面字段并回填”的能力。

**Architecture:** 在前端本地增加一个轻量提炼引擎，输入正文后抽取主题、推荐角度、标题、高亮词和补充说明，再通过现有状态管理回填表单与预览。先不接外部模型 API，保持单页工具可离线运行，后续如需接真实 LLM 可在同一接口上替换。

**Tech Stack:** 原生 HTML/CSS/JavaScript、Node `node:test`

### Task 1: 为正文提炼引擎建立测试

**Files:**
- Create: `seeds/xhs-cover-studio/lib/content-extractor.js`
- Modify: `tests/cover-generator.test.js`

**Step 1: Write the failing test**

新增两个测试：
- `extractCoverContent derives topic and cover copy from article content`
- `extractCoverContent falls back gracefully for short input`

断言：
- 长正文能提炼出非空 `topic/headline/highlight/subhead`
- 推荐 `focusMode` 落在现有 4 类里
- 短输入时也能产出稳定兜底值

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL，提示提炼函数不存在

**Step 3: Write minimal implementation**

在 `content-extractor.js` 中：
- 归一化正文
- 提取高频短语、数字钩子和主题词
- 以启发式规则推断 `focusMode`
- 生成适合封面的 `topic/headline/highlight/subhead`

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

### Task 2: 给界面补正文输入和自动回填入口

**Files:**
- Modify: `seeds/xhs-cover-studio/index.html`
- Modify: `seeds/xhs-cover-studio/main.js`
- Modify: `seeds/xhs-cover-studio/style.css`

**Step 1: Add UI**

在编辑面板顶部加入：
- 一个“内容正文 / 文章内容”多行输入框
- 一个“AI 提炼并填充”按钮
- 一行克制的提示文案

**Step 2: Wire interaction**

在 `main.js` 中：
- 读取正文输入
- 点击按钮时调用 `extractCoverContent()`
- 把结果写入 `topic/focusMode/headline/highlight/subhead`
- 保持风格、拖拽位置、贴纸和辅助元素开关不被重置

**Step 3: Verify**

Run: `npm test`
Expected: PASS

### Task 3: 浏览器验证

**Files:**
- Modify: none

**Step 1: Manual verification**

启动本地服务后验证：
- 粘贴一段小红书正文可以自动回填封面字段
- 预览同步更新
- 导出仍然正常

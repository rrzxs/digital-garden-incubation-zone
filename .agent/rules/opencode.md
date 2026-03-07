---
description: 项目级架构与代码规范 (OpenCode 适用)
tags: [architecture, design-system, mvp, opencode]
---

# 人人智学社 - 数字花园种子区 (Digital Garden) 核心准则

作为 OpenCode (或其他 AI Agent) 在本项目的全局执行准则。在处理本项目的需求时，请**始终**优先遵循以下规则：

## 1. 核心架构与目录规范 (Multi-Project Directory)
- **相互独立**：本项目是一个“种子箱 (Seed Zone)”。`seeds/` 目录下的每个子项目（如 `aura/`, `cyber-paint/`, `openclaw/`）都必须是**完全独立**的。
- **避免全局跨域污染**：除非明确要求，不要在根目录的 `index.html` 或全局 `style.css` 中为某一个特定子种子添加特定的业务逻辑。
- **免构建优先 (Zero-Build First)**：作为初期孵化器的 Demo，优先使用 Vanilla JS + CSS3 + HTML5 构建。若需框架（如 React/Zustand），在 MVP 阶段优先使用 CDN 引入或 ES Modules ( `<script type="module">` )，避免引入臃肿的 `package.json` 和构建流，以保持种子的轻量级“即插即用”特性。

## 2. 顶级硅谷工程师审美准则 (Extremely High Aesthetics)
本项目对前端视觉和微交互有极高的要求！这是**最重要的差异化标准**：
- **字体与排版 (Typography)**：坚决抵制浏览器默认字体。使用具有现代感和呼吸感的无衬线英文字体（如 `Inter`, `Outfit`, `Share Tech Mono`），搭配优雅的行高 (1.5 ~ 1.7) 和充足的留白 (White-space)。
- **高级材质**：
  - **流体网格渐变 (Mesh Gradient)**：多用 `@keyframes` 结合超大模糊 (`filter: blur(x)`) 及混合模式 (`mix-blend-mode: screen`) 构建有呼吸感的动态流体背景。
  - **微晶玻璃态 (Glassmorphism)**：容器尽可能采用透明度搭配 `backdrop-filter: blur(Xpx)`，同时辅以微小的发光描边 (`border: 1px solid rgba(255,255,255,0.1)`)。
- **非线性微交互**：所有的 `:hover`, `:active` 状态变化必须具有顺滑的物理曲线（如 `transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1)`），抵制生硬的属性突变。

## 3. 代码生成与补丁规范 (Patching Rules)
- **100% 完整交付**：当修改 HTML、JS 或 CSS 函数/样式块时，**绝对禁止**使用 `// ... rest of code` 或任何占位符。生成的代码必须是可直接覆盖保存、无需人类自行组装的完整闭环。
- **内聚与模块化封装**：即使使用 Vanilla JS，也应当按照领域模型 (Domain Model) 或 UI 组件 (UI Components) 对函数进行合理的封闭拆分。如果是复杂逻辑，在单文件中也应该用大量注释块（如 `// === DOM Elements ===`）对结构进行分段。

## 4. 行动哲学 (Action Philosophy)
- 如果需求只需要实现局部，不要修改已经完美运行的其他种子项目。
- 在构建具有“氛围感”的项目（如冥想器 Aura 或黑客面板 Cyber Paint）时，要主动思考并提供适配氛围的文案和动画缓动系数（比如：黑客工具要用等宽字体、文字敲击感闪烁；冥想工具要用极其缓慢的周期律动和深海级色调）。
- **遇到破坏性更改时请先提问**，而不是盲目覆盖。

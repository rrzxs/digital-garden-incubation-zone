# CSS Token Distiller · 设计令牌蒸馏器

> 数字花园种子 · maintainer: EDEN

粘贴任意 CSS，蒸馏出一套可复用的设计令牌（Design Tokens）系统。

## ✦ 功能

- **令牌蒸馏**：从原始 CSS 中提取并聚类 8 类令牌 —— 色彩（邻近色合并 + 色相语义命名）、字体、间距、圆角、阴影、时长、缓动曲线
- **三格式出料**：一键导出 CSS Variables / JSON Tokens / Tailwind Config
- **点击即复制**：点击任意令牌行复制 `name: value;`
- **快捷键**：`Ctrl/Cmd + Enter` 触发蒸馏

## ✦ 交互与视觉

- 流体网格渐变背景（超大模糊 + `mix-blend-mode: screen`）
- 微晶玻璃态容器（`backdrop-filter: blur` + 发光描边）
- 非线性动效：`cubic-bezier(0.16, 1, 0.3, 1)` 贯穿所有状态迁移
- 蒸馏粒子迸射、令牌级联入场、乱码揭示、磁力按钮、涟漪反馈
- 背景粒子流场随氛围配色呼吸
- 4 种氛围配色：Aurora / Ember / Mint / Violet

## ✦ 技术

免构建 · Vanilla JS + CSS3 + HTML5 · 零依赖 · 字体：Inter / Outfit / Share Tech Mono

```
index.html   结构
style.css    样式（背景 / 玻璃态 / 动效）
main.js      解析引擎 + 交互逻辑
```

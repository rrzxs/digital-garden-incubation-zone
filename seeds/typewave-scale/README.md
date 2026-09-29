# Typewave Scale · 打字波浪缩放

沉浸式打字微交互体验。每个字符都是一个弹簧振子（Spring-Damper）：输入、退格、点击海面、切换主题，都会在字符之海中激起向两侧传播的缩放波浪。

## 玩法

- **输入** — 新字符落水，波浪向邻域传播
- **点击海面** — 以最近的字符为震中触发冲击波
- **悬停** — 光标附近的字符被"排斥"浮起并发光
- **3 种波浪模式**
  - `Pulse 脉冲`：高斯衰减 + 余弦振荡，经典涟漪
  - `Waterfall 瀑布`：波能只向已输入的字符倾泻
  - `Orbit 回响`：正弦驻波式往复共振
- **参数**：波幅 / 波长实时可调
- **4 种氛围配色**：极光 / 深渊 / 余烬 / 薄荷

## 技术

- Vanilla JS + CSS3 + HTML5，零依赖、免构建
- 流体渐变背景（`filter: blur` + `mix-blend-mode: screen`）
- 微晶玻璃态容器（`backdrop-filter`）
- 统一缓动曲线 `cubic-bezier(0.16, 1, 0.3, 1)`
- 字体：Inter / Outfit / Share Tech Mono

## 文件

| 文件 | 说明 |
| --- | --- |
| `index.html` | 结构入口 |
| `style.css` | 主题变量、流体背景、玻璃容器、动效 |
| `main.js` | 字符弹簧物理、波浪传播、交互逻辑 |

Maintainer: EDEN

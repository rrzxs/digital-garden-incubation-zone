# Liquid Dial — 液态刻度

沉浸式液态刻度盘交互体验。拖拽表盘设置数值，观察流体粒子和光效实时响应。

## 功能

- **拖拽交互** — 在刻度盘上拖拽指针，流畅设置 0–100% 数值
- **4 种刻度模式** — Intensity / Frequency / Temperature / Velocity
- **4 种氛围配色** — Default / Aurora / Ember / Frost，点击右上角色点切换
- **流体粒子流场** — 粒子围绕表盘流动，速度和分布随数值变化
- **脉冲波纹** — 点击 Pulse 按钮或双击表盘释放冲击波涟漪
- **非线性动效** — 所有过渡使用 `cubic-bezier(0.16, 1, 0.3, 1)` 物理曲线

## 技术栈

- Vanilla JS + Canvas 2D + CSS3
- 零构建，零依赖
- 字体: Inter, Outfit, Share Tech Mono

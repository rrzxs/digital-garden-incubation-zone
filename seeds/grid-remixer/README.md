# Grid Remixer · 网格混音台

沉浸式网格混音重组微交互体验场。弹簧-阻尼物理驱动的晶格瓦片阵列，可随时「REMIX」重组色彩、字形与布局。

## 交互

- **移动光标** — 斥力 / 引力 / 涡旋三种力场实时扰动晶格，瓦片以弹簧物理回弹归位
- **点击瓦片或空白** — 冲击波涟漪以距离衰减冲量推向邻近瓦片
- **REMIX (R)** — FLIP 重排 + 距震中扩散的交错延迟 + 字形乱码揭示
- **1 / 2 / 3** — 切换布局：晶格 (14 列) / 马赛克 (dense 跨格) / 巨石 (5 列)
- **Space** — 舞台中心全脉冲
- **INTENSITY 滑杆** — 力场半径与强度
- **MOOD 色卡** — Aurora / Ember / Abyss / Bloom 四种氛围配色

## 技术

- Vanilla JS + CSS3 + HTML5，免构建、零依赖
- 双层瓦片结构：外层负责 FLIP 布局动画，内层承载物理偏移（transform 解耦）
- 伪噪声正弦流场驱动的背景粒子（Canvas, `mix-blend-mode: screen`）
- 全程 `cubic-bezier(0.16, 1, 0.3, 1)` 非线性缓动
- 字体：Inter / Outfit / Share Tech Mono

Maintainer: EDEN

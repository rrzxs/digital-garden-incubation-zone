# Motion Feel Cards · 触感卡片

沉浸式触感卡片微交互体验场。六种「触感」居住在微晶玻璃卡片里，每种卡片都是一个弹簧-阻尼物理驱动的专属交互演示：

| # | 触感 | 交互 |
|---|------|------|
| 01 | 果冻 Jelly | 按压舞台，果冻体以非线性弹簧回弹 |
| 02 | 磁力 Magnet | 光标即磁场，牵引发光小球贴附游走 |
| 03 | 丝绸 Silk | 拨动五弦丝线，振幅沿光标位置包络传播 |
| 04 | 弹簧 Spring | 拖拽 puck 拉伸橡皮筋，释放后欠阻尼振荡 |
| 05 | 液态 Liquid | 光标搅动斥力液滴，border-radius 永不定形 |
| 06 | 颗粒 Grain | 扬起 130 粒砂砾，重力堆积 + 光标推力 |

## 全局交互
- **点击空白处** → 冲击波涟漪 + 邻近卡片被径向推挤后弹回
- **悬停卡片** → 3D 倾斜 + 光泽追踪 + 邻近力场
- **控制台** → 4 种氛围配色（Aurora / Ember / Abyss / Mono）、倾斜角度与弹簧刚度实时调节、全场脉冲与洗牌重组
- **HUD 遥测** → 光标速度 / FPS / 冲击波计数

## 技术
- 纯 Vanilla JS + CSS3 + HTML5，零构建
- 统一弹簧步进 `springStep()` 驱动所有物理
- 流体渐变背景（`blur` + `mix-blend-mode: screen`）+ Canvas 流场粒子
- 动效曲线：`cubic-bezier(0.16, 1, 0.3, 1)`
- 字体：Inter / Outfit / Share Tech Mono

Maintainer: EDEN

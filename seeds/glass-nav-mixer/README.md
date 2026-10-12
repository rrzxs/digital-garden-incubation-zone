# Glass Nav Mixer · 微晶导航混音台

沉浸式玻璃导航混音台。导航被重新想象为一张 DJ 混音控制台：五条频道（ORIGIN / CRAFT / SIGNAL / CHAOS / VOID）各配一支弹簧-阻尼物理推子，推起的电平实时混合流体渐变背景、粒子能量与主导内容频道——导航即混音。

## 交互

- **拖拽推子**：弹簧物理驱动电平，背景色团、粒子密度与速度随混合实时流变
- **点击频道名 / 数字键 1–5**：独奏该频道，其余推子弹性归零
- **PULSE / 空格 / 点击空白**：发射冲击波涟漪，粒子被环形波阵面推开
- **SHUFFLE**：错峰随机化全部推子
- **SND**：Web Audio 极简合成器反馈音（默认关闭）
- **氛围配色**：Aurora / Abyss / Ember / Mono 四种主题

## 技术

- 免构建：Vanilla JS + CSS3 + HTML5，无任何依赖
- 字体：Outfit（展示）/ Inter（正文）/ Share Tech Mono（HUD）
- 流体背景：低分辨率 Canvas 拉伸获得自然柔焦 + SVG 噪点颗粒
- 全局动效曲线：`cubic-bezier(0.16, 1, 0.3, 1)`
- 支持 `prefers-reduced-motion`

Maintainer: EDEN

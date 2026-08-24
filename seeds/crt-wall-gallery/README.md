# CRT Wall Gallery — 显像管画廊

沉浸式 CRT 显像管墙画廊。八台老式显示器组成一面临永不停播的信号墙，每个屏幕播放一个独立的生成艺术频道。流体渐变背景 + 微晶玻璃态容器 + 非线性动效。

## 功能

- **8 个信号频道**：Plasma 等离子 / Starfield 星野 / Tunnel 隧道 / Lissajous 利萨如 / Moire 干涉纹 / Spiral 螺旋星系 / SynthGrid 透视网格 / Radar 雷达扫描
- **CRT 质感**：扫描线（强度可调）、暗角、屏幕反光、闪烁、开机白闪与经典电子束坍缩关屏动画
- **高阶微交互**：
  - 悬停 3D 倾斜跟随（perspective + rotateX/Y）
  - 点击任意显示器进入聚焦剧场，←→ 切换频道，ESC 关闭
  - 换台时 0.28s 雪花噪点重调谐
  - SHUFFLE 错峰随机换台、POWER 逐台级联开关机
- **4 种氛围配色**：Phosphor（磷光绿）/ Amber（琥珀）/ Ice（冰青）/ Rose（玫红）
- **环境层**：流体网格渐变背景 + 噪点覆盖 + 粒子流场

## 技术

- Vanilla JS + CSS3 + HTML5，零构建
- 字体：Inter, Outfit, Share Tech Mono
- 动效曲线：cubic-bezier(0.16, 1, 0.3, 1)
- 渲染：单 rAF 循环 @30 FPS，低分辨率离屏缓冲 + pixelated 放大（复古像素感 & 性能友好）

## 使用

直接打开 `index.html`。鼠标悬停倾斜、点击聚焦、CH ⤨ 换台、控制台切换主题与扫描线强度。

Maintainer: EDEN

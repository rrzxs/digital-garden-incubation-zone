# Scroll Choreography · 滚动编舞

沉浸式滚动编舞体验场。滚动化身指挥棒，驱动七幕微交互演出：

1. **序曲 Overture** — 视差深度层 + 漂浮音符/光环背景
2. **视差 Parallax** — 三层卡片以不同速率滑过 + 鼠标驱动倾斜
3. **揭示 Reveal** — 大字标题逐字从模糊中浮现 + 段落行级错峰揭示
4. **倾斜 Tilt** — 3D 透视卡片追随光标低头，赋予实体引力
5. **脉动 Pulse** — 16 格网格随滚动速度波纹起伏
6. **时间轴 Timeline** — 整场演出映射为线性时间轴，光标即播放头
7. **终章 Finale** — 收束与回归

## 交互

- **滚动**：节拍越快，指挥棒摆动越剧烈，脉动网格越活跃
- **鼠标移动**：卡片 3D 倾斜 + 视差层位移 + 光晕追踪 + 粒子吸引
- **键盘 ↑↓**：在章节间跳跃
- **右上角 TEMPO HUD**：实时显示滚动速度 (0.00 ~ 1.00)
- **左侧进度轨**：点击圆点跳转章节
- **右下角配色**：4 种氛围配色 (Aurora / Ember / Ocean / Void)

## 技术栈

- Vanilla JS + CSS3 + HTML5（免构建）
- Canvas 2D 粒子流场 + 连接线
- IntersectionObserver 驱动的逐字/逐行揭示
- CSS 变量主题系统
- `cubic-bezier(0.16, 1, 0.3, 1)` 非线性动效曲线
- Inter / Outfit / Share Tech Mono 字体

## 创作者

maintainer: EDEN

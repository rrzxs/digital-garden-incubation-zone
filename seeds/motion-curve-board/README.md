# Motion Curve Board 动效曲线板

沉浸式缓动曲线实验室。以「曲线即触感」为核心——拖拽 cubic-bezier 控制点实时塑形缓动曲线，四条实时赛道（位移 / 缩放 / 旋转 / 景深模糊）同步演示曲线质感，overshoot / anticipate 自动分析，8 组预设曲线画廊，一键复制 CSS Token 或将当前曲线注入全站动效。

## 玩法

- **拖拽曲线编辑器**中的两个发光控制点，实时塑形；双击画布回到 `cubic-bezier(0.16, 1, 0.3, 1)`
- **Live Track** 四条赛道以 rAF 驱动，实时呈现当前曲线作用于不同属性的质感
- **曲线画廊**点击装载 8 组预设（Silk Ease / Snap Out / Anticipate / Whip …）
- **CSS Export** 复制 `--motion-curve` token，或一键注入本页全部 transition
- 4 种氛围配色：深海 / 极光 / 余烬 / 虚空

## 技术

- Vanilla JS + CSS3 + HTML5，免构建
- Newton-Raphson 求解 cubic-bezier 采样
- Canvas 曲线渲染 + Pointer Events 拖拽
- 流体渐变背景 + 微晶玻璃态容器 + `cubic-bezier(0.16, 1, 0.3, 1)` 非线性动效
- 字体：Inter / Outfit / Share Tech Mono

Maintainer: EDEN

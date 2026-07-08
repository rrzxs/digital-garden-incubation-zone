# Scroll Cinema | 滚动影院

沉浸式滚动影院体验。将滚动轮化作放映机，7 幕场景依次展开——光圈、运镜、调色、蒙太奇、配乐——每一帧由你的滚动动作绘制。流体渐变背景 + 微晶玻璃态容器 + 非线性动效。

## 交互亮点

- **滚动即放映** — 滚轮速度驱动颗粒噪点、HUD 速率仪与场景响应
- **光圈联动 (Act 1)** — 滚动位置实时控制光圈叶片开合与 f 值读数
- **轨道运镜 (Act 2)** — 摄影机沿轨道滑行，镜头景别标记 (CU→WS) 响应滚动进度
- **调色滑块 (Act 3)** — 拖拽 before/after 分割线，3 种 LUT 预设切换
- **蒙太奇碰撞 (Act 4)** — 6 格画面悬停聚焦，剪切率随滚动速度波动
- **配乐波形 (Act 5)** — Canvas 实时绘制三种波形（弦乐/铜管/脉冲）
- **信箱遮幅** — 首屏滚动后浮现上下黑边，营造影院比例
- **颗粒噪点** — 快速滚动时叠加电影颗粒，模拟胶片质感
- **自定义光标透镜** — 差值混合环形光标，交互元素上膨胀
- **4 种氛围配色** — Noir / Sunset / Ocean / Forest
- **实时 FPS 读数** — 竖排显示当前帧率，致敬 24 FPS

## 技术栈

- Vanilla JS + CSS3 + HTML5（零构建）
- Google Fonts: Inter, Outfit, Share Tech Mono
- 动效曲线: `cubic-bezier(0.16, 1, 0.3, 1)`
- IntersectionObserver 驱动场景揭示
- Canvas 粒子流场 + 波形可视化
- CSS `backdrop-filter` 微晶玻璃态
- CSS `color-mix()` 主题色混合

## 文件结构

```
scroll-cinema/
├── index.html   # 7 幕场景结构
├── style.css    # 流体渐变 + 玻璃态 + 非线性动效
├── main.js      # 滚动驱动交互逻辑
└── README.md
```

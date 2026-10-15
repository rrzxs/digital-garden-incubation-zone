# Scroll Case Flow 滚动案例流

沉浸式滚动案例流体验场。垂直滚动被实时转译为水平案例流——六张微晶玻璃态案例卡片在粘性舞台上流动，配合速度形变、字符级揭示、多层视差与粒子流场。

## 交互亮点

- **滚动 → 水平流动**：粘性舞台 + `translate3d` 轨道映射，垂直滚动驱动案例卡水平流动
- **速度形变**：滚动速度实时驱动轨道倾斜（skewX）与轻微挤压（scaleY），快速滚动时粒子流场同步加速
- **字符级揭示**：标题逐字从迷雾中浮现，错峰 35ms 节奏
- **多层视差**：卡片编号以反向速率轻移，构建纵深
- **进度轨道**：底部进度条 + 案例圆点，可点击直接跳转
- **顶部 HUD**：实时显示滚动速度（VELOCITY）与当前案例编号
- **粒子流场**：120 枚粒子在伪噪声流场中游弋，随滚动速度奔涌
- **四种氛围配色**：Aurora / Ember / Abyss / Orchid，流体背景、粒子与玻璃容器同步蜕变

## 技术说明

- 零依赖 Vanilla JS + CSS3 + HTML5，免构建即插即用
- 字体：Inter / Outfit / Share Tech Mono
- 动效曲线：`cubic-bezier(0.16, 1, 0.3, 1)` 全程贯彻
- 尊重 `prefers-reduced-motion`
- 粒子动画使用 Canvas 2D，轨道映射使用 `requestAnimationFrame` + lerp 平滑

## 文件结构

```
scroll-case-flow/
├── index.html   # 结构：序幕 / 案例流舞台 / 注脚 / 尾声
├── style.css    # 流体渐变背景 + 微晶玻璃 + 非线性动效
├── main.js      # 滚动转译引擎 / 粒子流场 / 氛围切换
└── README.md
```

Maintainer: EDEN

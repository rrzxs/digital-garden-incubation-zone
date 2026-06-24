# Cube Portfolio · 立方作品集

沉浸式 3D 立方体作品集。六个面承载六个项目，拖拽旋转、惯性物理、弹簧归位与微晶玻璃态容器。

## 核心交互

- **拖拽旋转** — 按住立方体任意位置拖拽，立方体在 3D 空间中自由旋转
- **惯性物理** — 松手后立方体以阻尼系数 0.92 自然减速
- **弹簧归位** — 速度衰减到阈值后，立方体以 `cubic-bezier(0.34, 1.56, 0.64, 1)` 弹簧曲线吸附到最近的面
- **面导航** — 点击底部导航按钮直接旋转到指定面
- **键盘导航** — 方向键切换面，Enter/Space 重新对齐
- **鼠标视差** — 立方体根据光标位置产生 ±6° 微倾斜
- **点击面聚焦** — 点击立方体任一面，自动旋转使该面正对屏幕

## 审美风格

- **流体网格渐变背景** — 5 层超大模糊 blob + 噪点颗粒层，`mix-blend-mode: screen` 混合
- **微晶玻璃态容器** — `backdrop-filter: blur(26px)` + 微小发光描边
- **非线性动效** — 全部交互使用 `cubic-bezier(0.16, 1, 0.3, 1)` 物理曲线
- **4 种氛围配色** — Aurora 极光 / Ember 余烬 / Abyss 深渊 / Orchid 兰若

## 技术栈

- Vanilla JS + CSS3 + HTML5（免构建）
- 字体: Inter, Outfit, Share Tech Mono
- Pointer Events 统一鼠标 / 触摸交互
- Canvas 粒子流场（鼠标引力 + 近邻连线）

## 文件结构

```
cube-portfolio/
├── index.html   # 完整 HTML 结构
├── style.css    # 流体背景 + 玻璃态 + 立方体 3D 样式
├── main.js      # 拖拽物理 + 惯性 + 弹簧归位 + 粒子
└── README.md
```

## 创作者

Maintainer: EDEN

# Blender Camera Gallery · 景别画廊

沉浸式相机景别画廊。模拟 Blender 视口的镜头切换体验——六组相机角度在 3D 轨道上飞行，拖拽旋转视角、点击聚焦景别、景深参数联动，流体渐变背景 + 微晶玻璃态容器。

## 核心交互

- **轨道旋转** — 按住拖拽让相机群组围绕中心轨道旋转，松手后惯性衰减
- **弹簧吸附** — 速度衰减到阈值后自动吸附到最近镜头，`lerp 0.08` 弹簧逼近
- **点击聚焦** — 点击任意相机卡片即可聚焦该景别，参数面板联动更新
- **景别选择器** — 底部 chip 直接跳转任意景别
- **鼠标视差** — 整个轨道根据光标位置产生 X/Y 微倾斜（视差深度）
- **滚轮/键盘导航** — 滚轮或方向键切换镜头
- **粒子流场** — Simplex 近似噪声驱动的环境粒子，光标产生引力扰动

## 六组景别

| 编号 | 景别 | 焦距 | 光圈 | 场景 |
|------|------|------|------|------|
| CAM_01 | Wide Establish | 24mm | f/8.0 | 广角建立 |
| CAM_02 | Medium Follow | 50mm | f/4.0 | 中景跟随 |
| CAM_03 | Close Emotion | 85mm | f/1.8 | 特写情绪 |
| CAM_04 | Dutch Tilt | 35mm | f/2.8 | 荷兰角 |
| CAM_05 | Top Down | 28mm | f/5.6 | 俯瞰上帝视角 |
| CAM_06 | Low Hero | 70mm | f/2.0 | 低角度英雄 |

## 审美风格

- **流体网格渐变背景** — 5 层超大模糊 blob + 噪点颗粒层，`mix-blend-mode: screen`
- **微晶玻璃态容器** — `backdrop-filter: blur(24px)` + 微小发光描边
- **非线性动效** — 全部交互使用 `cubic-bezier(0.16, 1, 0.3, 1)` 物理曲线
- **4 种氛围配色** — Aurora 极光 / Ember 余烬 / Abyss 深渊 / Orchid 兰若
- **SVG 场景预览** — 每个相机卡片含程序化生成的场景缩略图

## 技术栈

- Vanilla JS + CSS3 + HTML5（免构建）
- 字体: Inter, Outfit, Share Tech Mono
- Canvas 粒子流场（噪声流场 + 鼠标引力）
- 3D `transform-style: preserve-3d` 轨道轮播

## 文件结构

```
blender-camera-gallery/
├── index.html   # 完整 HTML 结构
├── style.css    # 流体背景 + 玻璃态 + 3D 轨道样式
├── main.js      # 轨道物理 + 拖拽惯性 + 粒子流场 + 配色
└── README.md
```

## 创作者

Maintainer: EDEN

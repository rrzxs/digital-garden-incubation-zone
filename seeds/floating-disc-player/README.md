# Floating Disc Player · 浮碟播放器

沉浸式浮碟音乐播放器。唱片悬浮于流体渐变氛围中，播放时以 33⅓ RPM 旋转；**按住碟片拖拽即可刮擦（Scratch）寻迹**，松手后以弹簧-阻尼曲线自然归速。音源由 Web Audio 实时合成，零外部资源。

## 交互

- **拖拽碟片**：刮擦旋转，正转快进 / 倒带回退，粒子迸射
- **松手**：残留角速度沿 `cubic-bezier(0.16, 1, 0.3, 1)` 弹性归位至 33⅓ RPM
- **播放 / 暂停**：主按钮或 `Space`；`←` / `→` 切换曲目
- **进度条**：点击 / 拖拽寻迹
- **唱针**：播放时落下，暂停时抬起
- **碟片 3D 倾斜**：跟随光标透视偏转
- **氛围配色**：Aurora / Dusk / Abyss / Bloom 四套主题
- **环境粒子流场**：正弦流场 + 光标力场，刮擦时迸射粒子

## 技术

- Vanilla JS + CSS3 + HTML5，免构建
- Web Audio API 生成式音源（Pad / Pluck 双音色 × 4 音阶）
- 字体：Inter / Outfit / Share Tech Mono
- 动效曲线：`cubic-bezier(0.16, 1, 0.3, 1)`
- 微晶玻璃态（`backdrop-filter`）+ 流体网格渐变背景（超大模糊 + `mix-blend-mode: screen`）

Maintainer: EDEN

# Scroll Demo Choreographer · 滚动演示编舞家

沉浸式滚动演示编舞体验场。滚动速度即编舞指令——你的滑轮是节拍器，七幕微交互演出随节奏依次登场。

## 七幕演出

| 幕 | 名称 | 微交互 |
|----|------|--------|
| I | Overture · 序曲 | 乱码揭示标题 + 行级联揭示 + 漂浮装饰层 |
| II | Parallax · 视差 | 三层微晶玻璃深度系数差异滚动 |
| III | Reveal · 揭示 | 滚动进度驱动的字符级联点亮 / 熄灭 |
| IV | Tilt · 倾斜 | 3D 倾斜卡片 + 光泽追踪 + 错峰入场 |
| V | Pulse · 脉冲 | 滚动速度实时点亮的呼吸网格 |
| VI | Timeline · 时间轴 | 里程碑 CUE 随进度点亮 |
| VII | Finale · 终幕 | 累计滚动 / 峰值速度 / CUE 统计 + 回放 |

## 技术要点

- **免构建**：Vanilla JS + CSS3 + HTML5，无任何依赖
- **流体渐变背景**：四枚超大模糊光球 `mix-blend-mode: screen` 漂移呼吸 + 噪声层
- **微晶玻璃态**：`backdrop-filter: blur()` + 发光描边容器
- **非线性动效**：统一 `cubic-bezier(0.16, 1, 0.3, 1)` 物理曲线
- **速度遥测**：指数平滑滚动速度采样，驱动 HUD / 粒子流场 / 脉冲网格
- **粒子流场**：Canvas 噪声流场，能量随滚动速度实时增减
- **4 种氛围配色**：Aurora / Ember / Ocean / Void
- 字体：Inter · Outfit · Share Tech Mono

## 文件

- `index.html` — 结构
- `style.css` — 样式（背景、玻璃容器、动效）
- `main.js` — 交互逻辑（模块化：ScrollEngine / ParticleField / ScrambleReveal / TiltCards / ParallaxStack / CharCascade / PulseGrid / TimelineAct / ThemeManager / HUD / ProgressRail）

Maintainer: EDEN

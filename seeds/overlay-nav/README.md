# Overlay Nav 叠层导航

沉浸式叠层导航微交互体验场。四种流体展开模式驱动的全屏覆盖式导航，弹簧-阻尼物理 + 粒子流场 + 微晶玻璃态容器。

## 体验特色 / 交互方式

- **四种展开模式** — 液态形变（液化蔓延）/ 径向绽放（中心爆发）/ 幕帘裂分（clip-path 裂开）/ 故障切片（RGB 色散重组）
- **触发器轨道环** — 三层旋转轨道环 + 中心触发按钮，汉堡图标平滑形变为关闭图标
- **错峰菜单入场** — 菜单项以 `--i` CSS 变量驱动错峰浮现，每种模式有不同节奏
- **冲击波涟漪** — 点击触发器与悬停菜单项时在画布生成扩散涟漪 + 迸射粒子
- **流体粒子场** — 110 粒子带尾迹，鼠标力场吸引扰动
- **四种氛围配色** — 黑曜 / 静昼 / 余烬 / 苍翠，实时切换强调色与流体团
- **微晶玻璃态容器** — `backdrop-filter: blur(50px) saturate(160%)` + 非对称描边高光
- **非线性动效** — 全程 `cubic-bezier(0.16, 1, 0.3, 1)` 缓动，抵制生硬突变

## 操作方式

| 输入 | 动作 |
|------|------|
| `点击触发器` / `SPACE` | 展开 / 收起叠层 |
| `ESC` | 收起叠层 |
| `1` - `4` | 切换展开模式（液态/径向/幕帘/故障） |
| `Q` `W` `E` `R` | 切换氛围配色（黑曜/静昼/余烬/苍翠） |
| `F` | 切换全屏 |
| `鼠标移动` | 扰动粒子流场 |

## 技术栈

- Vanilla JS + CSS3 + HTML5
- Canvas 2D 粒子系统 + 涟漪物理
- CSS Custom Properties 主题切换
- CSS `clip-path` + `@keyframes` 模式动画
- 零依赖、零构建
- Google Fonts: Inter, Outfit, Share Tech Mono

## 架构说明

- `body[data-overlay]` 状态机：`closed → open → closing → closed`
- `body[data-mode]` 切换四种展开模式的 CSS 动画
- 菜单项通过 `style.setProperty('--i', i)` 设置错峰延迟 `calc(0.25s + var(--i) * 0.06s)`
- `applyPalette()` 实时注入 `--color-accent` 与流体团渐变色
- 强制重排 (`void el.offsetWidth`) 重启 CSS 动画

## 文件结构

```
overlay-nav/
├── index.html   — 完整 HTML 结构与叠层面板
├── style.css    — 四种模式动画 + 玻璃态 + 主题
├── main.js      — 粒子场 + 状态机 + 模式切换
└── README.md    — 说明文档
```

## 创作者

maintainer: **EDEN**

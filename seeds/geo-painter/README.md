# Geo Painter · 几何画师

> 沉浸式参数化几何绘画工作室。六种画笔在画布上呼吸——每一次落笔都拥有弹簧般的弹性回弹，对称镜像让构图自发涌现。

## ✨ 特性

- **6 种参数化画笔** — Circle / Polygon / Line / Curve / Star / Burst
- **弹簧物理形变** — 每个形状以弹簧-阻尼曲线入场展开，非线性 `cubic-bezier(0.16, 1, 0.3, 1)`
- **对称镜像** — 1× ~ 8× 径向对称，构图自动涌现曼陀罗般的图案
- **参数调节** — 边数、线宽、对称数、填充开关实时响应
- **撤销 / 重做** — 完整历史栈（50 步），支持 `Ctrl+Z` / `Ctrl+Y`
- **随机生成** — 一键生成 5~9 个随机形状组合
- **PNG 导出** — 带深色背景的高清导出
- **粒子流场背景** — Simplex 风格粒子场响应鼠标引力
- **4 种氛围配色** — Aurora 极光 / Ember 余烬 / Abyss 深渊 / Orchid 兰若

## 🎨 审美

- 流体网格渐变背景（5 个动态 blob + 噪点颗粒层）
- 微晶玻璃态工具面板（`backdrop-filter: blur`）
- 非线性动效曲线（Expo Out / Spring）
- 字体：Outfit (display) · Inter (body) · Share Tech Mono (mono)

## ⌨️ 快捷键

| 键 | 功能 |
|---|---|
| `1` ~ `6` | 切换画笔 |
| `Ctrl+Z` | 撤销 |
| `Ctrl+Y` / `Ctrl+Shift+Z` | 重做 |
| `R` | 随机生成 |
| `C` | 清空画布 |
| `E` | 导出 PNG |

## 🛠 技术栈

- Vanilla JS + CSS3 + HTML5（零构建）
- Canvas 2D API（绘画引擎 + 粒子流场）
- Pointer Events（统一鼠标/触摸）
- IntersectionObserver（入场揭示）

## 📐 架构

```
main.js 结构:
├── 绘图状态管理 (shapes / undo / redo 栈)
├── 形状构造与绘制 (6 种画笔 + 对称镜像)
├── 弹簧物理动画循环 (morph 入场形变)
├── 指针交互 (pointerdown/move/up)
├── 撤销/重做/清空/随机/导出
├── 参数滑块绑定
├── 粒子流场背景
├── 光标光晕 + 涟漪 + Toast
└── 键盘快捷键
```

---

*Maintainer: EDEN · Digital Garden Incubation Zone*

# Narrative Slice Studio · 叙事切片工作室

> 沉浸式叙事切片工作室。将一段微小说切片为可悬停、可激活、可重组的时间轴卡片。流体渐变背景 + 微晶玻璃态容器 + 非线性微交互。

## 体验

- **4 个故事调色板**：Lighthouse / Garden / Voyage / Echo，每个故事 7 个切片，切换时整个氛围配色随之迁移。
- **切片时间轴**：横向卡片轨，每张卡片承载一个叙事切片（编号 / mood / 时长 / 标题）。
- **高阶微交互**：
  - 悬停卡片：跟随光标的径向高光、3D 倾斜、顶部强调线扫入、标题字符错峰揭示。
  - 点击卡片：激活态高亮、滚动入视、阅读面板逐字打字机揭示正文。
  - PLAY SEQUENCE：按顺序点亮切片，进度条与 HUD 脉冲实时联动。
  - SHUFFLE / RESET：打乱 / 复原切片顺序，附带错峰重入场动画。
- **环境层**：流体网格渐变（4 颗 blur 球 + screen 混合）+ Canvas 漂浮粒子场 + SVG noise 颗粒。

## 文件

| 文件 | 说明 |
|------|------|
| `index.html` | 语义化结构：封面 / 调色板轨 / 切片时间轴 / 阅读面板 / HUD |
| `style.css` | Design tokens、4 套配色、玻璃态、非线性动效（`cubic-bezier(0.16, 1, 0.3, 1)`） |
| `main.js` | 故事数据、切片渲染、悬停 / 点击 / 播放 / 洗牌逻辑、粒子场、HUD |
| `README.md` | 本文件 |

## 技术

- **免构建**：纯 Vanilla JS + CSS3 + HTML5，无 `package.json`，无构建流。
- **字体**：Inter（正文）/ Outfit（展示）/ Share Tech Mono（HUD 与元信息）。
- **缓动**：全局以 `cubic-bezier(0.16, 1, 0.3, 1)` 为柔和锚点，辅以回弹 `cubic-bezier(0.34, 1.56, 0.64, 1)`。
- **可访问性**：键盘可达（Tab / Enter / ← → / Space），`prefers-reduced-motion` 降级。

## 维护者

`maintainer: EDEN`

# Scroll Stitcher · 卷轴织纹

沉浸式滚动织纹体验。将"滚动"重新隐喻为"穿针引线"——
每一次滚动都是一针，将散落的章节缝合为连贯的织物纹理。

## 核心交互

1. **织纹丝线 (Thread)** — Simplex 噪声驱动的丝线实时穿越五个锚点，连接全页章节
2. **纬线网格 (Weft)** — 12 个弹性单元响应滚动，每经过一针便脉冲发光
3. **经线结环 (Knot Ring)** — 6 个结点环绕脉动，鼠标接近时膨胀共振
4. **丝线性格 (Thread Type)** — 点击切换 Silk / Wire / Ribbon 三种织纹质感
5. **针脚计数 (Stitch Count)** — 实时记录滚动产生的针脚数与张力

## 交互方式

- **滚动**：速度越快，丝线波动越剧烈、张力越高
- **鼠标移动**：结环膨胀共振 + 玻璃态容器透视倾斜
- **点击丝线卡片**：切换贯穿全页的织纹质感，触发粒子迸射
- **键盘方向键**：切换章节
- **右下角配色**：4 种氛围配色 (Aurora / Ember / Ocean / Void)

## 审美系统

- **流体渐变背景**：4 颗超大模糊光球混合模式呼吸
- **微晶玻璃态容器**：`backdrop-filter: blur(24px)` + 发光描边
- **非线性动效**：统一 `cubic-bezier(0.16, 1, 0.3, 1)` 曲线
- **字体**：Outfit (展示) / Inter (正文) / Share Tech Mono (数据)

## 技术栈

- Vanilla JS + CSS3 + HTML5 (零构建)
- Simplex Noise (内联实现)
- Canvas 2D 丝线粒子系统
- CSS 变量主题系统
- IntersectionObserver 章节管理

## 文件结构

```
scroll-stitcher/
├── index.html   — 5 幕章节结构 + 锚点 + 织纹舞台
├── style.css    — 流体渐变背景 + 微晶玻璃态 + 非线性动效
├── main.js      — 丝线绘制 / 滚动针脚 / 结环共振 / 粒子系统
└── README.md
```

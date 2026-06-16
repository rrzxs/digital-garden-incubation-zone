# Stamp Loupe · 邮政透镜

沉浸式邮票放大镜体验。移动光标，让透镜贴近纸面——齿孔、水印、油墨颗粒与纤维纹路会在透镜下缓缓苏醒。6 枚限量邮集，4 种透镜模式，4 种氛围配色。

## 核心交互

1. **放大透镜 (Magnifier Loupe)** — 光标进入邮票区域即唤起圆形透镜，实时放大邮票细节，带扫描线、十字准星与镜面眩光
2. **4 种透镜模式 (Lens Modes)** — 标准 / 紫外（显隐水印）/ 偏振（显隐纤维）/ 热感（温差色阶）
3. **磁力倾斜 (Magnetic Tilt)** — 光标在邮票上方移动时，邮票产生透视倾斜吸附
4. **可调缩放 (Zoom Control)** — 1.5× ~ 6× 滑块调节，实时联动透镜内容
5. **3 种透镜尺寸 (Loupe Size)** — S / M / L 切换透镜物理直径
6. **6 枚限量邮集 (Stamp Catalog)** — 星图纪元 / 深海回声 / 磷光航线 / 晶体花园 / 丝路织锦 / 极光信标
7. **翻转邮票 (Flip Stamp)** — 3D 翻转邮票背面，胶面粒子迸射
8. **收入图鉴 (Collect)** — 将邮票标记为已收藏，缩略图盖上 ✓ 勋章

## 交互方式

- **移动光标**：透镜跟随光标，放大邮票局部；光标离开则透镜隐没
- **透镜模式**：点击 4 种模式芯片切换审视方式（紫外显隐水印，偏振显隐纤维）
- **缩放滑块**：拖拽调节 1.5× ~ 6× 放大倍率
- **透镜尺寸**：S / M / L 三档切换透镜直径
- **邮集选择**：点击缩略图将邮票放入透镜舞台
- **翻转**：点击"翻转邮票"按钮 3D 翻转
- **收入图鉴**：标记收藏，HUD 与缩略图同步更新
- **右下角配色**：4 种氛围配色 (Aurora / Ember / Ocean / Void)

## 审美系统

- **流体渐变背景**：4 颗超大模糊光球 `mix-blend-mode: screen` 呼吸
- **微晶玻璃态容器**：`backdrop-filter: blur(24px)` + 发光描边
- **非线性动效**：统一 `cubic-bezier(0.16, 1, 0.3, 1)` 曲线
- **字体**：Outfit (展示) / Inter (正文) / Cormorant Garamond (邮票衬线) / Share Tech Mono (数据)
- **邮票纸质感**：米白纸张色 + 水印斜纹层 + 纤维纹路 + 齿孔边缘
- **透镜光学**：镜面眩光 + 扫描线 + 十字准星 + 边缘色环 + 手柄

## 邮集目录

| 编号 | 名称 | 面值 | 印刷 | 水印 |
|------|------|------|------|------|
| A-001 | 星图纪元 Cartographer | ¥10 | Offset Litho | Garden Cross |
| B-002 | 深海回声 Abyssal Echo | ¥8 | Intaglio | Wave Pattern |
| C-003 | 磷光航线 Phosphor Trail | ¥12 | Photogravure | Beacon Star |
| D-004 | 晶体花园 Crystalline Bloom | ¥6 | Engraved | Hex Lattice |
| E-005 | 丝路织锦 Silk Route Weave | ¥15 | Silk Screen | Diamond Loom |
| F-006 | 极光信标 Aurora Beacon | ¥20 | Iridescent Litho | Curtain Fold |

## 技术栈

- Vanilla JS + CSS3 + HTML5 (零构建)
- Simplex Noise (内联实现) 驱动粒子流场
- Canvas 2D 粒子系统 + 翻转迸射
- CSS 变量主题系统 + `backdrop-filter` 玻璃态
- IntersectionObserver 章节揭示
- SVG 程序化邮票图案（模板色替换）

## 文件结构

```
stamp-loupe/
├── index.html   — 5 幕结构：序章 / 透镜舞台 / 邮集陈列 / 溯源 / 尾声
├── style.css    — 流体渐变 + 微晶玻璃态 + 邮票质感 + 透镜光学 + 非线性动效
├── main.js      — 透镜跟随 / 模式切换 / 缩放联动 / 邮集加载 / 粒子系统 / 翻转
└── README.md
```

# Font Specimen Lens · 字体样张透镜

沉浸式字体样张检视工具。一枚弹簧物理驱动的放大透镜跟随光标游走于大字号样张之上，实时洞穿字体的骨骼与血肉。

## 核心交互

- **透镜检视**：弹簧-阻尼物理跟随的放大镜，倍率 1.2× ~ 4.8× 可调
- **三种透镜模式**：
  - `放大 Magnify` — 高倍放大字形细节
  - `度量 Metrics` — 实时绘制 cap-height / x-height / baseline / descender 参考线（Canvas TextMetrics 引擎）
  - `蓝图 Blueprint` — 描边解剖字形轮廓
- **实时排印控制**：Inter / Outfit / Share Tech Mono 三字体族切换，可变字重 (100-900)、字号、字距滑块
- **HUD 遥测**：透镜下方实时显示字体族 · 字重 · 字号与光标下字符（`caretRangeFromPoint` 命中检测）
- **字形骨骼网格**：字符单元悬停弹性扰动，点击触发乱码重构动画
- **字号级联 Waterfall**：7 级字号级联样张随参数实时同步
- **4 种氛围配色**：极光 / 余烬 / 午夜 / 花晖

## 技术栈

- 免构建：Vanilla JS + CSS3 + HTML5
- 流体渐变背景（`@keyframes` + `filter: blur(90px)` + `mix-blend-mode: screen`）
- 微晶玻璃态容器（`backdrop-filter: blur()` + 发光描边）
- 统一非线性动效曲线：`cubic-bezier(0.16, 1, 0.3, 1)`
- 字体：Inter / Outfit / Share Tech Mono（Google Fonts）

## 维护者

EDEN

## LICENSE

MIT

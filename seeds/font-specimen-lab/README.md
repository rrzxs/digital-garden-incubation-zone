# Font Specimen Lab 字体样张实验室

沉浸式字体样张实验室。样张文本可自由编辑，光标即力场——移动光标，字符的字重（Variable Font `wght` 100–900）随邻近程度实时呼吸；切换正弦波流模式，字重如波浪穿行。

## 交互

- **字重力场**：邻近呼吸（光标驱动字重）/ 正弦波流（时间驱动波流）/ 静默平铺
- **字体轨道**：Inter / Outfit / Share Tech Mono 三家族一键切换，切换伴随乱码揭示动画
- **实时控制台**：字号、字距、基础字重滑杆
- **Glyph Atlas 字形图鉴**：点击任意字形放入检视舱——cap / mean / baseline 度量参考线 + 独立字重调节
- **换一句样张**：随机样张 + 乱码重构入场
- **4 种氛围配色**：极光 / 余烬 / 酸柠 / 雾紫

## 技术

- Vanilla JS + CSS3 + HTML5，免构建
- 流体渐变背景（blur + mix-blend-mode）+ 微晶玻璃态容器（backdrop-filter）
- 非线性动效曲线 `cubic-bezier(0.16, 1, 0.3, 1)`
- Canvas 尘埃粒子场

Maintainer: EDEN

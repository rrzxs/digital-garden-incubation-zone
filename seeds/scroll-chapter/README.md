# Scroll Chapter · 章节卷轴

沉浸式章节卷轴体验。滚动驱动的文字揭示、粒子流场、文字变形与微晶玻璃态容器。

## 功能

- **5 幕章节叙事**：Prologue → Emergence → Resonance → Metamorphosis → Epilogue
- **滚动驱动揭示**：IntersectionObserver 检测章节可见性，逐行文字揭示动画
- **粒子流场**：80 个粒子在 Canvas 上流动，鼠标产生引力扰动，粒子间自动连线
- **文字变形**：故障风格文字解码效果，在多个词汇间循环变换
- **进度导航**：右侧进度条 + 章节圆点导航，点击跳转
- **4 种氛围配色**：Aurora（极光）、Ember（余烬）、Ocean（深海）、Void（虚空）
- **键盘导航**：方向键上下切换章节
- **光标光晕**：跟随鼠标的径向渐变光晕
- **视差流体背景**：4 个模糊光球缓慢浮动 + 噪声纹理叠加

## 技术栈

- Vanilla JS + CSS3 + HTML5（零构建）
- 字体：Outfit、Inter、Share Tech Mono
- 动效曲线：`cubic-bezier(0.16, 1, 0.3, 1)`
- IIFE 封装，DOM / State / Config 三层架构

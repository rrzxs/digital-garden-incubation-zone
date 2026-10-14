# Blinds Lightbox 百叶窗灯箱

沉浸式百叶窗灯箱画廊。图片以弹簧级联的百叶窗叶开合呈现——切换图片时窗叶依次合拢、换片、再如涟漪般展开。

## 交互
- **← / →**：切换图片（百叶窗级联过渡）
- **空格 / SHUTTER 按钮**：快门全开全闭
- **拖拽舞台上下**：实时摩擦式调节窗叶开合度
- **APERTURE 滑杆**：开合度精调
- **SLATS 滑杆**：窗叶数量（6~30）
- **STAGGER**：三种错峰动效（CASCADE 级联 / WAVE 波浪 / RANDOM 随机）
- **BREATHE**：6 秒呼吸节律自动开合
- **T**：切换 4 种氛围配色（aurora / ember / jade / violet）

## 视觉
- 流体渐变背景（超大模糊 orb + mix-blend-mode screen 呼吸漂移）
- 微晶玻璃态容器（backdrop-filter + 发光描边）
- 窗叶间光泄露线（light leaks）与丁达尔尘埃粒子
- 全部动效使用 `cubic-bezier(0.16, 1, 0.3, 1)` 非线性曲线

## 技术
Vanilla JS + CSS3 + HTML5，免构建。字体：Inter / Outfit / Share Tech Mono。图片来自 picsum.photos 占位服务。

Maintainer: EDEN

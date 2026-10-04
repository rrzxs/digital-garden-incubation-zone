# Scroll Film · 胶片之卷

沉浸式滚动胶片放映体验。**每一次滚动，都是一格放映。**

## 概念

将页面滚动隐喻为一卷 35mm 胶片的放映过程：7 格胶片章节讲述从「显影」到「放映」的完整影像 lifecycle，滚动速度即放映快门——

- **滚动速度驱动**：颗粒噪点浓度、色散偏移、胶片颤动、信箱遮幅收拢、漏光光斑、尘埃粒子加速
- **实时时间码 HUD**：`HH:MM:SS:FF` @24fps、放映倍速、帧计数与全片进度条
- **光圈光标**：自定义 aperture lens 光标，随滚动速度扩张、随按压收缩
- **微晶玻璃态胶片格**：sprocket 齿孔边栏 + backdrop blur 容器 + 错峰揭示动画
- **章节导航轨**：右侧菱形章节点，点击平滑跳转
- **4 种氛围配色**：Noir 蓝调 / Amber 琥珀 / Teal 橙青 / Violet 紫梦

## 技术栈

- 纯 Vanilla JS + CSS3 + HTML5，零构建、零依赖
- 字体：Inter / Outfit / Share Tech Mono
- 全局动效曲线：`cubic-bezier(0.16, 1, 0.3, 1)`
- `IntersectionObserver` 驱动章节揭示与导航联动
- `requestAnimationFrame` 物理循环：速度平滑、光标追随、尘埃粒子场

## 文件

| 文件 | 说明 |
| --- | --- |
| `index.html` | 7 格胶片章节 + HUD 结构 |
| `style.css` | 流体渐变背景 / 玻璃态容器 / 非线性动效 / 4 主题 |
| `main.js` | 滚动物理、时间码、颗粒/色散/抖动渲染、粒子场 |

Maintainer: EDEN · Digital Garden

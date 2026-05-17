# Scroll Storyboard · 分镜卷轴

沉浸式分镜叙事卷轴体验。

7 幕故事分镜，滚动驱动场景转换。手绘线框美学与流体渐变融合，每一帧都是一扇门。

## 特性

- 7 幕叙事分镜：从 Prologue 到 Epilogue 的完整故事弧
- 滚动驱动揭示：IntersectionObserver 控制入场动画与文字逐行揭示
- 滚动速度畸变：快速滚动时微晶玻璃态容器产生 skewY 扭曲
- 粒子流场：鼠标吸引力的连线粒子系统
- 视差深度：多层元素以不同速度运动
- 4 种氛围配色：Aurora / Ember / Ocean / Void
- 帧导航：右侧帧指示点 + 顶部帧计数器
- 流体渐变背景 + 微晶玻璃态容器

## 技术

- Vanilla JS + CSS3 + HTML5
- 零构建依赖
- IntersectionObserver 驱动入场
- Canvas 2D 粒子系统
- CSS Custom Properties 主题切换

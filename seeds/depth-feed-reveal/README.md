# Depth Feed Reveal — 深度流揭示

沉浸式深度信息流揭示交互体验。内容卡片在深度层次间浮现与隐没，模拟深海潜水般的渐进式内容发现。

## 交互模式

- **滚动揭示** — 向下滚动时卡片逐层浮现，配以视差深度效果
- **悬停揭示** — 鼠标悬浮在卡片上时触发模糊揭示动画
- **点击揭示** — 点击卡片触发涟漪冲击波揭示效果

## 视觉特性

- 流体渐变背景 (3 层浮动光球)
- 微晶玻璃态容器 (backdrop-filter blur)
- Simplex 噪声粒子流场
- 4 种揭示动画 (fade-up / blur-in / scale-up / slide-right)
- 乱码文字解密效果
- 深度指示器实时追踪
- 光标追踪光晕

## 配色方案

| 主题 | 色调 |
|------|------|
| Abyss 深渊 | 深海蓝系 |
| Aurora 极光 | 翡翠绿系 |
| Ember 熔岩 | 琥珀橙系 |
| Nebula 星云 | 暮光紫系 |

## 技术实现

- Vanilla JS + CSS3 + HTML5
- Canvas 粒子系统 (DPR-aware)
- CSS Custom Properties 主题切换
- IntersectionObserver 替代方案 (滚动位置计算)
- 零构建、零依赖

# Crowd Choreography · 群舞编排

沉浸式群体编排交互体验。基于 Boid 群集算法（分离、对齐、凝聚）驱动的粒子群落模拟，支持 6 种编舞队形切换与 4 种氛围配色。

## 交互方式

- **鼠标移动** — 吸引附近粒子群聚跟随
- **点击/触摸** — 产生脉冲冲击波推散粒子
- **编舞面板** — 切换 Flock / Spiral / Grid / Wave / Circle / Scatter 六种队形
- **Space** — 暂停/继续
- **R** — 重置模拟

## 技术实现

- Vanilla JS + Canvas 2D，零依赖
- Boid 三规则群集行为模拟
- 队形目标点吸引力系统
- 脉冲冲击波物理扩散
- 粒子轨迹尾迹渲染
- 流体渐变背景 + 微晶玻璃态 UI

## 审美

- 字体: Outfit / Inter / Share Tech Mono
- 动效曲线: `cubic-bezier(0.16, 1, 0.3, 1)`
- 玻璃态容器 + 发光描边 + 呼吸光晕

# Candy Orbit — 糖果星轨

沉浸式糖果太阳系引力微交互体验。在流体渐变背景中，糖果行星围绕中央糖芯恒星运行。

## 玩法

- **弹弓发射**：在画布任意位置按下并拖拽，松开即向反方向发射一颗糖果行星
- **轻点脉冲**：快速点击画布触发恒星冲击波，将糖果推入新轨道
- **三种模式**：Orbit（经典引力）/ Drift（低重力漂移）/ Swarm（糖果间相互吸引的蜂群）
- **参数调节**：引力强度、拖尾长度实时可调
- **Spawn / Clear**：一键生成稳定轨道糖果或清空星系

## 技艺

- Vanilla JS Canvas 引力模拟 + 果冻挤压形变（速度驱动 squash & stretch）
- 流体 Mesh 渐变背景（`@keyframes` + `blur` + `mix-blend-mode: screen`）
- 微晶玻璃态容器（`backdrop-filter: blur` + 发光描边）
- 全局非线性动效曲线 `cubic-bezier(0.16, 1, 0.3, 1)`
- 4 种糖果氛围配色：Sugar / Mint / Nebula / Citrus

Maintainer: EDEN

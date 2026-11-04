# Thermal Vision · 热成像视界

沉浸式热成像微交互体验。整个页面是一台热像仪：光标即热源，移动速度决定热迹亮度，热场实时扩散与冷却，配以自走「生命体」热信号与十字准星温度随读。

## 交互

| 操作 | 效果 |
| --- | --- |
| 移动光标 | 注入热量，速度越快热迹越亮 |
| 点击 / 按住拖拽 | 热脉冲冲击 + 涟漪环 |
| BRUSH / TORCH / FREEZE | 三种模式：热刷 / 焰炬 / 冷凝 |
| `1`–`4` | 切换光谱：Ironbow / Inferno / Arctic / Rainbow |
| `L` | 切换自走热体 |
| `I` | 切换等温线（8 级量化） |
| `SPACE` / PURGE | 瞬间冷却净化全场 |

## 可调参数

- **SENSITIVITY 热敏** — 热信号映射增益
- **DECAY 冷却** — 热场衰减系数
- **DIFFUSION 传导** — 热扩散强度

## 技术

- Vanilla JS + CSS3 + HTML5，零构建
- Float32 双缓冲网格热扩散模拟（拉普拉斯算子 + 指数衰减）
- 调色板 LUT（256 级）+ 等温线量化渲染
- 流体渐变背景 + 微晶玻璃态容器 + `cubic-bezier(0.16, 1, 0.3, 1)` 非线性动效
- 字体：Inter / Outfit / Share Tech Mono

Maintainer: EDEN

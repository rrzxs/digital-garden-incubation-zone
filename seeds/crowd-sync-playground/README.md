# Crowd Sync Playground — 群体同步游乐场

沉浸式群体同步交互体验场。基于 Boid 群集算法的粒子群落实时模拟群体涌现行为。

## 核心交互

- **群集物理**：融合、分离、对齐三力驱动，实时涌现群体智慧
- **同步脉冲**：点击画布或按下 Pulse 按钮，释放同步冲击波
- **光标力场**：鼠标靠近时粒子被排斥，按住时粒子被吸引
- **4 种运动模式**：Swarm（自然群集）/ Orbit（环绕轨道）/ Fountain（喷泉升降）/ Breath（呼吸律动）
- **4 种氛围配色**：Aurora / Ember / Ocean / Void
- **参数调节**：Agent 数量（20-300）与聚合力强度

## 技术栈

- Vanilla JS + CSS3 + HTML5（免构建）
- Canvas 2D 渲染引擎
- CSS 变量驱动的动态配色系统
- 流体渐变背景（Screen 混合模式）
- 微晶玻璃态控制面板

## 文件结构

```
crowd-sync-playground/
├── index.html   — 页面结构
├── style.css    — 样式与动效
├── main.js      — 交互逻辑与物理引擎
└── README.md    — 说明文档
```

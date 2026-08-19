# Blob Physics Lab 液滴物理实验室

沉浸式软体液滴物理实验室。压力软体模型（质点环 + 弹簧约束 + 内压 + Verlet 积分）驱动的液滴在微晶玻璃态舞台上揉捏、碰撞与炸裂。

## 交互
- **点击空白** — 孕育新液滴（带涟漪脉冲）
- **按住拖拽** — 弹簧抓取液滴，实时揉捏形变
- **双击液滴** — 令其炸裂为碎片小液滴
- **三种物理模式** — Float 悬浮 / Gravity 重力 / Zero-G 零重力
- **参数调节** — Gravity、Softness、Damping 实时滑块
- **4 种氛围配色** — 星云 / 潟湖 / 余烬 / 极光

## 技术
- 免构建：Vanilla JS + Canvas 2D + CSS3
- 物理引擎：Verlet 积分 + 弹簧约束迭代 + 内压保持 + 液滴间碰撞
- 渲染：Catmull-Rom 平滑闭合曲线 + 径向渐变 + 辉光
- 动效曲线：`cubic-bezier(0.16, 1, 0.3, 1)`
- 字体：Inter / Outfit / Share Tech Mono

Maintainer: EDEN

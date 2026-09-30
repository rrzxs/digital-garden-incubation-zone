# Emotion Orb · 情绪光球

沉浸式情绪微交互体验。选择此刻的情绪，光球以噪声形变、呼吸节律与环绕粒子实时流变，替你把感受凝成一枚流动的晶体。

## 功能

- **6 种情绪预设**：平静 / 喜悦 / 愤怒 / 忧伤 / 不安 / 好奇，每种情绪拥有独立配色、能量系数与诗句
- **噪声形变光球**：多层 value-noise 描边驱动球体非线性流变，随情绪能量改变躁动幅度
- **情绪脉冲**：点击按钮或画布任意位置释放冲击波涟漪环，光球弹性膨胀后回归
- **思绪漂移模式**：光球脱离中心，在画布中缓慢游移
- **参数调节**：强度（形变幅度 / 粒子密度感）、呼吸节律（时间倍率）
- **鼠标力场**：光球轻微跟随光标，环绕粒子被光标排斥
- **HUD 遥测**：COH / NRG / FPS 实时读数（Share Tech Mono）

## 技术

- 纯 Vanilla JS + CSS3 + HTML5，免构建，Canvas 2D 渲染
- 流体渐变背景：超大模糊 blob + `mix-blend-mode: screen` + 呼吸动画
- 微晶玻璃态容器：`backdrop-filter: blur()` + 发光描边
- 全部动效使用 `cubic-bezier(0.16, 1, 0.3, 1)` 非线性曲线
- 字体：Inter / Outfit / Share Tech Mono
- 支持 `prefers-reduced-motion`

## 使用

直接在浏览器打开 `index.html` 即可，无任何依赖构建步骤。

---

Maintainer: EDEN

# Robotics Signal Scope · 信号示波器

沉浸式机器人信号示波器 Web App。流体渐变背景 + 微晶玻璃态容器 + 非线性动效，模拟专业级机器人工程示波器界面。

## 功能特性

- **四种可视化模式**
  - `Oscilloscope` — 多通道实时波形合成
  - `Spectrum` — FFT 频谱柱状分析
  - `Radar` — 360° 雷达扫描 + 目标点亮
  - `Telemetry` — 遥测历史曲线 + 电压读数
- **6 种波形发生器** — Sine / Square / Triangle / Sawtooth / Noise / Pulse
- **实时参数调制** — 频率、振幅、抖动、扫描四个可调维度
- **4 通道管理** — Servo α / Servo β / IMU Gyro / LiDAR，点击开关
- **4 种氛围配色** — Abyss 深渊 / Plasma 等离子 / Quantum 量子 / Solar 日冕
- **系统监控** — CPU / MEM / NET / BATT 实时跳动指标
- **底部数据流 Ticker** — 无缝滚动遥测状态
- **点击涟漪微交互** — 全局非线性涟漪扩散

## 技术栈

- Vanilla JS + Canvas 2D + CSS3（零构建）
- 字体: Inter / Outfit / Share Tech Mono
- 动效曲线: `cubic-bezier(0.16, 1, 0.3, 1)`
- 背景流体渐变 + `backdrop-filter` 微晶玻璃态

## 使用

直接用浏览器打开 `index.html` 即可。点击顶部芯片切换模式，右侧面板调节参数与通道。

## 维护者

EDEN

# Audio Atlas 声之图集

> 数字花园种子 · maintainer: EDEN

沉浸式声音世界图集。六大声音地貌（雨林 / 洋流 / 荒漠 / 都会 / 极光 / 牧场）由 Web Audio 实时程序化合成——无需任何音频文件，所有雨声、鸟鸣、涌浪、风啸、嗡鸣与牛铃皆为噪声塑形 + 振荡器 + LFO 现场生成。

## 体验

- **六大声音地貌**：点击图集标记或地貌卡片即刻启程，键盘 `1-6` 快速切换，`Esc` 停止
- **三种可视化模式**：Radial 径向频谱环 / Waveform 波形线 / Particles 能量流场
- **四种氛围配色**：Aurora / Dusk / Abyss / Ember，一键切换全局流体渐变
- **强度滑杆**：实时调节合成器增益与随机事件密度
- **Pulse 脉冲**：向全场发射冲击波，推挤粒子流场

## 微交互

- 流体网格渐变背景（超大模糊 + `mix-blend-mode: screen` + 呼吸漂移）
- 微晶玻璃态容器（`backdrop-filter: blur` + 发光描边）
- 统一非线性动效曲线 `cubic-bezier(0.16, 1, 0.3, 1)`
- 光标视差 3D 倾斜图集框、点阵经纬网格光标斥力
- 乱码揭示（Scramble Reveal）标题与状态栏
- 错峰级联入场动画、地貌节点脉冲光环、卡片均衡器律动

## 技术

- 免构建：Vanilla JS + CSS3 + HTML5，零依赖
- 字体：Inter / Outfit / Share Tech Mono
- 音频：Web Audio API（噪声缓冲 + BiquadFilter + LFO + 泊松事件调度）
- 可视化：Canvas 2D（值噪声流场粒子 + AnalyserNode 频谱/波形）

## 文件

```
index.html   — 结构
style.css    — 流体背景 / 玻璃态 / 非线性动效
main.js      — 音频引擎 / Canvas 渲染 / 交互逻辑
README.md    — 本说明
```

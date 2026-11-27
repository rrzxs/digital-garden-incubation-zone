# Stem Waveform Mixer · 分轨波形混音台

数字花园种子：一个免构建的沉浸式分轨波形混音台。

## 玩法

- **PLAY / Space** —— 启动 Web Audio 实时合成引擎，六大分轨即刻发声
- **分轨** —— Kick（低频脉冲）、Snare（军鼓）、Hats（高频切片）、Bass（贝斯线条）、Synth（琶音主音 + 附点延迟）、Pad（Am7 / Fmaj7 和声垫）
- **每轨通道条** —— 活体波形（AnalyserNode 实时时域绘制）、发光电平表、音量推子、M 静音 / S 独奏
- **主总线** —— 巨幅镜像波形 + 16 步节拍指示轨 + L/R 输出表 + dBFS 读数
- **BPM 滑杆**（70–160）—— 实时变速，Synth 延迟自动跟随附点八分
- **点击任意波形** —— 发射涟漪冲击波
- **4 种氛围配色** —— 极光 / 熔岩 / 深海 / 霓虹

## 技术

- 纯 Vanilla JS + CSS3 + HTML5，零依赖、免构建
- Lookahead 调度器（25ms 轮询 / 120ms 预排）保证节拍精准
- 每轨独立 `AnalyserNode`，Canvas 按 DPR 缩放渲染
- 流体渐变背景（blur + mix-blend-mode screen）+ 微晶玻璃态容器
- 统一非线性缓动曲线 `cubic-bezier(0.16, 1, 0.3, 1)`

maintainer: EDEN

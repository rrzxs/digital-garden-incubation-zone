# Voice Scribe · 声之誊写员

沉浸式语音誊写体验。轻触麦克风，言语即刻化为文字——Web Speech API 实时转写 + Web Audio 时域波形可视化 + 微晶玻璃态声档管理。

## 功能

- **实时誊写**：Web Speech API（`zh-CN`）连续聆听，临时候选文字以光标闪烁呈现，落定后凝为正文
- **活体波形**：`getUserMedia` + `AnalyserNode` 绘制发光时域波形，声压实时映射振幅
- **演示模式**：无麦克风权限或不支持 Speech API 时自动回退，模拟誊写一首关于声音的诗
- **声档系统**：誊写内容存入本地声档（localStorage 持久化），支持复制、焚毁、Markdown 一键导出
- **氛围配色**：Aurora / Dusk / Mint / Noir 四种流体渐变氛围，即时切换并记忆

## 技术要点

- 免构建：Vanilla JS + CSS3 + HTML5，零依赖
- 流体渐变背景：三团超大模糊光球 + `mix-blend-mode: screen` 漂移呼吸
- 微晶玻璃态：`backdrop-filter: blur(22px) saturate(1.4)` + 发光描边
- 非线性动效：全局统一 `cubic-bezier(0.16, 1, 0.3, 1)` 物理曲线
- 字体：Inter / Outfit / Share Tech Mono
- 尊重 `prefers-reduced-motion`

## 使用

直接用浏览器打开 `index.html`（语音识别需 Chrome 等支持 Web Speech API 的浏览器，并授予麦克风权限）。

---

Maintainer: EDEN 🌱

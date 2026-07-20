# Glitch Pulse Mixer - 故障脉冲视觉合成器

> Disrupt the signal, own the noise.

拖拽脉冲节点跨故障画布，实时混合色差、扫描线与数据损毁效果；频率滑块同步声波心跳节律；点击波形热点触发微故障以瓦解并重建合成。

## 功能特性

### 核心交互
- **拖拽脉冲节点**: 在画布上拖拽 NODE_A / NODE_B / NODE_C，每个节点贡献一个本地故障场
- **节点检视器**: 切换激活节点，单独调节 Chromatic Aberration / Scanline / Datamosh / Pulse Radius
- **混音控制台**: 全局 Frequency (BPM)、Amplitude、Noise Floor 与 4 种氛围调色板
- **波形热点**: 点击底部 7 个波形热点触发微故障（rupture）
- **一键随机化 / 重置 / 手动 RUPTURE**
- **可选 Web Audio 心跳节拍**: ENABLE BEAT 后每次心跳触发底鼓并放大视觉脉冲

### 视觉系统
- **流体网格渐变背景**: 三色渐变球漂浮 + 噪点颗粒 + 扫描线薄纱
- **微晶玻璃态容器**: `backdrop-filter: blur(22px)` + 微光描边 + 内嵌高光
- **非线性动效**: 全部 `transition: cubic-bezier(0.16, 1, 0.3, 1)`
- **HUD 故障闪烁**: 角标读数随机闪烁，品牌字符定时跳字
- **4 种氛围配色**: Neon / Acid / Ember / Void

## 技术实现

- 纯 Vanilla JS + CSS3 + HTML5，零构建依赖
- 双缓冲 Canvas：bufA 绘制基场 → bufB RGB 通道偏移 → 主画布 datamosh 切片位移 + 扫描线
- BPM 心跳驱动 `beatPulse` 指数衰减，注入色差位移与节点光晕
- Web Audio API 合成心跳底鼓（仅在用户启用后）
- `requestAnimationFrame` 主循环 + DPR 自适应
- 支持鼠标 / 触摸拖拽与 `prefers-reduced-motion`

## 设计规范

- 字体: `Inter` (正文) · `Outfit` (展示) · `Share Tech Mono` (HUD)
- 动效曲线: `cubic-bezier(0.16, 1, 0.3, 1)` / `cubic-bezier(0.34, 1.56, 0.64, 1)` (弹性)
- 默认色: Magenta `#ff2d75` · Cyan `#00f0ff` · Amber `#ffe14d` · Violet `#a855f7`

## 使用方式

1. 直接打开 `index.html`
2. 拖拽画布上的彩色节点调整故障场位置
3. 在右侧 NODE INSPECTER 选择节点并调节四项参数
4. 在 MIXER CONSOLE 调节 BPM / Amplitude / Noise 与配色
5. 点击底部波形亮点或 RUPTURE 按钮触发故障爆发
6. （可选）点击 ENABLE BEAT 开启声波心跳

---

**Maintainer**: EDEN

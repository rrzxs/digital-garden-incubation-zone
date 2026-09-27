# Vault Ledger · 金库账本

沉浸式个人金库账本。每一笔流入流出，皆有回响。

## 特性

- **流体渐变背景** — 四团超大模糊渐变球体以 `mix-blend-mode: screen` 缓慢漂移，叠加颗粒噪点与粒子流场
- **微晶玻璃态容器** — 余额圣殿 / 控制台 / 弹窗均采用 `backdrop-filter: blur()` + 发光描边
- **非线性动效** — 全站统一 `cubic-bezier(0.16, 1, 0.3, 1)` 缓动契约，交互按钮使用弹簧曲线 `cubic-bezier(0.34, 1.56, 0.64, 1)`

## 高阶微交互清单

| 模块 | 交互 |
| --- | --- |
| 标题 | 乱码字符揭示 (Scramble Reveal) |
| 余额 | easeOutExpo 数字滚动 + 涨跌闪色脉冲 |
| 账目卡片 | 错峰级联入场、悬停流光扫过、侧缘能量条、3D 倾斜余额卡 |
| 按钮 | 磁力吸引、光泽扫过、按压回弹 |
| 全局 | 点击涟漪冲击波 |
| 主题 | 4 种氛围配色（极光 / 熔金 / 深渊 / 幽兰），粒子色随主题实时迁移 |
| 数据 | localStorage 持久化、类别筛选、掷骰随机记账 |

## 技术

- 纯 Vanilla JS + CSS3 + HTML5，零构建、零依赖
- 字体：Inter / Outfit / Share Tech Mono (Google Fonts CDN)
- 维护者：EDEN

## 运行

直接用浏览器打开 `index.html`，或通过数字花园主页 `/seed/seeds/vault-ledger/` 访问。

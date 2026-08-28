# Retro Boot Terminal · 复古开机终端

沉浸式复古开机终端体验。BIOS 自检序列 + CRT 扫描线 + 微晶玻璃态终端容器 + 可交互 Shell。

## 特性

- **开机序列**：BIOS POST 脚本逐行打印、内存检测数字滚动、ASCII Logo、随机信号故障彩蛋、进度条四阶段推进
- **CRT 视觉**：扫描线、滚动亮带、暗角、电子束坍缩关机动画（可一键关闭 CRT 效果）
- **交互 Shell**：13 条内置指令（`help` / `neofetch` / `matrix` / `garden` / `theme` …），命令历史 ↑↓、Tab 补全、Ctrl+L 清屏
- **4 种磷光配色**：Phosphor 磷光绿 / Amber 琥珀 / Ice 冰蓝 / Magenta 品红，实时切换流体背景与终端辉光
- **Web Audio 音效**：击键、回车、蜂鸣、故障撕裂与开机电源音全部由振荡器实时合成
- **材质**：流体渐变背景（三 orb 漂移 + screen 混合）+ 微晶玻璃态容器（backdrop-blur + 发光描边）
- **动效**：统一 `cubic-bezier(0.16, 1, 0.3, 1)` 非线性曲线

## 技术

Vanilla JS + CSS3 + HTML5，零构建、零依赖，仅引用 Google Fonts（Inter / Outfit / Share Tech Mono）。

## 使用

直接用浏览器打开 `index.html`，等待开机序列完成后输入 `help`。`reboot` 可随时重看开机动画。

---
maintainer: EDEN

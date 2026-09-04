# Boot Sequence Forge · 开机序列锻造炉

沉浸式开机序列锻造场。在左侧「序列图纸」中自定义开机步骤、状态徽章与停留节奏，右侧 CRT 舞台实时锻造你的开机仪式——电子束开机动画、逐字打字机、`[ OK ] / [ FAIL ]` 弹性徽章、故障闪烁与 Web Audio 合成蜂鸣。

## 特性

- **4 套预设图纸**：BIOS POST / Linux DMESG / CYBERDECK 机魂 / SPACECRAFT 星舰
- **序列编辑器**：增删步骤、拖拽重排、内联文本编辑、5 种状态徽章（OK / FAIL / WARN / .. / SKIP）、逐步骤停留毫秒
- **CRT 锻造舞台**：电子束开机动画、扫描线、闪烁与暗角、进度条与 UPTIME 遥测
- **高阶微交互**：打字机逐字输出、偶发故障色差抖动、徽章弹簧弹出、READY 点火闪光
- **Web Audio 音效**：POST 蜂鸣、击键微响、FAIL 双音警报、READY 三音琶音（可开关）
- **4 种磷光配色**：Phosphor / Amber / Ice / Magenta
- **速度调节**（0.4× ~ 3×）与 **配置导出**（一键复制 JSON）
- 快捷键：`Ctrl/Cmd + Enter` 点火锻造；READY 后按 `Enter` 完成启动

## 技术栈

Vanilla JS + CSS3 + HTML5，零构建、零依赖。流体渐变背景（`blur` + `mix-blend-mode: screen`）、微晶玻璃态容器（`backdrop-filter`）、非线性动效统一使用 `cubic-bezier(0.16, 1, 0.3, 1)`。字体：Inter / Outfit / Share Tech Mono。

## 使用

直接用浏览器打开 `index.html`，或通过数字花园主页的种子卡片进入。

---

Maintainer: EDEN 🤖 · 数字花园种子区

# Suspicion Terminal · 猜疑终端

沉浸式黑色侦探诘问终端。你是一名侦探，通过终端指令审讯三名嫌疑人、调阅证物、出示矛盾证据，当嫌疑值突破临界点，嫌疑人会"供述破裂"（CRACKED），最终指控真凶结案。

## 玩法

- `case` — 调阅案件简报（EDEN-7 原型机失窃案）
- `interrogate <marlow/vesper/kaine>` — 开始审讯
- `ask <人名> <话题>` — 追问不在场证明 / 监控 / 门禁等话题
- `evidence [E1~E5]` — 调阅证物档案
- `press <人名> <证物ID>` — **核心操作**：出示证物戳破谎言，提升嫌疑值
- `accuse <人名>` — 正式指控（证据不足或错误指控会消耗公信力）
- `theme <amber/phosphor/cyan/magenta>` — 切换磷光配色
- `clear` / `reboot` — 清屏 / 重新立案

嫌疑值达到 **70** 即供述破裂，揭露关键线索。公信力归零则调查中止。

## 技术特性

- **免构建**: Vanilla JS + CSS3 + HTML5，零依赖，即开即用
- **流体渐变背景**: 三层超大模糊色团 + `mix-blend-mode: screen` 呼吸漂移
- **微晶玻璃态容器**: `backdrop-filter: blur` + 发光描边容器
- **CRT 终端美学**: 扫描线、磷光文字辉光、逐字打字机输出、开机 BIOS 序列
- **非线性动效**: 全站统一 `cubic-bezier(0.16, 1, 0.3, 1)` 缓动
- **微交互**: 嫌疑光谱条非线性增长、证物卡悬浮抬升、公信力低值抖动、↑↓ 命令历史
- **字体**: Inter / Outfit / Share Tech Mono
- **粒子流场**: Canvas 主题色粒子随时间脉动漂移

## 文件

- `index.html` — 结构
- `style.css` — 流体背景 / 玻璃态 / 动效
- `main.js` — 案卷数据 / 终端引擎 / 指令解析 / 粒子

Maintainer: EDEN

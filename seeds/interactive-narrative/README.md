# Interactive Narrative | Echoes · 回声残响

一个分支式、选择驱动的交互叙事 Web App。读者在凌晨地铁月台听见一种骨缝里的低频回声，每一次抉择都会重塑世界的色温、节律，以及他们身后留下的星图。

## 核心体验

- **分支叙事图** — 9 个故事节点 + 2 个结局（Remembered / Transcended），可循环重玩
- **情绪调色板实时形变** — 五种 mood（dormant / stirring / descent / remembered / transcend）通过 CSS 变量在 1.6s 内平滑插值，渐变球、强调色、标题渐变、星图、粒子流场同步变色
- **流体网格渐变背景** — 4 组超大模糊 orb 呼吸律动 + curl-ish 噪声粒子流场 + SVG 颗粒层 + 暗角
- **微晶玻璃态容器** — `backdrop-filter: blur(26px) saturate(160%)` + 发光描边 + 高光斜面
- **非线性动效** — 全场 `cubic-bezier(0.16, 1, 0.3, 1)` 物理曲线
- **打字机标题** — 标点处自动延长停顿，营造呼吸感
- **段落级联揭示** — 正文段落依次淡入上浮
- **鼠标感应选择卡** — 卡片内 `--mx/--my` 跟随光标的径向辉光、左侧 accent 描边生长、序号徽章旋转放大
- **选择切换动画** — 选中的卡片向右滑出、其余向左淡出，世界先变色再翻页
- **路径星图** — 右侧 SVG 蛇形节点链，已访问节点高亮、当前节点发光，路径深度同步 HUD
- **顶部 / 底部 HUD** — 章节号、mood、depth、决策计数、cadence 进度条
- **键盘导航** — `1` / `2` / `3` 选择分支，`←` / `Backspace` 退回上一节点，`R` 从起点重启
- **`prefers-reduced-motion` 适配** 与响应式布局

## 技术栈

- Vanilla JS + CSS3 + HTML5
- 零构建、零依赖
- 字体: Inter, Outfit, Share Tech Mono

## 维护者

EDEN

# Link Rolodex · 链接旋转夹

沉浸式链接联系人旋转夹（Rolodex）。以中轴轮盘的隐喻管理你的书签收藏——卡片沿弧线堆叠，拨盘/键盘/拖拽甩动在夹中翻阅，双击即启程。

## 特性

- **Rolodex 轮盘布局**：卡片围绕发光中轴按弧线错层堆叠，非线性 `cubic-bezier(0.16, 1, 0.3, 1)` 动效
- **高阶微交互**
  - 拖拽甩动翻页（左甩下一张 / 右甩上一张）
  - 卡片 3D 翻转（F），背面直达链接
  - 键盘导航：`←` `→` 翻页 · `F` 翻转 · `S` 洗牌 · `/` 聚焦搜索
  - 光晕跟随光标、拨盘按压反馈、中轴旋转辉光
- **管理**：新建 / 复制 / 移除联系人卡片，标签过滤云 + 实时模糊搜索
- **持久化**：localStorage 保存链接与主题偏好
- **4 种氛围配色**：Aurora / Dusk / Mint / Mono

## 技术栈

纯 Vanilla JS + CSS3 + HTML5，零构建、零依赖。流体渐变背景（超大模糊 blob + `mix-blend-mode: screen`）+ 微晶玻璃态容器（`backdrop-filter: blur` + 发光描边）。字体：Inter / Outfit / Share Tech Mono。

## 使用

直接在浏览器打开 `index.html`，或经数字花园主页导航进入。

---
maintainer: EDEN

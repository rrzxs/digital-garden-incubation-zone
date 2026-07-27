# Contrast Checker 对比度透视

> 沉浸式 WCAG 色彩对比度检查器。流体网格渐变背景 + 微晶玻璃态容器 + 非线性动效，在色彩碰撞中寻找无障碍的黄金比例。

## 功能特性

- **WCAG 对比度计算**：基于标准 sRGB 相对亮度公式，精确计算前景/背景色对比度（支持 Alpha 通道合成）
- **四级 WCAG 徽章**：AA Normal / AA Large / AAA Normal / AAA Large 实时判定
- **多通道调谐**：RGB + Alpha 四通道滑块，配合原生颜色选择器
- **实时预览**：大标题 / 正文 / 小号文字三档预览，字号可调（8–96px）
- **灵感调色板**：12 套精心搭配的经典配色（Dracula、Nord、Solarized 等）
- **历史记录**：自动留痕最近 12 组配色，可一键恢复
- **随机配色**：智能生成高对比度配色方案
- **前景/背景交换**：一键互换
- **4 种氛围配色**：Abyss / Warm / Emerald / Rose
- **粒子流场背景**：鼠标吸引驱动的粒子连接网络

## 键盘快捷键

| 按键 | 功能 |
|------|------|
| `Ctrl/Cmd + S` | 交换前景/背景色 |
| `Ctrl/Cmd + R` | 随机配色 |
| `T` | 切换氛围配色 |

## 技术栈

- Vanilla JS + CSS3 + HTML5（免构建）
- Inter / Outfit / Share Tech Mono 字体
- 动效曲线：`cubic-bezier(0.16, 1, 0.3, 1)`
- 流体网格渐变 + 微晶玻璃态（Glassmorphism）

## 维护者

EDEN

# Motion Card Flip 韵动翻转

高阶微交互卡片翻转体验场。点击卡片触发基于弹簧-阻尼物理模型的非线性 3D 翻转，翻转瞬间迸发粒子脉冲冲击波，鼠标在卡片上产生视差倾斜。

## 核心交互

- **弹簧翻转**: 每张卡片拥有独立的弹簧刚度与阻尼系数，翻转角度由 `F = −kx − cv` 实时积分驱动，回弹带有自然的过冲与衰减
- **三轴翻转**: 纵向 (Y) / 横向 (X) / 对角折叠 (D) 三种翻转轴，对角轴模拟晶面折叠
- **视差倾斜**: 鼠标悬停时卡片实时 3D 倾斜跟随，独立的弹簧归位物理
- **粒子流场**: 70 个粒子在 Simplex 噪声流场中流动，受鼠标引力扰动，带拖尾轨迹与连线
- **脉冲冲击波**: 翻转瞬间在卡片中心迸发 18 颗粒子径向扩散，带辉光衰减
- **4 种配色**: 黑曜石 / 极光 / 余烬 / 霜降

## 技术实现

- 纯 Vanilla JS + Canvas 2D 渲染，免构建零依赖
- 弹簧-阻尼物理积分器 (`spring-damper`)，`requestAnimationFrame` 驱动 60fps
- CSS `backdrop-filter` 微晶玻璃态双面卡片
- `transform-style: preserve-3d` + `backface-visibility` 实现 3D 翻转
- 流体网格渐变背景（`filter: blur(130px)` + `mix-blend-mode: screen`）
- `cubic-bezier(0.16, 1, 0.3, 1)` 非线性缓动曲线
- 全响应式布局，支持移动端触控与 `prefers-reduced-motion`

## 字体

- **Outfit** — 标题与卡片标签
- **Inter** — 正文
- **Share Tech Mono** — 物理公式与数值

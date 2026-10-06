# Motion Mood Arena · 动效情绪竞技场

> maintainer: EDEN

一个以「情绪 = 运动行为」为核心的高阶微交互竞技场。6 种情绪预设（静泊 / 欢腾 / 聚敛 / 混沌 / 沉降 / 电弧）驱动粒子群体的速度、抖动、环绕、重力与连线密度，切换情绪时所有行为参数以呼吸式缓动插值过渡，粒子军团随之“变阵”。

## 交互

- **Click**：释放冲击波，推开附近粒子
- **Drag / Hold**：形成引力井，吸附全场粒子
- **Hover**：粒子轻微避让，产生“让路”感
- **1–6**：切换情绪预设
- **Space**：全场中心脉冲（带屏幕亮度闪动）
- **R**：驱散重组
- **ENERGY / UNITS 滑杆**：实时调节能量与粒子数量

## 技术

- 免构建：Vanilla JS + Canvas 2D + CSS3
- 流体渐变背景：超大模糊 blob + `mix-blend-mode: screen` + 呼吸漂移动画
- 微晶玻璃态：`backdrop-filter: blur()` + 发光描边
- 统一非线性曲线：`cubic-bezier(0.16, 1, 0.3, 1)`
- 字体：Inter / Outfit / Share Tech Mono
